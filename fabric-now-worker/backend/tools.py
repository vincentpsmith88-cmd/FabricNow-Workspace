"""Job runners. Each takes (job_dir, params, progress) and writes its files to <job_dir>/export.

progress(stage=..., step=..., **extra) updates job.json so the UI can show where the job is."""
import io, json, logging, re, textwrap
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import openai
from PIL import Image

import config, garments, pipeline, providers

log = logging.getLogger("fabricnow")

STATIC_PALETTES = [
    "indigo and white", "emerald green and gold", "terracotta and cream",
    "magenta and teal", "black and gold", "sky blue and coral",
]


# ---------------------------------------------------------------- helpers

def _png(img: Image.Image, path: Path):
    img.convert("RGB" if img.mode == "RGBA" and not _has_alpha(img) else img.mode).save(path, "PNG")


def _has_alpha(img: Image.Image) -> bool:
    return img.mode == "RGBA" and np.array(img)[..., 3].min() < 250


def _bytes(img: Image.Image) -> bytes:
    b = io.BytesIO(); img.save(b, "PNG"); return b.getvalue()


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:32] or "item"


def _size_for(png: bytes) -> str:
    w, h = Image.open(io.BytesIO(png)).size
    r = w / h
    return "1536x1024" if r > 1.2 else "1024x1536" if r < 0.83 else "1024x1024"


def _lines(v, limit: int, each: int = 80) -> list[str]:
    if isinstance(v, str):
        v = re.split(r"[\n;]+|,(?![^()]*\))", v)
    return [str(x).strip()[:each] for x in (v or []) if str(x).strip()][:limit]


def seam_score(img: Image.Image) -> float:
    """How visible the wrap-around seam is relative to normal pixel-to-pixel change. ~1 = seamless, >2 = visible seam."""
    a = np.asarray(img.convert("RGB"), dtype=float)
    wrap = (np.abs(a[:, 0] - a[:, -1]).mean() + np.abs(a[0] - a[-1]).mean()) / 2
    inner = (np.abs(a[:, 1:] - a[:, :-1]).mean() + np.abs(a[1:] - a[:-1]).mean()) / 2
    return float(wrap / max(inner, 1e-6))


def _tile(img: Image.Image, n: int, max_edge: int = 1800) -> Image.Image:
    out = Image.new("RGB", (img.width * n, img.height * n))
    rgb = img.convert("RGB")
    for i in range(n):
        for j in range(n):
            out.paste(rgb, (i * img.width, j * img.height))
    out.thumbnail((max_edge, max_edge))
    return out


# ---------------------------------------------------------------- pattern sheet (the Basic Plan export)

