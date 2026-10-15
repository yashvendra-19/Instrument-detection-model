# Instrument Intelligence Console

Static frontend for the existing FastAPI + CLAP instrument detection service.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Motion's vanilla JavaScript API from the Motion ecosystem (used instead of React-only Framer Motion)
- Web Audio API for the local waveform preview

Framer Motion is designed around React. Because this project intentionally avoids React/Vite, this implementation uses the framework-agnostic Motion browser API so the code remains HTML + CSS + JS while retaining the same animation ecosystem.

## Run

From the repository root:

```bash
python -m http.server 5500 --directory frontend
```

Open `http://127.0.0.1:5500`.

Run the FastAPI backend separately:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Connect

Click **API ACCESS**, enter the URL and the Basic Auth credentials for your running FastAPI service, then test the connection.

The credentials are intentionally entered at runtime and are not hard-coded into the frontend.

## What the frontend visualizes

The UI mirrors the backend that is already in this repository:

1. upload accepted by FastAPI
2. 48 kHz mono audio loading
3. 10-second sliding windows
4. CLAP audio embeddings
5. CLAP text prompt matching
6. max pooling across windows
7. dynamic threshold filtering

Upload progress is real (measured by the browser). Steps 2–7 all run inside one `/detect` request and the API reports no per-step progress, so the console shows them as running on the server together until the response arrives, then shows the total time taken.

## UI features

- futuristic dark console layout
- animated orbital system monitor
- drag-and-drop audio intake
- client-side waveform preview with the 10-second window grid; click to seek
- built-in audio player (play/pause, current time, current window number; Space toggles playback)
- window count computed with the same rule as `classifier.py` (tails under 1 s are skipped)
- inference pipeline with real upload progress and elapsed time
- real detection result cards from `/detect`, each with a **Play window** button that plays that instrument's 10-second window
- confidence/match score visualization
- full-song timeline: a time ruler, one row per detected instrument and a playhead synced to playback; click a row to play its window, click the ruler to seek
- detected windows highlighted on the waveform; the matching card and timeline row light up while their window is playing
- responsive mobile layout
- runtime FastAPI Basic Auth connection panel
