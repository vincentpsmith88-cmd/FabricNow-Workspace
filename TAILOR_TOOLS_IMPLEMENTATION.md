# Tailor Tools

Tailor Tools is now a first-class Workspace sidebar page immediately after Pattern Studio.

## Included
- SVG/vector tailoring board with selectable pattern-piece, seam, dart, notch, grainline, stitch and annotation tools.
- Linked Workspace project selector.
- Persistent boards through `/api/tailor-tools/boards`.
- Board validation through `/api/tailor-tools/boards/:id/validate`.
- SVG export through `/api/tailor-tools/boards/:id/export.svg`.
- Gemini-powered `/api/tailor-tools/ai`, `/api/tailor-tools/stitch-plan`, and `/api/tailor-tools/cutting-layout`.
- AI suggestions are reviewable and only become board operations after the user clicks **Apply to board**.
- Existing Pattern Studio now lets AI determine garment type automatically; the garment selector is removed and the primary action is exactly **Generate**.

## Geometry rule
AI can reason about geometry and construction, but the board remains structured vector data. A single photo does not establish physical scale; the AI should identify missing references instead of inventing confirmed measurements.

## Environment
The Tailor Tools AI uses the existing server-side `GEMINI_API_KEY`. No Gemini key is placed in the frontend.