def run_pattern(d: Path, p: dict, progress) -> dict:
    src = (d / "input.png").read_bytes()
    garment, lining, notes = p.get("garment", "Auto-detect"), pipeline.normalize_lining(p.get("lining")), p.get("notes", "")
    progress(stage="Reading the garment and fabric", step=0)
    plan = None
    try:
        plan = pipeline.analyze(src, garment, lining)
    except Exception:  # noqa: BLE001 - continue with a generic prompt rather than failing the job
        log.exception("garment analysis failed; continuing with a generic prompt")
    swatch = (d / "swatch.png").read_bytes() if (d / "swatch.png").exists() else (
        pipeline.crop_swatch(src, plan.get("swatch")) if plan else None)
    progress(stage="Drafting pattern pieces", step=1,
             plan=plan and {"garment": plan["garment"], "pieces": plan["pieces"], "provider": plan.get("provider")})

    best, feedback, attempts = None, "", 0
    for attempt in range(max(1, config.MAX_ATTEMPTS)):
        attempts += 1
        prompt = pipeline.build_prompt(plan, garment, notes, lining, bool(swatch), feedback)
        sheet = pipeline.generate_sheet([src] + ([swatch] if swatch else []), prompt)
        geo_ok, count = pipeline.check(sheet, len(plan["pieces"]) if plan else 0)
        progress(stage="Checking the sheet against the photo")
        review = pipeline.review_sheet(sheet, src, plan)
        ok = geo_ok and (review is None or review["ok"])
        sc = pipeline.score(count, review)
        if best is None or sc > best[2]:
            best = (sheet, review, sc, count)
        if ok:
            break
        bits = (review["issues"] + ([f"missing pieces: {', '.join(review['missing'])}"] if review["missing"] else [])) if review else []
        if not geo_ok:
            bits.append("pieces were cut off by the canvas edge or too few pieces were drawn")
        feedback = "; ".join(bits)
        log.info("attempt %s rejected (pieces=%s, feedback=%s)", attempt + 1, count, feedback)
        if attempt + 1 < max(1, config.MAX_ATTEMPTS):
            progress(stage="Redrawing for a cleaner layout")

    sheet, review, _sc, _count = best
    progress(stage="Cutting pieces apart", step=2)
    warnings = []
    if review:
        if review["missing"]:
            warnings.append("Pieces the review could not find on the sheet: " + ", ".join(review["missing"]))
        warnings += review["issues"]
    elif plan and providers.providers():
        warnings.append("Automatic review was unavailable, so piece names follow reading order where counts matched.")
    pieces = pipeline.export_all(
        sheet, d / "export", src, plan, review,
        meta=dict(kind="pattern", garment_requested=garment, lining=lining, attempts=attempts, warnings=warnings,
                  catalog_length_cm=garments.length_cm(garment)))
    if not pieces:
        raise ValueError("No separate pieces were detected. Try a clearer, full-length photo.")
    return dict(pieces=pieces, warnings=warnings)


# ---------------------------------------------------------------- print generator

def run_print(d: Path, p: dict, progress) -> dict:
    out = d / "export"; out.mkdir(exist_ok=True)
    brief = (p.get("prompt") or "").strip()
    if not brief:
        raise ValueError("Describe the print you want.")
    ref = (d / "input.png").read_bytes() if (d / "input.png").exists() else None
    base = (
        f"Design a seamless, perfectly tileable textile print. Brief: {brief[:500]}. "
        + (f"Style and technique: {p['style'][:120]}. " if p.get("style") else "")
        + "Flat, top-down fabric swatch filling the entire square. No folds, shadows, border, text, garment or mannequin. "
          "Motifs must continue across every edge so left meets right and top meets bottom exactly, with even motif density. "
          "Print-ready colours, even lighting."
        + (" Image 1 is inspiration only: borrow its colour mood and motif language, but create an original design." if ref else ""))
    best = None
    for attempt in range(2):
        progress(stage="Drawing the print" if attempt == 0 else "Redrawing for a cleaner repeat", step=1)
        prompt = base if attempt == 0 else base + " The previous attempt had a visible seam; make the edges match exactly."
        img = (pipeline.edit_image(prompt, [ref], size=config.TILE_SIZE) if ref
               else pipeline.new_image(prompt, size=config.TILE_SIZE)).convert("RGB")
        sc = seam_score(img)
        if best is None or sc < best[1]:
            best = (img, sc)
        if sc <= 2.0:
            break
    img, sc = best
    progress(stage="Building previews", step=2)
    img.save(out / "tile.png")
    _tile(img, 2).save(out / "preview_2x2.png")
    _tile(img, 3).save(out / "preview_3x3.png")
    warnings = [] if sc <= 2.0 else ["The repeat edges may show a faint seam. Check preview_3x3.png and regenerate if it bothers you."]
    (out / "print.json").write_text(json.dumps(dict(brief=brief, style=p.get("style", ""), seam_score=round(sc, 2),
                                                    seamless=sc <= 2.0, size=list(img.size)), indent=1))
    return dict(seam_score=round(sc, 2), seamless=sc <= 2.0, warnings=warnings,
                files=["tile.png", "preview_2x2.png", "preview_3x3.png", "print.json"])


# ---------------------------------------------------------------- colourways

