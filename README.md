# Indian Music Instrument Detection Microservice

This repository contains a FastAPI microservice for detecting musical instruments in uploaded audio. It was built for Indian music workflows, where a single song can contain a mix of vocals, percussion, strings, harmonium, flute, electronic layers, and other instruments that need to be identified quickly.

This microservice is being used by Hindi Karaoke Shop, whose website is https://hindikaraokeshop.com/. Hindi Karaoke Shop works with a large catalog of karaoke tracks, so this service helps make audio analysis faster, more consistent, and easier to integrate into internal tools.

## What the service does

The API accepts an audio file, breaks it into 10-second windows, and compares each window against a curated list of instrument descriptions using CLAP audio-text embeddings. It then returns the instruments that stand out most strongly, along with confidence scores and the time range where each instrument was detected.

In plain terms, you upload a song and the service responds with a clean JSON list of likely instruments.

## Why this approach is useful

Traditional instrument detection often needs a fixed training dataset and a model trained for a narrow set of labels. This project uses a contrastive audio model, which makes it more flexible. The classifier can compare audio against descriptive prompts such as "traditional Indian tabla" or "acoustic guitar" and return matches without needing a separate model for every instrument.

The current version focuses on full-audio sliding-window analysis. That keeps the request flow simple and avoids depending on a long source-separation step for every upload.

## Core features

- FastAPI endpoint for audio upload and detection
- Microsoft CLAP based audio-text similarity
- Sliding-window analysis over the full audio file
- Confidence score for every returned instrument
- Timestamp range for the strongest detected moment
- Basic authentication on API endpoints
- Support for Indian and Western instrument prompts
- JSON response format that can be used directly by web apps, dashboards, or internal CRM tools

## Supported instrument groups

The prompt set currently covers:

- Piano, acoustic drums, flute, acoustic guitar, bass guitar, and string sections
- Sitar, sarod, sarangi, veena, santoor, mandolin, and tanpura
- Harmonium, bansuri, and shehnai
- Tabla, dholak, mridangam, ghatam, duff, and khanjari
- Electric guitar, synth, 808 bass, electronic kick, and drum machine
- Trumpet, saxophone, trombone, violin, and cello

You can adjust the supported instruments by editing `CANDIDATE_PROMPTS` and `PROMPT_TO_INSTRUMENT` in `classifier.py`.

## Project structure

```text
.
|-- app.py              FastAPI app and API routes
|-- classifier.py       CLAP based sliding-window instrument classifier
|-- separator.py        Optional Demucs source separation helper
|-- main.py             Local Uvicorn startup entry point
|-- test_clap.py        CLAP test script
|-- test_panns.py       PANNs test script
|-- requirements.txt    Python dependencies
|-- run.bat             Windows startup helper
`-- README.md           Project documentation
```

## Requirements

- Python 3.9 or newer
- Enough memory to load the CLAP model and process uploaded audio
- A CUDA-capable GPU is helpful for faster inference, but the service can run on CPU for smaller workloads

Install dependencies with:

```bash
pip install -r requirements.txt
```

The CLAP checkpoint is loaded when `classifier.py` starts. The first run can take longer because model files may need to be downloaded or initialized.

## Running the API

Start the FastAPI server with Uvicorn:

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Or run the local entry point:

```bash
python main.py
```

By default, `main.py` starts the service on:

```text
http://127.0.0.1:8000
```

## API endpoints

### Health check

```http
GET /
```

Returns a basic status response after authentication.

Example response:

```json
{
  "status": "ok",
  "message": "POST an audio file to /detect",
  "user": "authenticated-user"
}
```

### Detect instruments

```http
POST /detect
```

Send an audio file as multipart form data.

Example:

```bash
curl -X POST "http://localhost:8000/detect" \
  -u "USERNAME:PASSWORD" \
  -H "accept: application/json" \
  -F "file=@song.mp3"
```

Example response:

```json
{
  "success": true,
  "total_instruments_detected": 3,
  "instruments": [
    {
      "instrument": "Tabla",
      "original_prediction": "Tabla",
      "confidence": 0.3142,
      "confidence_percentage": "31.42%",
      "timestamp": "0:40 - 0:50"
    },
    {
      "instrument": "Harmonium",
      "original_prediction": "Harmonium",
      "confidence": 0.2918,
      "confidence_percentage": "29.18%",
      "timestamp": "1:20 - 1:30"
    },
    {
      "instrument": "Bansuri",
      "original_prediction": "Bansuri",
      "confidence": 0.2745,
      "confidence_percentage": "27.45%",
      "timestamp": "2:00 - 2:10"
    }
  ]
}
```

## How detection works

1. The uploaded file is saved to a temporary request folder.
2. The audio is loaded at 48 kHz in mono.
3. The audio is split into 10-second chunks.
4. Short final chunks are skipped, while slightly short chunks are padded with silence.
5. Each chunk is embedded with CLAP.
6. Instrument prompts are embedded as text.
7. The service compares audio embeddings with text embeddings.
8. For each instrument, the service keeps the strongest matching chunk.
9. A dynamic threshold filters out weaker matches.
10. The final response is returned as JSON.

## Configuration

The main instrument list lives in `classifier.py`.

To add a new instrument, add a descriptive prompt to `CANDIDATE_PROMPTS`, then map that exact prompt to the display name in `PROMPT_TO_INSTRUMENT`.

Example:

```python
CANDIDATE_PROMPTS = [
    "A traditional Indian tabla playing rapid rhythmic percussion strokes",
    "A traditional Indian harmonium pumping keys to play a melody",
]

PROMPT_TO_INSTRUMENT = {
    "A traditional Indian tabla playing rapid rhythmic percussion strokes": "Tabla",
    "A traditional Indian harmonium pumping keys to play a melody": "Harmonium",
}
```

Good prompts are specific, short, and written in natural language. For Indian music, mention the instrument family and the way it usually sounds.

## Security note

The API currently uses HTTP Basic Auth. Before deploying this service publicly, move credentials out of the source code and into environment variables or a secret manager.

Recommended environment variables:

```text
API_USERNAME
API_PASSWORD
```

## Testing

Run the available model checks with:

```bash
python test_clap.py
python test_panns.py
```

For API testing, start the server and upload a small audio file first. Short test files make it easier to confirm that authentication, upload handling, model loading, and JSON output are working before trying longer songs.

## Notes for production use

- Use a process manager or container runtime for deployment.
- Keep model files cached between restarts.
- Set upload size limits based on server memory.
- Store credentials outside the repository.
- Log request IDs instead of raw file names when handling customer audio.
- Clean temporary files after every request.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Acknowledgments

This project builds on the work behind CLAP, Demucs, PANNs, FastAPI, PyTorch, and the broader open-source audio machine learning ecosystem.
