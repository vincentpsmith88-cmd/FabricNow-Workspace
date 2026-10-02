"""Garment catalog: ids the UI offers, plus construction hints fed to the vision and drawing prompts.

length_cm is the typical longest pattern piece, used only to give grading/yardage a starting scale
(users can override it per request)."""

CATALOG = [
    # --- everyday ---
    dict(id="dress", label="Dress", group="Everyday", length_cm=110,
         hint="a dress: bodice, skirt panels, sleeves if present, facings"),
    dict(id="shirt", label="Shirt", group="Everyday", length_cm=75,
         hint="a shirt: front, back, yoke, sleeves, cuffs, collar and stand, placket, pocket"),
    dict(id="jacket", label="Jacket", group="Everyday", length_cm=75,
         hint="a jacket: fronts, back, sleeves, collar, facings, pockets, lining if present"),
    dict(id="trousers", label="Trousers", group="Everyday", length_cm=105,
         hint="trousers: front legs, back legs, waistband, pockets, fly, belt loops"),
    dict(id="skirt", label="Skirt", group="Everyday", length_cm=75,
         hint="a skirt: panels, waistband, facings, slit or pleats if present"),
    dict(id="jumpsuit", label="Jumpsuit", group="Everyday", length_cm=150,
         hint="a jumpsuit: bodice front/back, trouser legs, waistband or belt, pockets, facings"),
    dict(id="wrap-dress", label="Wrap dress", group="Everyday", length_cm=120,
         hint="a wrap dress: overlapping wrap fronts, back bodice, long waist ties, sleeves, skirt panels"),
    dict(id="kids", label="Children's wear", group="Everyday", length_cm=60,
         hint="a child's garment: simple bodice/top and skirt or trouser panels, facings, ties"),
    # --- African & African-inspired ---
    dict(id="kaftan", label="Kaftan", group="African", length_cm=140,
         hint="a kaftan: wide T-shaped front and back, sleeves, neck facing or placket, side slits, optional ties"),
    dict(id="agbada", label="Agbada", group="African", length_cm=140,
         hint="an agbada: very wide flowing outer robe made from large rectangular/trapezoid body panels, wide sleeves, "
              "a front embroidered or contrast panel, and neck facing; often worn over a buba top and sokoto trousers"),
    dict(id="boubou", label="Boubou / Bubu", group="African", length_cm=150,
         hint="a boubou (bubu): long wide T-shaped robe with front and back panels, wide sleeves, neck opening with "
              "embroidery panel; often with matching trousers or wrapper"),
    dict(id="dashiki", label="Dashiki", group="African", length_cm=80,
         hint="a dashiki: loose pullover tunic, V-neck with decorative neck panel, side slits, short wide sleeves"),
    dict(id="kaba-slit", label="Kaba and slit", group="African", length_cm=100,
         hint="a kaba and slit set: fitted kaba blouse (often with peplum or puff sleeves) and a long fitted slit skirt "
              "with front or back slit and waistband"),
    dict(id="buba-iro", label="Buba and iro", group="African", length_cm=180,
         hint="a buba and iro set: loose buba blouse with sleeves, iro wrapper as a long rectangle, and optionally a "
              "gele headtie and ipele shawl as long rectangles"),
    dict(id="aso-oke", label="Aso-oke set", group="African", length_cm=200,
         hint="an aso-oke set made of narrow handwoven strips: wrapper, buba top, gele headtie, and a cap (fila) if present"),
    dict(id="senator", label="Senator suit", group="African", length_cm=105,
         hint="a men's senator suit: long tunic top with mandarin collar, front placket, chest pocket, sleeves; plus trousers"),
    dict(id="kitenge-set", label="Kitenge / Ankara two-piece", group="African", length_cm=90,
         hint="a matching two-piece in wax print: top (bodice or blouse, sleeves) and skirt or trousers, with facings"),
    dict(id="shweshwe", label="Shweshwe dress", group="African", length_cm=110,
         hint="a Southern African shweshwe dress: fitted bodice, full A-line or gathered skirt, sleeves, waistband, facings"),
    dict(id="djellaba", label="Djellaba", group="African", length_cm=150,
         hint="a djellaba: long hooded robe with hood, front opening or placket, side slits, long sleeves, pocket"),
    dict(id="kanzu", label="Kanzu", group="African", length_cm=140,
         hint="a kanzu: long tunic with collar, front placket, sleeves, cuffs and pockets"),
    dict(id="peplum", label="Peplum top / dress", group="African", length_cm=90,
         hint="a peplum garment: fitted bodice, flared peplum frill panels, sleeves, facings, optional skirt"),
    dict(id="mermaid-gown", label="Mermaid gown", group="African", length_cm=160,
         hint="a mermaid gown: fitted bodice, fitted hip panels flaring into a godet/flounce hem, optional train, "
              "corset boning channel pieces, facings"),
    dict(id="corset-gown", label="Corset gown", group="African", length_cm=150,
         hint="a corset gown: structured corset bodice panels (several vertical panels per side), skirt panels, lining, ties"),
    dict(id="gele", label="Gele / headtie", group="Accessories", length_cm=180,
         hint="a gele headtie: one long rectangle of fabric (list it as a single strip)"),
    dict(id="bag", label="Bag", group="Accessories", length_cm=40,
         hint="a fabric bag: body panels, gusset, straps, pocket, lining"),
]

_BY_KEY = {}
for _g in CATALOG:
    _BY_KEY[_g["id"]] = _g
    _BY_KEY[_g["label"].lower()] = _g


def find(garment: str | None):
    """Look up by id or label; returns None for 'Auto-detect' or unknown values."""
    return _BY_KEY.get((garment or "").strip().lower())


def hint(garment: str | None) -> str:
    g = find(garment)
    return g["hint"] if g else ""


def length_cm(garment: str | None, default: float = 90.0) -> float:
    g = find(garment)
    return float(g["length_cm"]) if g else default


def public() -> list[dict]:
    return [dict(id=g["id"], label=g["label"], group=g["group"]) for g in CATALOG]
