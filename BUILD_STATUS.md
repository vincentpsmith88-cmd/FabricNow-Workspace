# FabricNow — Fashion Avatar / Pattern Studio Update

## Implemented
- Removed the previous 3DAssets.dev mannequin dependency.
- Added local FabricNow female and male fashion-fitting avatar GLB assets.
- Redesigned the 3D Fit panel around a clean, neutral fashion-CAD presentation inspired by the reference workflow the user provided.
- Added Female/Male avatar selection.
- Added XS, S, M, L, XL and 2XL size controls with body/height metadata and visual scaling.
- Added company fit-system selection and carried the selected model gender, size and fit system into the existing pattern-generation request.
- Added Front, 3/4, Side and Back camera presets plus 15-degree rotation controls and direct drag rotation through model-viewer.
- Added local studio lighting/floor treatment and a compact production-oriented model label.
- Added Google model-viewer runtime to index.html.

## Important
The avatar is an original FabricNow neutral clay-style fitting mesh built for this workspace. It is designed to match the visual *category* of professional fashion-CAD avatars, not to copy LA VIPÈRE's proprietary model or interface.

The current backend pattern endpoint still receives the avatar selection metadata. Full cloth-to-avatar physical drape simulation requires a 3D garment simulation service/engine and a backend output that returns a garment GLB/USDZ or equivalent; the viewer is prepared for that next integration.

## Build verification
A fresh Vite production build was not available in this environment because the uploaded workspace does not contain an installed Vite binary and npm registry access is unavailable. Source and asset integrity were checked locally.
