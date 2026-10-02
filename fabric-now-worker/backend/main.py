"""Fabric Now API. Run: uvicorn main:app --host 0.0.0.0 --port 8000"""
import asyncio, io, json, logging, os, shutil, threading, time, uuid, zipfile
from concurrent.futures import ThreadPoolExecutor

import anthropic
import openai
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageOps

import config, garments, layout, providers, tools
from pipeline import normalize_lining
from config import JOBS

log = logging.getLogger("fabricnow")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

if not config.has_openai():
    log.warning("OPENAI_API_KEY is not set: image generation (patterns, prints, colourways, mockups) will fail until it is.")
if not providers.providers():
    log.warning("No ANTHROPIC_API_KEY or OPENAI_API_KEY: vision steps (plan, review, listing) are unavailable.")

pool = ThreadPoolExecutor(max_workers=int(os.getenv("MAX_CONCURRENT_JOBS", "3")))
lock, hits = threading.Lock(), {}

app = FastAPI(title="Fabric Now API", docs_url=None if os.getenv("ENV") == "production" else "/docs")
app.add_middleware(CORSMiddleware, allow_origins=config.ORIGINS, allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- job store helpers

def _meta(jid):
    try: return json.loads((JOBS / jid / "job.json").read_text())
    except Exception: raise HTTPException(404, "Project not found")

def _save(jid, **kw):
    """Atomic update: write a temp file, then rename, so a concurrent poll never reads a half-written job.json."""
    with lock:
        p = JOBS / jid / "job.json"
        m = json.loads(p.read_text()); m.update(kw)
        tmp = p.with_suffix(".tmp")
        tmp.write_text(json.dumps(m))
        os.replace(tmp, p)

def _valid(jid):
    try: return str(uuid.UUID(jid)) == jid
    except ValueError: return False

def _internal_auth(request: Request):
    """Only Style Backend may call this worker in production."""
    if config.INTERNAL_SECRET and request.headers.get("x-fabric-internal-secret") != config.INTERNAL_SECRET:
        raise HTTPException(401, "Worker authentication required.")

def _user_id(request: Request):
    uid = request.headers.get("x-workspace-user-id", "").strip()
    if not uid:
        raise HTTPException(401, "Workspace user required.")
    return uid

def _owned(request: Request, jid: str) -> dict:
    _internal_auth(request)
    uid = _user_id(request)
    if not _valid(jid): raise HTTPException(404, "Project not found")
    m = _meta(jid)
    if m.get("user_id") != uid: raise HTTPException(404, "Project not found")
    return m

def _purge():
    cut = time.time() - config.RETENTION_H * 3600
    for d in JOBS.iterdir():
        if d.is_dir() and d.stat().st_mtime < cut: shutil.rmtree(d, ignore_errors=True)

def _rate(user_id: str, weight: int = 1):
    """Hourly limit per workspace user. (The worker only ever sees Style Backend's IP, so IP limiting would share one bucket.)"""
    now = time.time()
    with lock:
        h = [t for t in hits.get(user_id, []) if now - t < 3600]
        if len(h) + weight > config.RATE_PER_HOUR:
            raise HTTPException(429, "Hourly generation limit reached. Try again later.")
        hits[user_id] = h + [now] * weight


# ---------------------------------------------------------------- running jobs

def _friendly(jid, e: Exception) -> str:
    if isinstance(e, (openai.RateLimitError, anthropic.RateLimitError)):
        return "The AI service is busy or out of quota. Try again shortly."
    if isinstance(e, (openai.AuthenticationError, anthropic.AuthenticationError)):
        log.error("AI provider key rejected"); return "Server is not configured correctly."
    if isinstance(e, openai.BadRequestError):
        log.warning("bad request: %s", e); return "The image service rejected this input. Try a different one."
    if isinstance(e, ValueError):
        return str(e)
    log.exception("job %s failed", jid)
    return "Something went wrong while generating. Please try again."


def _run(jid):
    d = JOBS / jid
    try:
        m = _meta(jid)
        _save(jid, status="processing", step=0)
        runner = tools.RUNNERS[m.get("kind", "pattern")]
        result = runner(d, m.get("params") or {}, lambda **kw: _save(jid, **kw))
        _save(jid, status="done", step=3, stage="Ready", **result)
    except Exception as e:  # noqa: BLE001 - every failure becomes a readable job error
        _save(jid, status="failed", error=_friendly(jid, e))


def _prep(raw: bytes) -> Image.Image:
    img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA"); bg = Image.new("RGB", img.size, "white"); bg.paste(img, mask=img.split()[-1]); img = bg
    img = img.convert("RGB"); img.thumbnail((2048, 2048))
    return img


async def _image(upload: UploadFile | None, required: bool = True):
    if upload is None or not upload.filename:
        if required: raise HTTPException(400, "Upload a JPG, PNG or WebP photo.")
        return None
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    raw = await upload.read(limit + 1)
    if len(raw) > limit:
        raise HTTPException(413, f"Photos must be smaller than {config.MAX_UPLOAD_MB} MB.")
    try:
        return _prep(raw)
    except Exception:
        raise HTTPException(400, "Upload a JPG, PNG or WebP photo.")


STAGE0 = {"pattern": "Reading the garment and fabric", "print": "Drawing the print", "colorways": "Choosing colourways",
          "fabric": "Extracting the fabric", "flats": "Reading the design", "mockup": "Setting up the shoot",
          "asoebi": "Setting up the shoot"}


def _submit(kind: str, user_id: str, params: dict, img=None, simg=None, **top) -> dict:
    jid = str(uuid.uuid4()); d = JOBS / jid; d.mkdir(parents=True)
    if img: img.save(d / "input.png", "PNG")
    if simg: simg.save(d / "swatch.png", "PNG")
    meta = dict(id=jid, kind=kind, user_id=user_id, status="queued", step=0, stage=STAGE0.get(kind, "Queued"),
                created=int(time.time()), params=params, pieces=[], plan=None, error=None, **top)
    (d / "job.json").write_text(json.dumps(meta))
    pool.submit(_run, jid)
    return meta


@app.get("/api/health")
def health():
    return {"ok": True, "auth_required": bool(config.ACCESS_TOKEN), "vision_providers": providers.providers(),
            "image_generation": config.has_openai()}


@app.get("/api/catalog")
def catalog(request: Request):
    _internal_auth(request)
    return {"garments": garments.public(), "sizes": list(layout.SIZES), "tools": sorted(tools.RUNNERS)}


# ---------------------------------------------------------------- pattern jobs (Basic Plan export)

@app.post("/api/jobs", status_code=202)
async def create_job(request: Request, file: UploadFile = File(...), swatch: UploadFile | None = File(None),
                     garment: str = Form("Auto-detect"), notes: str = Form(""), lining: str = Form("none")):
    _internal_auth(request)
    user_id = _user_id(request)
    _rate(user_id)
    img, simg = await _image(file), await _image(swatch, required=False)
    _purge()
    return _submit("pattern", user_id, dict(garment=garment[:40], notes=notes[:500], lining=normalize_lining(lining)),
                   img, simg, garment=garment[:40], notes=notes[:500], lining=normalize_lining(lining))


@app.post("/api/jobs/batch", status_code=202)
async def create_batch(request: Request, files: list[UploadFile] = File(...),
                       garment: str = Form("Auto-detect"), notes: str = Form(""), lining: str = Form("none")):
    """One pattern job per photo; each photo gets its own analysis, so each export has its own pieces."""
    _internal_auth(request)
    user_id = _user_id(request)
    if not files or len(files) > config.MAX_BATCH:
        raise HTTPException(400, f"Send between 1 and {config.MAX_BATCH} photos.")
    imgs = [await _image(f) for f in files]
    _rate(user_id, len(imgs))
    _purge()
    lv = normalize_lining(lining)
    return {"jobs": [_submit("pattern", user_id, dict(garment=garment[:40], notes=notes[:500], lining=lv), im,
                             garment=garment[:40], notes=notes[:500], lining=lv) for im in imgs]}


# ---------------------------------------------------------------- AI design tools

@app.post("/api/tools/listing")
async def tool_listing(request: Request, files: list[UploadFile] = File(...), notes: str = Form("")):
    """Store listing text from product photos. Synchronous: one vision call."""
    _internal_auth(request)
    _rate(_user_id(request))
    if not files or len(files) > 4:
        raise HTTPException(400, "Send between 1 and 4 photos.")
    raws = []
    for f in files:
        im = await _image(f)
        b = io.BytesIO(); im.save(b, "JPEG", quality=90); raws.append(b.getvalue())
    try:
        return await asyncio.to_thread(tools.write_listing, raws, notes)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, _friendly("listing", e))


