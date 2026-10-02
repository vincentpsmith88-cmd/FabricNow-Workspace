import os, sys, time, json, io, zipfile, tempfile
os.environ.update(DATA_DIR=tempfile.mkdtemp(), OPENAI_API_KEY="x", ANTHROPIC_API_KEY="x", FABRIC_NOW_INTERNAL_SECRET="sek",
                  RATE_LIMIT_PER_HOUR="100")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
from PIL import Image
import pipeline, providers, tools
from fastapi.testclient import TestClient

SAMPLE = os.environ.get('FABRIC_SAMPLE', './Fabric Now Basic Plan/').rstrip('/') + '/'
sheet = Image.open(SAMPLE + '00_full_transparent.png').convert('RGBA')
fabric = Image.open(SAMPLE + 'piece_05.png').convert('RGB').crop((100, 100, 260, 260))
a = np.array(fabric); top = np.concatenate([a, a[:, ::-1]], 1); tile = Image.fromarray(np.concatenate([top, top[::-1]], 0)).resize((512, 512))

PLAN = {"garment": "wrap top and skirt set", "pieces": [{"name": "Front Bodice", "cut": "Cut 2"}, {"name": "Sleeve", "cut": "Cut 2"}, {"name": "Waist Belt", "cut": "Cut 1 - long strip"}],
        "swatch": {"x": .1, "y": .1, "w": .3, "h": .3}}
calls = []
def fake_images(mode, prompt, size, quality, images=None, transparent=False, model=None, fallback=None):
    calls.append((mode, transparent, size, prompt[:50]))
    return sheet.copy() if transparent else tile.convert("RGBA")
pipeline._images_call = fake_images

def fake_vision(prompt, images, max_tokens=3000):
    if "Study this garment photo" in prompt:
        calls.append(("analyze-prompt", prompt)); return dict(PLAN), "anthropic"
    if "checking an AI-drawn pattern sheet" in prompt:
        n = 21
        names = [{"n": i, "name": ["Front Bodice", "Sleeve", "Waist Belt"][i % 3], "cut": ["Cut 2", "Cut 2", "Cut 1 - long strip"][i % 3]} for i in range(1, n + 1)]
        return {"pieces": names, "missing": [], "issues": [], "ok": True}, "anthropic"
    if "FabricNow, a marketplace" in prompt:
        return {"title": "T" * 90, "description": "d", "tags": ["A", "B"], "colours": "red, blue", "seo_title": "x"}, "anthropic"
    if "technical designer" in prompt:
        return {"name": "Wrap top", "garment_type": "top", "bom": [{"item": "Main fabric", "qty": "2 m", "note": ""}], "construction_notes": ["a"]}, "anthropic"
    if "colourways" in prompt:
        return {"colorways": [{"name": "Sunset", "colors": "ochre, orange"}, {"name": "Lagoon", "colors": "teal, white"}]}, "anthropic"
    raise AssertionError(prompt[:80])
providers.vision_json = fake_vision

import main
c = TestClient(main.app)
H = {"x-fabric-internal-secret": "sek", "x-workspace-user-id": "u1"}
H2 = {"x-fabric-internal-secret": "sek", "x-workspace-user-id": "u2"}
img = io.BytesIO(); Image.open(SAMPLE + 'LaviyeOriginal.png').convert('RGB').save(img, 'JPEG'); IMG = img.getvalue()

def wait(jid, hdr=H):
    for _ in range(100):
        j = c.get(f"/api/jobs/{jid}", headers=hdr).json()
        if j["status"] in ("done", "failed"): return j
        time.sleep(0.1)
    raise TimeoutError

# auth
assert c.get("/api/catalog").status_code == 401
cat = c.get("/api/catalog", headers=H).json(); print("catalog garments:", len(cat["garments"]), "tools:", cat["tools"])
print("health:", c.get("/api/health").json())

# 1 pattern job with the string lining value the workspace sends (was a 422 before)
for lv in ("none", "partial", "full", "true"):
    pass
