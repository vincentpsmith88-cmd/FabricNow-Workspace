# FabricNow Company Workspace (React + Vite)

Workspace for companies on the **API Growth** plan: $2,900/month, 250 processed images included,
$49/image overage with segmentation, $20/image for background removal only
(matches https://fabricnow.tonasel.com/developers).

## Run
```bash
npm install
cp .env.example .env     # must be named exactly ".env", in this folder
# edit .env: set VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm run dev              # restart after any .env change
```

## Google sign-in
The button is Google's own (Google Identity Services). After the user picks an account, the app POSTs
`{ credential, idToken }` (the Google ID token) to `VITE_GOOGLE_AUTH_PATH` (default `/api/auth/google`)
and expects `{ token, user }` back, same as `/api/auth/signin`.
In Google Cloud Console, add your origin (e.g. `http://localhost:5173` and your production URL)
under **Authorized JavaScript origins** for that OAuth client.

## Branding
Logo and favicon live in `public/logo-icon.svg` and `public/logo-icon.png`.

## Production
`npm run build`, then deploy `dist/`. Never put Stripe secret keys or service-account JSON in this project.

## AI Studio additions
- Pattern Extraction preserves the Fabric Now Basic Plan export structure and adds `manifest.json` for piece names/cut counts.
- Vision analysis supports OpenAI or Claude (`AI_VISION_PROVIDER=auto|openai|claude`).
- Optional Claude quality review checks generated pattern sheets before export.
- African garment generator includes Agbada, Boubou/Bubu, Dashiki, Kaba and Slit, Buba and Iro, Aso-Ebi/Aso-Oke, Kitenge, Shweshwe, Ankara, Mermaid/Corset/Peplum gowns, Senator, Djellaba, Kanzu and more.
- AI image workflows include fabric/print generation, colorways, model mockups, technical flats, lookbooks, Aso-Ebi coordination and cutting-layout concepts.
- Product Listing AI generates title, descriptions, category, style, fabric, tags and SEO fields.
- AI credentials remain server-side; `.env` files are intentionally excluded from this deliverable.