@app.post("/api/tools/{kind}", status_code=202)
async def create_tool_job(request: Request, kind: str, file: UploadFile | None = File(None),
                          prompt: str = Form(""), style: str = Form(""), count: int = Form(4), palettes: str = Form(""),
                          garment: str = Form("Auto-detect"), notes: str = Form(""), model: str = Form(""),
                          scenes: str = Form(""), styles: str = Form(""), input: str = Form("garment")):
    _internal_auth(request)
    if kind not in tools.RUNNERS or kind == "pattern":
        raise HTTPException(404, "Unknown tool.")
    user_id = _user_id(request)
    img = await _image(file, required=kind in tools.NEEDS_IMAGE)
    if kind == "print" and not img and not prompt.strip():
        raise HTTPException(400, "Describe the print you want.")
    _rate(user_id, 2 if kind in ("colorways", "mockup", "asoebi", "flats") else 1)
    _purge()
    params = dict(prompt=prompt[:600], style=style[:120], count=max(1, min(count, 6)), palettes=palettes[:600],
                  garment=garment[:40], notes=notes[:500], model=model[:120], scenes=scenes[:600], styles=styles[:600],
                  input="fabric" if input == "fabric" else "garment")
    return _submit(kind, user_id, params, img, garment=garment[:40] if garment != "Auto-detect" else "")