r = c.post("/api/jobs", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}, data={"garment": "Kaba and slit", "lining": "partial", "notes": "n"})
print("create pattern job:", r.status_code); assert r.status_code == 202, r.text
j = wait(r.json()["id"]); print("status:", j["status"], j.get("error"), "| lining stored:", j["lining"], "| pieces:", len(j["pieces"]), "| warnings:", j["warnings"])
assert j["status"] == "done"
assert any("top half" in str(x[1]) for x in calls if x[0] == "analyze-prompt"), "lining=partial should reach the analysis prompt"
print("labels sample:", [p["label"] for p in j["pieces"][:4]])
man = c.get(f"/api/jobs/{j['id']}/files/manifest.json", headers=H).json()
print("manifest keys:", list(man)[:8], "| vision:", man["vision_provider"], "| catalog_length:", man["catalog_length_cm"])
z = zipfile.ZipFile(io.BytesIO(c.get(f"/api/jobs/{j['id']}/export.zip", headers=H).content)); names = z.namelist()
print("zip entries:", len(names), "| has Fabric Now 1.png:", any(n.endswith("Fabric Now 1.png") for n in names), "| svg_outline:", sum("svg_outline" in n for n in names))

# grading
g = c.post(f"/api/jobs/{j['id']}/grade", headers=H, data={"sizes": "S,M,XL", "fabric_width_cm": "150"})
print("grade:", g.status_code, {k: v["yardage_m"] for k, v in g.json()["sizes"].items()}, "assumed scale:", g.json()["scale"]["assumed_from_garment_type"])
names2 = zipfile.ZipFile(io.BytesIO(c.get(f"/api/jobs/{j['id']}/export.zip", headers=H).content)).namelist()
print("zip after grading has grading/:", any("/grading/" in n for n in names2))
print("bad grade (narrow):", c.post(f"/api/jobs/{j['id']}/grade", headers=H, data={"fabric_width_cm": "60", "base_length_cm": "400"}).json())

# ownership
print("other user sees job:", c.get(f"/api/jobs/{j['id']}", headers=H2).status_code, "| their list:", len(c.get("/api/jobs", headers=H2).json()))

# tools
r = c.post("/api/tools/print", headers=H, data={"prompt": "geometric indigo ankara with gold sun motifs"}); j = wait(r.json()["id"])
print("print:", j["status"], j.get("seamless"), j.get("seam_score"), j.get("files"))
r = c.post("/api/tools/colorways", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}, data={"count": "2"}); j = wait(r.json()["id"])
print("colorways:", j["status"], [x["name"] for x in j["colorways"]])
r = c.post("/api/tools/fabric", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}); j = wait(r.json()["id"]); print("fabric:", j["status"], j["files"])
r = c.post("/api/tools/flats", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}); j = wait(r.json()["id"]); print("flats:", j["status"], j["files"])
r = c.post("/api/tools/mockup", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}, data={"scenes": "studio\nbeach at sunset"}); j = wait(r.json()["id"]); print("mockup:", j["status"], [x["label"] for x in j["looks"]])
print("asoebi without styles:", wait(c.post("/api/tools/asoebi", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}).json()["id"])["error"])
print("unknown tool:", c.post("/api/tools/nope", headers=H).status_code, "| print no prompt:", c.post("/api/tools/print", headers=H).status_code)
r = c.post("/api/tools/listing", headers=H, files=[("files", ("a.jpg", IMG, "image/jpeg"))], data={"notes": "ankara"}); L = r.json()
print("listing:", r.status_code, "title len", len(L["title"]), "| colours:", L["colours"], "| tags:", L["tags"], "| review_required:", L["review_required"])

main.config.RATE_PER_HOUR = 6
# rate limit is per user
codes = [c.post("/api/jobs", headers=H2, files={"file": ("a.jpg", IMG, "image/jpeg")}).status_code for _ in range(8)]
print("user2 codes:", codes)
print("user1 still limited separately:", c.post("/api/jobs", headers=H, files={"file": ("a.jpg", IMG, "image/jpeg")}).status_code)
# batch
os.environ["X"] = "1"
main.config.RATE_PER_HOUR = 100
b = c.post("/api/jobs/batch", headers={**H, "x-workspace-user-id": "u3"}, files=[("files", ("a.jpg", IMG, "image/jpeg")), ("files", ("b.jpg", IMG, "image/jpeg"))], data={"garment": "Agbada"})
print("batch:", b.status_code, len(b.json()["jobs"]), "jobs; distinct ids:", len({x["id"] for x in b.json()["jobs"]}))
time.sleep(2)
