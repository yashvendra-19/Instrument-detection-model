# Instrument Intelligence Console (v2)

Multi-page front end for the FastAPI + CLAP instrument detector in this repository.
React 18 + Vite, Three.js (React Three Fiber) for the 3D sound sphere, Framer Motion for motion,
glass-morphism design system documented in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
Fonts: Dancing Script (headings), Sora (body) and JetBrains Mono (data) from [google/fonts](https://github.com/google/fonts), self-hosted via `@fontsource`.

## Pages

| Route | Page |
|---|---|
| `#/` | Home — 3D sound-sphere hero, instrument marquee, feature bento, pipeline teaser |
| `#/analyze` | Studio — upload or demo song, waveform + player, live audio-reactive sphere, pipeline, results, full-song timeline, JSON export |
| `#/instruments` | Library — all 32 prompts from `classifier.py`, filter by family, search |
| `#/how-it-works` | Scroll-traced pipeline, scoring formulas, 3D layered architecture, limitations |
| `#/about` | Team, supervisor, stack |

## Run

Requires Node.js 18+.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Production build (static files in `frontend/dist`, works from any folder thanks to hash routing):

```bash
npm run build
npm run preview
```

## Connect to the backend

Start the API from the repository root (`uvicorn app:app --port 8000`), then click **Connect** and enter
the URL and Basic Auth credentials. Credentials are kept in the browser tab only.

## Demo mode

No backend running? Use **Demo mode** (navbar dialog, Studio header, or *Try the demo* on Home).
A 65-second demo song is synthesised in the browser and analysis returns a fixed sample result in the
`/detect` JSON format. A banner and *Sample · demo* tags mark everything produced in this mode — it is
not CLAP output.