def _palettes(src: bytes, n: int, wanted: list[str]) -> list[dict]:
    if wanted:
        return [dict(name=w[:40], colors=w) for w in wanted[:n]]
    try:
        d, _ = providers.vision_json(
            f"Study this textile print. Suggest {n} distinct, wearable colourways for it that suit African fashion markets. "
            'Return ONLY JSON: {"colorways": [{"name": "Sunset Ochre", "colors": "deep ochre, burnt orange, cream, charcoal outlines"}]}', [src])
        out = [dict(name=str(c.get("name", ""))[:40] or f"Colourway {i + 1}", colors=str(c.get("colors", ""))[:160])
               for i, c in enumerate(d.get("colorways", [])) if isinstance(c, dict) and c.get("colors")]
        if out:
            return out[:n]
    except Exception as e:  # noqa: BLE001
        log.warning("palette suggestion failed: %s", e)
    return [dict(name=s.title(), colors=s) for s in STATIC_PALETTES[:n]]


def run_colorways(d: Path, p: dict, progress) -> dict:
    out = d / "export"; out.mkdir(exist_ok=True)
    src = (d / "input.png").read_bytes()
    n = max(1, min(int(p.get("count") or 4), 6))
    progress(stage="Choosing colourways", step=0)
    pals = _palettes(src, n, _lines(p.get("palettes"), n, 160))
    size = _size_for(src)
    (out / "original.png").write_bytes(src)

    def one(i_pal):
        i, pal = i_pal
        prompt = (f"Recolour this fabric/garment to the colourway '{pal['name']}': {pal['colors']}. "
                  "Keep every motif, line, shape, texture, scale, framing and background identical. Change only the colours. "
                  "Do not add or remove anything.")
        img = pipeline.edit_image(prompt, [src], size=size).convert("RGB")
        f = f"colorway_{i:02d}_{_slug(pal['name'])}.png"
        img.save(out / f)
        return dict(name=pal["name"], colors=pal["colors"], file=f)

    progress(stage=f"Recolouring ({n} versions)", step=1)
    with ThreadPoolExecutor(max_workers=3) as ex:
        done = list(ex.map(one, enumerate(pals, 1)))
    (out / "colorways.json").write_text(json.dumps(done, indent=1))
    return dict(colorways=done, files=["original.png"] + [c["file"] for c in done])


# ---------------------------------------------------------------- fabric extraction

def run_fabric(d: Path, p: dict, progress) -> dict:
    out = d / "export"; out.mkdir(exist_ok=True)
    src = (d / "input.png").read_bytes()
    progress(stage="Extracting the fabric", step=1)
    prompt = ("Extract only the fabric print from the garment in this photo and show it as a flat, front-on, evenly lit "
              "swatch that fills the whole frame. Remove folds, shadows, wrinkles, body, skin, hair and background. "
              "Reproduce the real motifs, colours and scale exactly; do not invent or simplify motifs. No text.")
    img = pipeline.edit_image(prompt, [src], size="1024x1024").convert("RGB")
    img.save(out / "fabric_swatch.png")
    _tile(img, 2).save(out / "preview_2x2.png")
    (out / "ORIGINAL PICTURE.png").write_bytes(src)
    return dict(seam_score=round(seam_score(img), 2), files=["fabric_swatch.png", "preview_2x2.png", "ORIGINAL PICTURE.png"],
                warnings=["This is an extracted swatch, not a guaranteed repeat. Use the Print generator for a seamless tile."])


# ---------------------------------------------------------------- sketch to technical flats + spec

SPEC = """You are a technical designer. Study this garment sketch or photo{hint}.
Return ONLY JSON: {{"name": "", "garment_type": "", "silhouette": "", "fabric_suggestions": [""], "construction_notes": [""], "seam_and_finish": [""], "bom": [{{"item": "Main fabric", "qty": "2.5 m at 150 cm width", "note": ""}}], "measurements_to_confirm": ["bust", "waist", "hip", "length"], "yardage_estimate_m": {{"S": 0, "M": 0, "L": 0, "XL": 0}}}}
Be conservative. Yardage is a rough estimate for 150 cm wide fabric, single size run, uncut length; say so in a bom note. Never invent brand names or prices. Describe only what the image shows or what that garment type normally needs."""


