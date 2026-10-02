"""Fabric Now pipeline: photo -> vision plan -> OpenAI pattern sheet -> review -> split pieces -> export files.

Vision steps (plan, review) use Claude or OpenAI via providers.py. The sheet itself is drawn by OpenAI's
image model, because the Claude API does not generate images."""
import base64, io, json, logging, re
from pathlib import Path

import cv2
import numpy as np
import openai
from PIL import Image

import config, garments, providers

log = logging.getLogger("fabricnow")

# ---------------------------------------------------------------- lining

def normalize_lining(v) -> str:
    """The workspace sends none|partial|full; older callers send true/false."""
    s = str(v if v is not None else "none").strip().lower()
    if s in ("full", "true", "1", "yes", "on"):
        return "full"
    if s in ("partial", "half"):
        return "partial"
    return "none"


_LINING_PLAN = {
    "none": "- Do not list lining pieces.\n",
    "partial": "- Include lining only for the top half (bodice or chest area), named like \"Lining Front Bodice\".\n",
    "full": "- Include lining pieces for every main body piece, each named like \"Lining Front Bodice\".\n",
}

# ---------------------------------------------------------------- prompts

ANALYZE = """You are a senior pattern cutter. Study this garment photo{hint}.
Return ONLY JSON: {{"garment": "<one-line description>", "pieces": [{{"name": "Front Bodice", "cut": "Cut 2"}}], "swatch": {{"x": 0.0, "y": 0.0, "w": 0.2, "h": 0.2}}}}
Rules:
- List EVERY separate fabric piece needed to sew this exact garment, including easily missed ones: belts or ties, pockets, cuffs, plackets, collars, waistbands, belt loops, facings, hem facing. Judge the real construction you can see (a wrap dress has wrap fronts and ties; a gathered skirt is wide panels).
- Mirrored pairs: one entry with "Cut 2". Centre or back pieces on the fold: "Cut 1 on fold". Left and right that differ: two entries, each "Cut 1". Long straight strips: "Cut 1 - long strip".
- Names are plain English, at most 3 words. List 8 to 24 pieces.
{lining}- swatch is a normalised box (x,y = top-left) around a flat, in-focus, well-lit area at least 15% of the image wide that shows ONLY the fabric print: no skin, hair, background or hands."""

PROMPT = """You are a professional pattern drafter and textile designer. Image 1 is the garment photo{garment}.
{swatch}Draw ONE flat 2D technical sheet containing exactly these sewing pattern pieces, one shape per line, no extras:
{pieces}
Layout rules:
- Arrange in a tidy grid. Leave clear transparent space between every piece so none touch or overlap.
- Use the whole canvas but keep a 4% empty margin on every edge. Every label must be fully visible and never cut off.
- Pieces are flat, upright, straight-on, never rotated. Draw realistic pattern shapes: gathered skirts as wide panels, belts and ties as long strips, pockets as pocket shapes.
Print rules:
- Fill every piece with the garment's real fabric print and colours. Keep motif scale and line weight identical across all pieces. Do not simplify, redraw or stylise the motifs.
- Never fill a piece with solid black{lining}.
Text rules:
- Under each piece write its label in plain black text, spelled EXACTLY as given in the list above, nothing else.
- Transparent background. No mannequin, body, shadows or seam marks.{notes}"""

REVIEW = """You are a senior pattern cutter checking an AI-drawn pattern sheet.
Image 1 is the original garment photo. Image 2 is the drawn sheet; every detected shape carries a red numbered tag.
The planned pieces are:
{plan}
Return ONLY JSON: {{"pieces": [{{"n": 1, "name": "Front Bodice", "cut": "Cut 2"}}], "missing": ["Waist Belt"], "issues": ["short problem"], "ok": true}}
Rules:
- Give EVERY numbered tag exactly one entry. "name" must be copied from the planned list (mirrored pairs share one name). If a tag is only a stray fragment or label lettering, use an empty name.
- "missing": planned pieces that have no shape on the sheet at all.
- "issues": plain problems only (solid black fill, print does not match the photo, a shape that is not a believable pattern piece, shapes touching, cut-off label). Empty list if none.
- "ok" is false only when a major piece is missing, a piece is filled solid black, or the print clearly does not match the photo."""


