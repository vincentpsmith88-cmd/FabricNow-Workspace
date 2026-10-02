"""Size grading, seam allowance, marker layout, yardage and DXF export from a finished pattern job.

IMPORTANT: the pieces are AI-drawn raster shapes, not drafted blocks. Grading here is a proportional
scale (wider than longer), not a measured size chart, and the real-world scale comes from one length the
user confirms. Treat the output as a CLO3D/cutting starting point, not a production-graded pattern."""
import json, math
from pathlib import Path

import cv2
import numpy as np

# width factor vs the base size; length grows by a third as fast as width
SIZES = {"XS": 0.90, "S": 0.95, "M": 1.00, "L": 1.06, "XL": 1.12, "2XL": 1.18, "3XL": 1.24}
LENGTH_RATIO = 0.35
GAP_CM = 1.0
WASTE = 1.05  # 5% allowance for shrinkage/cutting


def _poly_cm(piece, px_per_cm):
    return np.array(piece["polygon"], dtype=float) / px_per_cm


def _grade(poly, f):
    out = poly.copy()
    out[:, 0] *= f
    out[:, 1] *= 1 + (f - 1) * LENGTH_RATIO
    return out


def _offset(poly, d_cm):
    """Grow a polygon outward by d_cm (seam allowance). Raster offset at 10 px/cm, then re-trace."""
    if d_cm <= 0:
        return poly
    res = 10.0
    pad = d_cm + 1
    mn = poly.min(axis=0) - pad
    pts = ((poly - mn) * res).astype(np.int32)
    size = ((poly.max(axis=0) - mn + pad) * res).astype(int)
    img = np.zeros((size[1] + 2, size[0] + 2), np.uint8)
    cv2.fillPoly(img, [pts], 255)
    r = max(1, int(round(d_cm * res)))
    img = cv2.dilate(img, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    cnts, _ = cv2.findContours(img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = cv2.approxPolyDP(max(cnts, key=cv2.contourArea), 0.6, True).reshape(-1, 2).astype(float)
    return c / res + mn


def _bbox(poly):
    mn, mx = poly.min(axis=0), poly.max(axis=0)
    return mn, mx - mn


def _pack(items, width, gap=GAP_CM):
    """Shelf packing, one layer. Rotates a piece 90 degrees only if it is wider than the fabric.
    Each item's optional 'sew' (stitch line) goes through the same move/rotation as its cut line."""
    placed, x, y, row_h = [], 0.0, 0.0, 0.0
    for it in sorted(items, key=lambda i: -i["size"][1]):
        poly, sew, w, h = it["poly"], it.get("sew"), it["size"][0], it["size"][1]
        rot = False
        if w > width and h <= width:
            rotate = lambda a: np.column_stack([a[:, 1], -a[:, 0]])
            poly, sew = rotate(poly), (rotate(sew) if sew is not None else None)
            w, h, rot = h, w, True
        if w > width:
            raise ValueError(f"'{it['label']}' is wider than the fabric ({w:.0f} cm > {width:.0f} cm). Use wider fabric or a smaller scale.")
        if x > 0 and x + w > width:
            x, y, row_h = 0.0, y + row_h + gap, 0.0
        mn = poly.min(axis=0)
        shift = np.array([x, y]) - mn
        placed.append(dict(label=it["label"], poly=poly + shift, sew=(sew + shift if sew is not None else None),
                           w=w, h=h, rotated=rot))
        x += w + gap
        row_h = max(row_h, h)
    return placed, y + row_h


def _dxf(placed, units_cm=True) -> str:
    """Minimal R12 ASCII DXF: closed POLYLINEs on layer CUT (and SEW), labels on layer TEXT. Y is flipped for CAD."""
    L = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "9", "$INSUNITS", "70", "5" if units_cm else "4",
         "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"]

    def poly(layer, pts):
        L.extend(["0", "POLYLINE", "8", layer, "66", "1", "70", "1"])
        for x, y in pts:
            L.extend(["0", "VERTEX", "8", layer, "10", f"{x:.3f}", "20", f"{-y:.3f}", "30", "0.0"])
        L.extend(["0", "SEQEND", "8", layer])

    for p in placed:
        poly("CUT", p["poly"])
        if p.get("sew") is not None:
            poly("SEW", p["sew"])
        c = p["poly"].mean(axis=0)
        L.extend(["0", "TEXT", "8", "TEXT", "10", f"{c[0]:.3f}", "20", f"{-c[1]:.3f}", "30", "0.0",
                  "40", "2.0", "1", p["label"].replace("\n", " ")[:60]])
    L.extend(["0", "ENDSEC", "0", "EOF"])
    return "\n".join(L) + "\n"


def _svg(placed, width, length) -> str:
    mm = 10  # 1 cm = 10 user units, so the SVG opens at true size in mm-based tools
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width * 10:.0f}mm" height="{length * 10:.0f}mm" '
             f'viewBox="0 0 {width * mm:.0f} {length * mm:.0f}">',
             f'<rect width="{width * mm:.0f}" height="{length * mm:.0f}" fill="none" stroke="#999" stroke-dasharray="8 6"/>']
    for p in placed:
        d = "M " + " L ".join(f"{x * mm:.1f},{y * mm:.1f}" for x, y in p["poly"]) + " Z"
        c = p["poly"].mean(axis=0)
        parts.append(f'<path d="{d}" fill="#f3e7d8" stroke="black" stroke-width="2"/>')
        parts.append(f'<text x="{c[0] * mm:.0f}" y="{c[1] * mm:.0f}" font-size="{max(10, min(24, min(p["w"], p["h"]) * mm * 0.10)):.0f}" '
                     f'text-anchor="middle" font-family="sans-serif">{p["label"]}</text>')
    parts.append("</svg>")
    return "\n".join(parts)