def run_flats(d: Path, p: dict, progress) -> dict:
    out = d / "export"; out.mkdir(exist_ok=True)
    src = (d / "input.png").read_bytes()
    garment = p.get("garment", "Auto-detect")
    warnings, spec = [], None
    progress(stage="Reading the design", step=0)
    try:
        spec, provider = providers.vision_json(SPEC.format(hint=pipeline._hint(garment)), [src])
        spec["provider"] = provider
    except Exception as e:  # noqa: BLE001
        log.warning("spec failed: %s", e)
        warnings.append("The written spec could not be generated; only the flat drawings were made.")
    size = _size_for(src)
    files = []
    for k, view in enumerate(("FRONT", "BACK")):
        progress(stage=f"Drawing the {view.lower()} flat", step=1 + k)
        prompt = (f"Draw a clean technical flat sketch (fashion CAD style) of the garment in image 1, {view} view. "
                  "Black line art on a pure white background, uniform line weight, dashed lines for topstitching, "
                  "no colour fill, no shading, no mannequin, no text. Keep the exact silhouette, neckline, sleeves, seams, "
                  "darts and hem. " + ("Infer the back from normal construction for this garment." if view == "BACK" else "")
                  + (f" Designer notes: {p['notes'][:300]}" if p.get("notes") else ""))
        img = pipeline.edit_image(prompt, [src], size=size).convert("RGB")
        f = f"flats_{view.lower()}.png"
        img.save(out / f); files.append(f)
    if spec:
        (out / "spec.json").write_text(json.dumps(spec, indent=1))
        md = [f"# {spec.get('name') or 'Garment spec'}", "", f"**Type:** {spec.get('garment_type', '')}  ",
              f"**Silhouette:** {spec.get('silhouette', '')}", ""]
        for title, key in [("Fabric suggestions", "fabric_suggestions"), ("Construction notes", "construction_notes"),
                           ("Seams and finishes", "seam_and_finish"), ("Measurements to confirm", "measurements_to_confirm")]:
            md += [f"## {title}"] + [f"- {x}" for x in _lines(spec.get(key), 20, 200)] + [""]
        md += ["## Bill of materials", "| Item | Qty | Note |", "|---|---|---|"]
        for b in (spec.get("bom") or [])[:20]:
            if isinstance(b, dict):
                md.append(f"| {b.get('item', '')} | {b.get('qty', '')} | {b.get('note', '')} |")
        md += ["", "## Yardage estimate (m, 150 cm fabric, rough)", json.dumps(spec.get("yardage_estimate_m", {}))]
        (out / "spec.md").write_text("\n".join(md))
        files += ["spec.json", "spec.md"]
    (out / "ORIGINAL PICTURE.png").write_bytes(src); files.append("ORIGINAL PICTURE.png")
    return dict(spec=spec, files=files, warnings=warnings)


# ---------------------------------------------------------------- mockups, lookbook, aso-ebi

MOCKUP = ("Image 1 shows {subject}. Create a realistic fashion photograph of {model} wearing this exact {what}. "
          "Scene: {scene}. Keep the fabric print, colours, cut and trims identical to image 1. Full-length framing, natural pose, "
          "soft lighting, sharp focus. Do not depict any real or famous person. No text, no logo, no watermark.")
ASOEBI = ("Image 1 is a fabric. Create a realistic fashion photograph of {model} wearing {style} sewn entirely from this exact fabric, "
          "with the print, colours and motif scale unchanged. Studio setting, full-length, soft lighting, sharp focus. "
          "Do not depict any real or famous person. No text, no logo, no watermark.")