# ---------------------------------------------------------------- job access

@app.get("/api/jobs")
def list_jobs(request: Request, ids: str = ""):
    _internal_auth(request)
    user_id = _user_id(request)
    out = []
    requested = [i for i in ids.split(",") if _valid(i)][:50] if ids else []
    if requested:
        candidates = requested
    else:
        candidates = [d.name for d in JOBS.iterdir() if d.is_dir()]
        candidates.sort(key=lambda jid: (JOBS / jid / "job.json").stat().st_mtime if (JOBS / jid / "job.json").exists() else 0, reverse=True)
        candidates = candidates[:100]
    for jid in candidates:
        try:
            meta = json.loads((JOBS / jid / "job.json").read_text())
            if meta.get("user_id") == user_id:
                meta.setdefault("kind", "pattern")
                out.append(meta)
        except Exception:
            pass
    return out


@app.get("/api/jobs/{jid}")
def get_job(request: Request, jid: str):
    return _owned(request, jid)


@app.get("/api/jobs/{jid}/files/{path:path}")
def get_file(request: Request, jid: str, path: str):
    _owned(request, jid)
    base = (JOBS / jid / "export").resolve()
    f = (base / path).resolve()
    if not f.is_relative_to(base) or not f.is_file(): raise HTTPException(404)
    return FileResponse(f, headers={"Cache-Control": "private, max-age=3600"})


@app.get("/api/jobs/{jid}/export.zip")
def export_zip(request: Request, jid: str):
    m = _owned(request, jid)
    if m["status"] != "done": raise HTTPException(409, "Project is not ready yet.")
    kind = m.get("kind", "pattern")
    root = f"fabric Now {jid[:6]}" if kind == "pattern" else f"fabric Now {kind} {jid[:6]}"
    z = JOBS / jid / "export.zip"
    if not z.exists():
        tmp = z.with_suffix(".tmp")
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in sorted((JOBS / jid / "export").rglob("*")):
                if f.is_file(): zf.write(f, f"{root}/{f.relative_to(JOBS / jid / 'export')}")
        tmp.replace(z)
    return FileResponse(z, media_type="application/zip", filename=f"{root}.zip")


@app.post("/api/jobs/{jid}/grade")
def grade(request: Request, jid: str, sizes: str = Form("S,M,L,XL"), base_size: str = Form("M"),
          base_length_cm: str = Form(""), fabric_width_cm: float = Form(150.0), seam_cm: float = Form(1.0)):
    """Size grading, seam allowance, marker layout, yardage and DXF for a finished pattern job."""
    m = _owned(request, jid)
    if m.get("kind", "pattern") != "pattern" or m["status"] != "done":
        raise HTTPException(409, "Grading needs a finished pattern job.")
    if not 60 <= fabric_width_cm <= 400 or not 0 <= seam_cm <= 5:
        raise HTTPException(400, "Fabric width must be 60-400 cm and seam allowance 0-5 cm.")
    try:
        blc = float(base_length_cm) if base_length_cm.strip() else None
        report = layout.grade_job(JOBS / jid / "export", [s.strip().upper() for s in sizes.split(",")], base_size.upper(),
                                  blc, None, fabric_width_cm, seam_cm)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(400, str(e) if isinstance(e, ValueError) else "This job has no manifest. Re-run it to enable grading.")
    (JOBS / jid / "export.zip").unlink(missing_ok=True)  # rebuild the zip so it includes /grading
    _save(jid, grading=report)
    return report


@app.delete("/api/jobs/{jid}", status_code=204)
def delete_job(request: Request, jid: str):
    _owned(request, jid)
    shutil.rmtree(JOBS / jid, ignore_errors=True)