def _hint(garment: str) -> str:
    g = garments.find(garment)
    if g:
        return f" (it is {g['hint']})"
    return f" (it is a {garment.lower()})" if garment and garment != "Auto-detect" else ""


def build_prompt(plan, garment: str, notes: str, lining, has_swatch: bool, feedback: str = "") -> str:
    lining = normalize_lining(lining)
    g = f" ({plan['garment']})" if plan and plan.get("garment") else (
        f" ({_hint(garment).strip(' ()')})" if _hint(garment) else "")
    if plan:
        pieces = "\n".join(f'{i}. "{p["name"]} ({p["cut"]})"' for i, p in enumerate(plan["pieces"], 1))
    else:
        pieces = "Every piece needed to construct the garment (bodice, sleeves, skirt, belts, pockets, facings, etc.), each labelled like \"Sleeve (Cut 2)\"."
    s = ("Image 2 is a close-up of the exact fabric. Reproduce THIS print faithfully: same motifs, colours and scale.\n"
         if has_swatch else "")
    n = f"\nExtra instructions from the designer: {notes.strip()[:500]}" if notes and notes.strip() else ""
    if feedback:
        n += f"\nA previous attempt had these problems, so fix them: {feedback[:600]}"
    return PROMPT.format(garment=g, swatch=s, pieces=pieces, notes=n,
                         lining=", except pieces explicitly listed as lining" if lining != "none" else "")


# ---------------------------------------------------------------- vision steps

def analyze(original_png: bytes, garment: str, lining):
    """Vision pass: decide the exact piece list and where a clean fabric swatch is."""
    text = ANALYZE.format(hint=_hint(garment), lining=_LINING_PLAN[normalize_lining(lining)])
    d, provider = providers.vision_json(text, [original_png])
    pieces = [{"name": str(p["name"])[:40], "cut": str(p.get("cut", "Cut 1"))[:30]}
              for p in d.get("pieces", []) if isinstance(p, dict) and p.get("name")][:24]
    if not pieces:
        raise ValueError("empty plan")
    return {"garment": str(d.get("garment", ""))[:120], "pieces": pieces, "swatch": d.get("swatch"),
            "provider": provider}


def crop_swatch(original_png: bytes, box):
    try:
        im = Image.open(io.BytesIO(original_png)).convert("RGB"); W, H = im.size
        x, y, w, h = [float(box[k]) for k in "xywh"]
        x0, y0, x1, y1 = int(max(x, 0) * W), int(max(y, 0) * H), int(min(x + w, 1) * W), int(min(y + h, 1) * H)
    except (TypeError, KeyError, ValueError):
        return None
    if x1 - x0 < 96 or y1 - y0 < 96:
        return None
    b = io.BytesIO(); im.crop((x0, y0, x1, y1)).save(b, "PNG"); return b.getvalue()


def parse_cut(cut: str) -> dict:
    """'Cut 2' -> count 2; 'Cut 1 on fold' -> fold; 'Cut 1 - long strip' -> strip."""
    c = (cut or "").lower()
    m = re.search(r"cut\s*(\d+)", c)
    return {"count": int(m.group(1)) if m else 1, "fold": "fold" in c, "strip": "strip" in c}


# ---------------------------------------------------------------- image models

def _alpha_ok(model: str) -> bool:
    """Only the gpt-image-1 family can return a transparent PNG. Newer models get a white page that we key out."""
    return model.startswith("gpt-image-1")


