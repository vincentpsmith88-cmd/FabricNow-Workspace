# Pattern Studio fixes

## What changed
- Fixed generated pattern-piece previews to request the worker manifest's actual `file` (for example `piece_01.png`) or `id`, instead of treating the human-readable piece name (for example `Front Bodice`) as a filename.
- Uses manifest dimensions (`width_mm` and `height_mm`) for piece metadata, with backward-compatible fallbacks.
- Refreshed the completed-job review layout: cleaner sheet stage, responsive piece cards, clearer section hierarchy, refined spacing, and mobile adjustments.
- Kept the existing job polling, grading, authenticated image fetching, deletion, and ZIP export flows intact.

## Root cause of the 404s
The worker exports files as `piece_01.png`, `piece_02.png`, etc. The manifest stores that filename in each piece's `file` field and the human-readable label in `name`. The old frontend requested `${p.name}.png`, which generated requests such as `Front Bodice.png` and returned 404.

## Build
Run `npm install` and `npm run build` from this folder before deployment.
