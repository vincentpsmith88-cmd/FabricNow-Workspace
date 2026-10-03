# Shared Inspiration Library + Gallery + Assistant fix (frontend)

New: src/pages/SharedLibrary.jsx, PhotoSearch.jsx, Gallery.jsx (+ shared-library.css, gallery.css)
Changed: src/pages/PinterestResearch.jsx (tabs), src/nav.js (Gallery in sidebar), src/App.jsx (route)
Assistant: src/pages/Assistant.jsx rewritten + src/pages/assistant.css (fixed-height scrolling chat)

Needs the backend with UNSPLASH_ACCESS_KEY (or an existing PEXELS_API_KEY) in its .env.
Run: npm install && npm run dev  (VITE_API_URL=http://localhost:4000)
