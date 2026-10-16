#!/usr/bin/env bash
# Component demo WITHOUT a GPU: replays a SYNTHETIC metadata stream through the
# incident processor. Output goes to data/synthetic/, never to data/incidents.jsonl.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
python3 scripts/make_synthetic_metadata.py data/synthetic/metadata_synthetic.jsonl
rm -f data/synthetic/incidents_synthetic.jsonl
python3 src/incident_processor.py --input data/synthetic/metadata_synthetic.jsonl \
  --output data/synthetic/incidents_synthetic.jsonl --stats data/synthetic/stats_synthetic.json "$@"
echo "--- SYNTHETIC incidents:"; cat data/synthetic/incidents_synthetic.jsonl
echo "--- SYNTHETIC stats:";     cat data/synthetic/stats_synthetic.json