def grade_job(export_dir: Path, sizes=("S", "M", "L", "XL"), base_size="M", base_length_cm=None,
              base_piece=None, fabric_width_cm=150.0, seam_cm=1.0, default_length_cm=90.0) -> dict:
    manifest = json.loads((export_dir / "manifest.json").read_text())
    pieces = [p for p in manifest["pieces"] if p.get("polygon")]
    if not pieces:
        raise ValueError("This job has no piece outlines to grade.")
    sizes = [s for s in sizes if s in SIZES]
    if not sizes:
        raise ValueError("Choose at least one size from: " + ", ".join(SIZES))
    if base_size not in SIZES:
        base_size = "M"

    # scale: the longest side of the reference piece is base_length_cm
    ref = pieces[int(base_piece)] if base_piece not in (None, "") and 0 <= int(base_piece) < len(pieces) else \
        max(pieces, key=lambda p: max(p["w"], p["h"]))
    assumed = base_length_cm in (None, "", 0)
    length_cm = float(base_length_cm) if not assumed else float(manifest.get("catalog_length_cm") or default_length_cm)
    if length_cm < 5 or length_cm > 400:
        raise ValueError("base_length_cm must be between 5 and 400.")
    px_per_cm = max(ref["w"], ref["h"]) / length_cm

    out = export_dir / "grading"
    out.mkdir(exist_ok=True)
    report = dict(
        note=("Approximate. Proportional grading of AI-drawn shapes, not a measured size chart. "
              "Check the scale and test with a toile before cutting production fabric."),
        scale=dict(reference_piece=ref["label"], reference_longest_side_cm=length_cm,
                   assumed_from_garment_type=assumed, px_per_cm=round(px_per_cm, 3)),
        fabric_width_cm=fabric_width_cm, seam_allowance_cm=seam_cm, base_size=base_size, sizes={})

    for s in sizes:
        f = SIZES[s] / SIZES[base_size]
        items = []
        for pc in pieces:
            g = _grade(_poly_cm(pc, px_per_cm), f)      # stitch line
            cut = _offset(g, seam_cm)                   # cutting line = stitch line + seam allowance
            n_copies = max(1, int(pc.get("cut_count") or 1))
            for n in range(n_copies):
                tag = f"{pc['label']} #{n + 1}" if n_copies > 1 else pc["label"]
                items.append(dict(label=tag, poly=cut, sew=g, size=_bbox(cut)[1]))
        placed, length = _pack(items, fabric_width_cm)
        (out / f"marker_{s}.svg").write_text(_svg(placed, fabric_width_cm, length))
        (out / f"patterns_{s}.dxf").write_text(_dxf(placed))
        m = length * WASTE / 100
        report["sizes"][s] = dict(
            marker_length_cm=round(length, 1), yardage_m=round(m, 2), yardage_yd=round(m / 0.9144, 2),
            pieces_cut=len(items), files=[f"grading/marker_{s}.svg", f"grading/patterns_{s}.dxf"],
            method="single-layer shelf layout; hand-nested markers usually save 5 to 15 percent")
    (out / "grading.json").write_text(json.dumps(report, indent=1))
    return report
