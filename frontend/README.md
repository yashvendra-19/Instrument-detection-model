# Taal Console

Front end for the FastAPI + CLAP instrument detection service, built on the Taal v2 design system.

## Run

```bash
python -m http.server 5500 --directory frontend
```

Open http://127.0.0.1:5500, start the API (`uvicorn app:app --host 0.0.0.0 --port 8000`), press **API access**, and enter the address and Basic Auth credentials. Credentials stay in the tab's memory.

## What moves, and why

- Drop a file and press play: a Web Audio analyser splits it into seven frequency bands. Each band plucks and lights one family string in the hero, drives the meter, and moves the waveform playhead.
- Analyze: the seven backend stages light up while the real `/detect` request runs, with measured timings.
- Results: each instrument is a string that plucks when playback reaches its peak 10-second window; the ring hand follows playback.
- Springs and scroll-linked motion come from Motion 11.11.17 (`taal/motion.js`, MIT). Reduced-motion settings are respected.

## Files

- `taal/tokens.css`: tokens generated from `taal/tokens.json` (dark first, light via the OS setting or `data-theme="light"`)
- `taal/motion.js`: Motion 11.11.17 UMD build
- `taal/taal.css`, `taal/taal.js`: the Taal components and motion layer (`window.Taal`)
- `app.css`, `app.js`, `index.html`: the console page

No build step. Fonts load from Google Fonts.