def _images_call(mode: str, prompt: str, size: str, quality: str, images=None, transparent=False,
                 model=None, fallback=None) -> Image.Image:
    """mode 'edit' (uses reference images) or 'generate' (prompt only). Retries on a fallback model."""
    client = config.openai_client()
    model = model or config.IMAGE_MODEL
    fallback = fallback if fallback is not None else config.FALLBACK_IMAGE_MODEL

    def call(m):
        kw = dict(model=m, prompt=prompt, size=size, quality=quality, n=1)
        if transparent and _alpha_ok(m):
            kw.update(background="transparent", output_format="png")
        elif transparent:  # no input_fidelity either: newer models always edit at high fidelity
            kw["prompt"] = prompt.replace("Transparent background.", "Plain pure white background (#FFFFFF), no texture, gradient or shadow.")
        if mode == "edit":
            kw["image"] = [(f"image{i}.png", b, "image/png") for i, b in enumerate(images, 1)]
            return client.images.edit(**kw)
        return client.images.generate(**kw)

    try:
        res = call(model)
    except (openai.NotFoundError, openai.PermissionDeniedError):
        if not fallback or fallback == model:
            raise
        log.warning("image model %s unavailable for this key; falling back to %s", model, fallback)
        res = call(fallback)
    return Image.open(io.BytesIO(base64.b64decode(res.data[0].b64_json))).convert("RGBA")


def edit_image(prompt, images, size=None, quality=None) -> Image.Image:
    return _images_call("edit", prompt, size or config.IMAGE_SIZE, quality or config.IMAGE_QUALITY, images=images)


def new_image(prompt, size=None, quality=None) -> Image.Image:
    return _images_call("generate", prompt, size or config.IMAGE_SIZE, quality or config.IMAGE_QUALITY)


def generate_sheet(images: list, prompt: str) -> Image.Image:
    img = _images_call("edit", prompt, config.IMAGE_SIZE, config.IMAGE_QUALITY, images=images, transparent=True)
    return ensure_transparent(img)


# ---------------------------------------------------------------- geometry

def check(sheet: Image.Image, planned: int):
    """Quality gate: content clipped by the canvas edge, or far fewer pieces than planned."""
    a = np.array(sheet)[..., 3] > 24
    clipped = bool(a[:3].any() or a[-3:].any() or a[:, :3].any() or a[:, -3:].any())
    H, W = a.shape
    _, _, st, _ = cv2.connectedComponentsWithStats(a.astype(np.uint8), connectivity=8)
    count = int((st[1:, 4] >= max(500, int(0.0005 * H * W))).sum())
    return (not clipped and (planned == 0 or count >= 0.75 * planned)), count


def ensure_transparent(img: Image.Image) -> Image.Image:
    """If the model returned an opaque white page, key the outer white away."""
    a = np.array(img)
    if a[..., 3].min() < 250:
        return img
    white = (a[..., :3].min(axis=2) >= 238).astype(np.uint8)
    n, lab = cv2.connectedComponents(white, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    a[np.isin(lab, list(border)), 3] = 0
    return Image.fromarray(a)


def _png(arr) -> bytes:
    b = io.BytesIO(); Image.fromarray(arr).save(b, "PNG", optimize=True); return b.getvalue()


def _reading_order(items, height):
    items.sort(key=lambda p: p["cy"])
    rows = []
    for p in items:
        if rows and abs(p["cy"] - np.mean([q["cy"] for q in rows[-1]])) < height * 0.15:
            rows[-1].append(p)
        else:
            rows.append([p])
    return [p for r in rows for p in sorted(r, key=lambda p: p["cx"])]


def detect_components(sheet: Image.Image):
    """Trim the sheet and find each separate shape. Returns (arr, items, lab, stats) or None if empty."""
    arr = np.array(sheet)
    ys, xs = np.where(arr[..., 3] > 24)
    if len(xs) == 0:
        return None
    arr = arr[max(ys.min() - 8, 0):ys.max() + 9, max(xs.min() - 8, 0):xs.max() + 9]  # trim margins
    H, W = arr.shape[:2]
    mask = (arr[..., 3] > 24).astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mask, connectivity=8)
    min_area = max(500, int(0.0005 * H * W))  # drops label lettering, keeps small facings
    items = [dict(i=i, cx=cent[i][0], cy=cent[i][1]) for i in range(1, n) if stats[i, 4] >= min_area]
    return arr, _reading_order(items, H), lab, stats


