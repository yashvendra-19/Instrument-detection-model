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

The animated processing sequence is presentation feedback around the real request; the backend response remains the source of truth.

## UI features

- futuristic dark console layout
- animated orbital system monitor
- drag-and-drop audio intake
- client-side waveform preview
- animated inference pipeline
- real detection result cards from `/detect`
- confidence/match score visualization
- timestamp timeline
- responsive mobile layout
- runtime FastAPI Basic Auth connection panel
