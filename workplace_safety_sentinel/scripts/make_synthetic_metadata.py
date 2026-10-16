#!/usr/bin/env python3
"""Generate a SYNTHETIC detection-metadata stream (generic format) for testing the
incident processor without a GPU. These are NOT model detections and must never be
presented as pipeline output. Scenario: track 1 walks left->right into the zone;
track 2 stays outside; one untracked forklift sits inside the zone."""
import json
import sys
from datetime import datetime, timedelta, timezone

out = sys.argv[1] if len(sys.argv) > 1 else "data/synthetic/metadata_synthetic.jsonl"
t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
W, H, FPS, N = 1920, 1080, 10, 80
from pathlib import Path
Path(out).parent.mkdir(parents=True, exist_ok=True)
with open(out, "w") as fh:
    for i in range(N):
        x = 200 + i * 18  # track 1 walks right; feet enter zone (x>=1152) around frame 50
        objs = [
            {"label": "person", "class_id": 0, "confidence": 0.88, "track_id": 1,
             "bbox": {"left": x, "top": 380, "width": 140, "height": 400}},
            {"label": "person", "class_id": 0, "confidence": 0.81, "track_id": 2,
             "bbox": {"left": 300, "top": 350, "width": 130, "height": 380}},
            {"label": "forklift", "class_id": 7, "confidence": 0.7,
             "bbox": {"left": 1400, "top": 500, "width": 200, "height": 250}},
        ]
        fh.write(json.dumps({"frame": i, "timestamp": (t0 + timedelta(seconds=i / FPS)).isoformat(),
                             "source_id": 0, "width": W, "height": H, "synthetic": True,
                             "objects": objs}) + "\n")
print(f"wrote {N} SYNTHETIC frames to {out}")
