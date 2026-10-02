# Fabric Now pattern worker

This is the image/pattern-processing worker used by the main Style/FabricNow
company workspace.

The Node/Express Style Backend remains the public backend of record. It handles
authentication, Google sign-in, workspace authorization, API keys, Stripe
billing and usage. It forwards authenticated pattern jobs to this worker.

Set:
- `FABRIC_NOW_SERVICE_URL` on the Node backend
- the same random `FABRIC_NOW_INTERNAL_SECRET` on Node and the worker
- `OPENAI_API_KEY` and the worker's image-model settings on the worker

The worker is not intended to be exposed directly to the browser.

## What the worker does

Pattern export (the Basic Plan format): photo -> vision plan (Claude or OpenAI) -> OpenAI draws one labelled sheet ->
a vision review names every shape and flags missing pieces (one redraw with feedback if needed) -> OpenCV splits the
sheet. Output matches the Basic Plan zip: `ORIGINAL PICTURE.png`, `00_full_transparent.png`, `Fabric Now 1.png`,
`piece_NN.png`, `svg_outline/`, `svg_full_print/`, plus `manifest.json` (piece names, cut counts, sizes, polygons).

Other endpoints (all need the internal secret and `x-workspace-user-id`):

| Endpoint | What it does |
|---|---|
| `GET /api/catalog` | Garment types (African and everyday), sizes, tool names |
| `POST /api/jobs` | One pattern job (`lining` = none, partial or full) |
| `POST /api/jobs/batch` | Up to `MAX_BATCH` photos, one job each |
| `POST /api/jobs/{id}/grade` | Size grading, seam allowance, marker layout, yardage, DXF and SVG |
| `POST /api/tools/{print,colorways,fabric,flats,mockup,asoebi}` | AI design tools (async jobs) |
| `POST /api/tools/listing` | Store listing text from photos (sync JSON) |

Rate limit is per workspace user (`RATE_LIMIT_PER_HOUR`); multi-image runs count more than once.

Limits to know: the sheet is AI-drawn, so pieces are not measured, graded blocks. Grading scales proportionally from
one length the user confirms. Use the output as a CLO3D or cutting starting point and test with a toile.
