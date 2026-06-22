import os
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# Automatically imports your working classifier.py from the same directory
import classifier
import separator

# -------------------------------------------------------------------
# FastAPI App Instance Configuration
# -------------------------------------------------------------------
app = FastAPI(
    title="Indian Music Instrument Detection V2",
    description="Detects specific instruments in an uploaded song using direct local stems + Microsoft CLAP.",
    version="2.0",
)

# Stems we want to route through our custom CLAP classifier matrix
STEM_ITEMS = ("drums", "other")

@app.get("/")
def home():
    """Simple health check endpoint."""
    return {"status": "ok", "message": "POST an audio file to /detect"}

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    """
    Main detection endpoint.
    Accepts any uploaded audio file, bypasses local process bottlenecks,
    and runs the CLAP embedding similarity engine directly on the stems.
    """
    # 1. Setup an isolated unique temp file to handle the incoming request stream
    suffix = Path(file.filename or "upload.mp3").suffix
    request_id = uuid.uuid4().hex
    tmp_dir = Path(tempfile.gettempdir()) / "indian_instrument_detection" / request_id
    tmp_dir.mkdir(parents=True, exist_ok=True)
    upload_path = tmp_dir / ("input" + suffix)

    try:
        # Save the uploaded file payload to disk to fulfill standard backend requirements
        with open(upload_path, "wb") as out:
            shutil.copyfileobj(file.file, out)

        # 2. Dynamic Audio Separation
        print("[API INFO] Running separation on uploaded audio file...")
        stems = separator.separate_stems(str(upload_path))

        # 3. Process the track vectors straight through the working CLAP engine
        print("[API] Processing files through CLAP Classification Model...")
        all_detections = []
        for stem_name in STEM_ITEMS:
            stem_path = stems.get(stem_name)
            if stem_path and os.path.exists(stem_path):
                print(f"[API] Classifying track target: {stem_path}")
                detections = classifier.classify_stem(stem_path)
                all_detections.extend(detections)

        # 4. Deduplicate: Keep the absolute highest-confidence result per instrument label
        best_per_label = {}
        for det in all_detections:
            label = det["instrument"]
            if label not in best_per_label or det["confidence"] > best_per_label[label]["confidence"]:
                best_per_label[label] = det

        # Sort with highest confidence at the top of the array
        instruments = sorted(
            best_per_label.values(), 
            key=lambda d: d["confidence"], 
            reverse=True
        )

        # 5. Build and send back the production response payload
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "total_instruments_detected": len(instruments),
                "instruments": instruments,
            },
        )

    except Exception as e:
        print(f"[API ERROR] Pipeline failed: {repr(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Pipeline failed: " + str(e)
        )

    finally:
        # Cleanup staging files to preserve server storage space
        try:
            if upload_path.exists():
                upload_path.unlink()
        except Exception:
            pass