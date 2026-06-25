import os
import shutil
import tempfile
import uuid
from pathlib import Path

import secrets
from fastapi import FastAPI, File, HTTPException, UploadFile, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

# Automatically imports your working classifier.py from the same directory
import classifier

# -------------------------------------------------------------------
# FastAPI App Instance Configuration
# -------------------------------------------------------------------
app = FastAPI(
    title="Indian Music Instrument Detection V2",
    description="Detects specific instruments in an uploaded song using direct local stems + Microsoft CLAP.",
    version="2.0",
)

# Stems we want to route through our custom CLAP classifier matrix
# (Removed STEM_ITEMS as we process the full audio now)

security = HTTPBasic()

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verifies the HTTP Basic Auth credentials against the hardcoded secure values."""
    # To prevent timing attacks, we use secrets.compare_digest
    correct_username = secrets.compare_digest(credentials.username, "pratikverma0902@gmail.com")
    correct_password = secrets.compare_digest(credentials.password, "P@55W0rd")
    
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials

@app.get("/")
def home(credentials: HTTPBasicCredentials = Depends(verify_credentials)):
    """Simple health check endpoint."""
    return {"status": "ok", "message": "POST an audio file to /detect", "user": credentials.username}

@app.post("/detect")
async def detect(file: UploadFile = File(...), credentials: HTTPBasicCredentials = Depends(verify_credentials)):
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

        # 2. Skip separation, classify the original audio directly for speed
        print("[API INFO] Processing full audio file directly through CLAP Classification Model...")
        all_detections = classifier.classify_stem(str(upload_path))

        # 3. Deduplicate (Though not strictly necessary for a single run, kept for structural consistency)
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