def _flat(arr) -> Image.Image:
    H, W = arr.shape[:2]
    flat = Image.new("RGBA", (W, H), "white"); flat.alpha_composite(Image.fromarray(arr))
    return flat.convert("RGB")


def numbered_overlay(arr, items, stats) -> bytes:
    """The sheet on white with a red numbered tag on every detected shape, for the review step."""
    img = np.array(_flat(arr))
    H = img.shape[0]
    scale = max(0.8, H / 900)
    for k, p in enumerate(items, 1):
        x, y, w, h, _ = stats[p["i"]]
        txt = str(k)
        (tw, th), _b = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, scale, 2)
        x0, y0 = int(x), int(y)
        cv2.rectangle(img, (x0, y0), (x0 + tw + 10, y0 + th + 10), (220, 30, 30), -1)
        cv2.putText(img, txt, (x0 + 5, y0 + th + 4), cv2.FONT_HERSHEY_SIMPLEX, scale, (255, 255, 255), 2, cv2.LINE_AA)
    b = io.BytesIO(); Image.fromarray(img).save(b, "PNG"); return b.getvalue()


def review_sheet(sheet: Image.Image, original_png: bytes, plan):
    """Claude/OpenAI looks at the drawn sheet: names every shape, lists missing pieces and defects.
    Returns None when there is nothing to review or no vision key is configured."""
    if not plan or not config.REVIEW_ENABLED or not providers.providers():
        return None
    found = detect_components(sheet)
    if not found:
        return None
    arr, items, _lab, stats = found
    listing = "\n".join(f'- "{p["name"]}" ({p["cut"]})' for p in plan["pieces"])
    try:
        d, provider = providers.vision_json(REVIEW.format(plan=listing), [original_png, numbered_overlay(arr, items, stats)])
    except Exception as e:  # noqa: BLE001 - review is advisory; never fail the job because of it
        log.warning("sheet review failed: %s", e)
        return None
    allowed = {p["name"].lower(): p for p in plan["pieces"]}
    names = {}
    for e in d.get("pieces", []):
        try:
            n = int(e.get("n"))
        except (TypeError, ValueError, AttributeError):
            continue
        if not 1 <= n <= len(items):
            continue
        nm = str(e.get("name") or "").strip()
        base = allowed.get(nm.lower())
        names[n] = {"name": (base["name"] if base else nm[:40]),
                    "cut": (base["cut"] if base else str(e.get("cut") or "")[:30])}
    return {"names": names,
            "missing": [str(m)[:40] for m in d.get("missing", []) if m][:12],
            "issues": [str(i)[:140] for i in d.get("issues", []) if i][:8],
            "ok": bool(d.get("ok", True)), "provider": provider, "shapes": len(items)}


def score(count: int, review) -> int:
    """Higher is better. Used to keep the best attempt when none passes."""
    if not review:
        return count
    return count * 3 - len(review["missing"]) * 4 - len(review["issues"]) - (0 if review["ok"] else 10)


# ---------------------------------------------------------------- export

def _path(c) -> str:
    pts = c.reshape(-1, 2)
    return "M " + " L ".join(f"{int(a)},{int(b)}" for a, b in pts) + " Z"


