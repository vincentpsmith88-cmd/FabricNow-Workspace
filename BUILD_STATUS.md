# FabricNow build status — API/settings redesign

## Fixed
- Fixed the API Keys runtime crash: the header action now calls the component's `create` handler instead of an undefined `onCreate` variable.
- Kept the Asset Library-style Developer empty state for API Keys.
- Added a shared Product Empty State system and applied it to Analytics, Usage, Billing, Company, Settings, and Help & Docs.
- Usage and Billing only render live values when backend connection status exists; no placeholder metrics are fabricated.
- Company shows the empty state when no company identity is stored.
- Help & Docs now uses the same empty-state hero plus live external documentation links.
- Settings has a workspace-preferences empty-state hero followed by real profile/appearance controls.

## Verification
- Source search confirms no undefined `onCreate` reference remains in the API Keys page; only the local DeveloperEmpty prop and its passed `create` callback remain.
- A production rebuild could not be run in this sandbox because the bundled dependency tree contains placeholder directories without npm package contents, and npm cannot download the missing packages (registry access is unavailable).
- The existing dist bundle already contains the corrected API Keys header handler, but the new source-page redesigns require a normal `npm install`/`npm ci` and `npm run build` in a network-enabled development environment.