def run_variants(d: Path, p: dict, progress, kind: str) -> dict:
    out = d / "export"; out.mkdir(exist_ok=True)
    src = (d / "input.png").read_bytes()
    model = (p.get("model") or "a fashion model")[:120]
    if kind == "asoebi":
        styles = _lines(p.get("styles"), 6, 80)
        if not styles:
            raise ValueError("List at least one style, for example: kaba and slit, agbada, peplum gown.")
        jobs = [(s, ASOEBI.format(model=model, style=s)) for s in styles]
    else:
        scenes = _lines(p.get("scenes"), 4, 120) or ["studio, front view, neutral backdrop", "outdoor, soft daylight, three-quarter view"]
        g = garments.find(p.get("garment"))
        swatch_mode = p.get("input") == "fabric"
        subject = "a fabric print swatch" if swatch_mode else "a garment"
        what = (g["label"].lower() if g else "garment") + (" made from this fabric" if swatch_mode else "")
        jobs = [(s, MOCKUP.format(subject=subject, model=model, what=what, scene=s)) for s in scenes]
    size = "1024x1536"

    def one(i_job):
        i, (label, prompt) = i_job
        img = pipeline.edit_image(prompt, [src], size=size).convert("RGB")
        f = f"{kind}_{i:02d}_{_slug(label)}.png"
        img.save(out / f)
        return dict(label=label, file=f)

    progress(stage=f"Photographing {len(jobs)} looks", step=1)
    with ThreadPoolExecutor(max_workers=3) as ex:
        done = list(ex.map(one, enumerate(jobs, 1)))
    (out / "ORIGINAL PICTURE.png").write_bytes(src)
    return dict(looks=done, files=[x["file"] for x in done] + ["ORIGINAL PICTURE.png"])


# ---------------------------------------------------------------- store listing writer (synchronous)

LISTING = """You write product listings for FabricNow, a marketplace of African fashion fabrics and ready-to-use 3D (CLO3D) garment files. Study the image(s){notes}.
Return ONLY JSON: {{"title": "", "description": "", "silhouette": "", "fabric": "", "style": "", "garment_type": "", "colours": [""], "occasions": [""], "tags": [""], "seo_title": "", "seo_description": "", "image_alt_text": "", "cultural_note": "", "confidence_notes": [""]}}
Rules:
- title: at most 60 characters, descriptive, no brand names. description: 80 to 140 words, plain and specific to what is visible (cut, print, trims, occasion).
- silhouette like "Fitted", "Oversized", "A-line". style like "Geometric, tribal-inspired". tags: 8 to 12 lowercase words or short phrases.
- seo_title at most 60 characters, seo_description at most 155, image_alt_text at most 125.
- Describe only what is visible. Do not state fibre content, sizes or prices you cannot see: put such gaps in confidence_notes.
- Name traditional garments and prints (kente, adire, ankara/wax print, agbada, kaba and slit, etc.) only when you are confident; otherwise say "African-inspired". cultural_note is one accurate sentence or empty."""


def write_listing(images: list[bytes], notes: str = "") -> dict:
    n = f" (seller notes: {notes.strip()[:300]})" if notes and notes.strip() else ""
    d, provider = providers.vision_json(LISTING.format(notes=n), images[:4], max_tokens=2000)
    cut = lambda k, m: str(d.get(k, ""))[:m].strip()
    return dict(
        title=cut("title", 60), description=cut("description", 1200), silhouette=cut("silhouette", 40),
        fabric=cut("fabric", 80), style=cut("style", 80), garment_type=cut("garment_type", 60),
        colours=_lines(d.get("colours"), 8, 30), occasions=_lines(d.get("occasions"), 6, 40),
        tags=[t.lower() for t in _lines(d.get("tags"), 12, 40)],
        seo_title=cut("seo_title", 60), seo_description=cut("seo_description", 155), image_alt_text=cut("image_alt_text", 125),
        cultural_note=cut("cultural_note", 300), confidence_notes=_lines(d.get("confidence_notes"), 6, 160),
        provider=provider, review_required=True)


RUNNERS = {
    "pattern": run_pattern,
    "print": run_print,
    "colorways": run_colorways,
    "fabric": run_fabric,
    "flats": run_flats,
    "mockup": lambda d, p, pr: run_variants(d, p, pr, "mockup"),
    "asoebi": lambda d, p, pr: run_variants(d, p, pr, "asoebi"),
}
# kinds that need an uploaded image vs those that can start from text alone
NEEDS_IMAGE = {"pattern", "colorways", "fabric", "flats", "mockup", "asoebi"}
