# FabricNow — Genesis 9 Avatar Integration

- Replaced the female Pattern Studio fitting avatar source with the user's uploaded `Untitled.fbx`.
- Stored it as `public/models/fabricnow-genesis9-female.fbx`.
- Added `public/fbx-viewer.html`, a browser-side Three.js + FBXLoader viewer so FabricNow can render FBX without requiring the Vite bundle to contain an FBX parser.
- Kept male avatar on the existing GLB path.
- Female avatar supports the existing Front / 3/4 / Side / Back controls and size scaling through the viewer URL.
- Existing backend metadata remains: model gender, size, and fit system.
- The uploaded FBX is used as provided; its embedded/referenced materials are preserved where the browser can resolve them.
- True cloth-to-avatar physical simulation is still a separate simulation/backend layer; this change integrates the actual avatar model into the 3D Fit stage rather than faking garment drape.

Build note: a fresh Vite production build was not verified in this environment because the workspace does not contain an installed Vite binary and package registry access is unavailable. The source files and public assets were updated directly.