def export_all(sheet: Image.Image, out: Path, original_png: bytes, plan=None, review=None, meta=None) -> list[dict]:
    """Writes the same folder layout as the Fabric Now example export, plus manifest.json."""
    (out / "svg_outline").mkdir(parents=True, exist_ok=True)
    (out / "svg_full_print").mkdir(parents=True, exist_ok=True)
    (out / "ORIGINAL PICTURE.png").write_bytes(original_png)

    found = detect_components(sheet)
    if not found:
        return []
    arr, items, lab, stats = found
    H, W = arr.shape[:2]
    (out / "00_full_transparent.png").write_bytes(_png(arr))
    _flat(arr).save(out / "Fabric Now 1.png")  # labelled sheet on white, same name as the manual export

    names = (review or {}).get("names", {})
    if not names and plan and len(plan["pieces"]) == len(items):  # no review: fall back to reading order
        names = {k: plan["pieces"][k - 1] for k in range(1, len(items) + 1)}

    pieces, manifest_pieces = [], []
    for k, p in enumerate(items, 1):
        x, y, w, h, area = stats[p["i"]]
        x0, y0, x1, y1 = max(x - 8, 0), max(y - 8, 0), min(x + w + 8, W), min(y + h + 8, H)  # 8px padding = sample export
        m = (lab[y0:y1, x0:x1] == p["i"]).astype(np.uint8)
        crop = arr[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(cv2.dilate(m, np.ones((3, 3), np.uint8)) > 0, crop[..., 3], 0)
        cw, ch = x1 - x0, y1 - y0

        cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        outer_i = max((i for i in range(len(cnts)) if hier[0][i][3] == -1), key=lambda i: cv2.contourArea(cnts[i]))
        outer = cv2.approxPolyDP(cnts[outer_i], 1.2, True)
        holes = [cv2.approxPolyDP(cnts[i], 1.2, True) for i in range(len(cnts))
                 if hier[0][i][3] == outer_i and cv2.contourArea(cnts[i]) >= 30]
        d = " ".join([_path(outer)] + [_path(hc) for hc in holes])

        stem = f"piece_{k:02d}"
        png = _png(crop)
        (out / f"{stem}.png").write_bytes(png)
        hdr = f'<svg xmlns="http://www.w3.org/2000/svg" width="{cw}" height="{ch}" viewBox="0 0 {cw} {ch}">'
        (out / "svg_outline" / f"{stem}_outline.svg").write_text(
            f'{hdr}\n<path d="{d} " fill="none" stroke="black" stroke-width="2" fill-rule="evenodd"/>\n</svg>')
        (out / "svg_full_print" / f"{stem}.svg").write_text(
            f'{hdr}\n<image width="{cw}" height="{ch}" href="data:image/png;base64,'
            f'{base64.b64encode(png).decode()}"/>\n</svg>')

        nm = names.get(k) or {}
        label = nm.get("name") or f"Piece {k:02d}"
        cut = nm.get("cut") or ""
        pc = parse_cut(cut)
        pieces.append(dict(name=stem, label=label, cut=cut, w=int(cw), h=int(ch)))
        manifest_pieces.append(dict(
            file=f"{stem}.png", svg_outline=f"svg_outline/{stem}_outline.svg", svg_full_print=f"svg_full_print/{stem}.svg",
            label=label, cut=cut, cut_count=pc["count"], on_fold=pc["fold"], long_strip=pc["strip"],
            w=int(cw), h=int(ch), area_px=int(area), bbox_in_sheet=[int(x0), int(y0), int(cw), int(ch)],
            named=bool(nm.get("name")),
            polygon=[[int(a), int(b)] for a, b in outer.reshape(-1, 2)],
            holes=[[[int(a), int(b)] for a, b in hc.reshape(-1, 2)] for hc in holes]))

    manifest = dict(
        generator="Fabric Now worker", sheet=dict(w=int(W), h=int(H)),
        garment=(plan or {}).get("garment", ""), plan=(plan or {}).get("pieces", []),
        vision_provider=(plan or {}).get("provider") or (review or {}).get("provider"),
        review=dict(ok=review["ok"], missing=review["missing"], issues=review["issues"]) if review else None,
        pieces=manifest_pieces, **(meta or {}))
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    return pieces
