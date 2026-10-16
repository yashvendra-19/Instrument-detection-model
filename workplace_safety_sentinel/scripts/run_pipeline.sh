#!/usr/bin/env bash
# Run the PipeGen-generated perception pipeline AND the incident processor together.
#
# This script deliberately does NOT hard-code PipeGen CLI commands: use the exact
# run command documented/printed by YOUR installed PipeGen version.
#
# Required environment:
#   PIPEGEN_RUN_CMD  the command that launches the generated pipeline. If unset,
#                    the run.sh that PipeGen generates inside pipegen_project/export/
#                    is used (PipeGen "generates a DeepStream app with a run.sh").
#   METADATA_PATH    the JSONL file the pipeline writes per-frame detections to
# Optional:
#   METADATA_FORMAT  generic | deepstream_minimal   (default: settings.yaml)
#   SENTINEL_MQTT=1  also publish alerts to MQTT
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${PIPEGEN_RUN_CMD:-}" ]]; then
  RUN_SH="$(find "$ROOT/pipegen_project/export" -name run.sh 2>/dev/null | head -1)"
  [[ -n "$RUN_SH" ]] && PIPEGEN_RUN_CMD="cd '$(dirname "$RUN_SH")' && ./run.sh"
fi
: "${PIPEGEN_RUN_CMD:?no run.sh under pipegen_project/export/ - export the PipeGen project there or set PIPEGEN_RUN_CMD}"
: "${METADATA_PATH:?set METADATA_PATH to the detection-metadata file the pipeline writes}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
EVID="$ROOT/reports/evidence/pipeline_runs"; mkdir -p "$EVID"
LOG="$EVID/pipeline_run_$TS.log"

PROC_ARGS=(--input "$METADATA_PATH" --follow --idle-exit 10)
[[ -n "${METADATA_FORMAT:-}" ]] && PROC_ARGS+=(--format "$METADATA_FORMAT")
[[ "${SENTINEL_MQTT:-0}" == "1" ]] && PROC_ARGS+=(--mqtt)

echo "[sentinel] starting incident processor on $METADATA_PATH"
python3 "$ROOT/src/incident_processor.py" "${PROC_ARGS[@]}" 2>&1 | tee "$EVID/incident_processor_$TS.log" &
PROC_PID=$!
trap 'kill $PROC_PID 2>/dev/null || true' EXIT

echo "[sentinel] launching pipeline: $PIPEGEN_RUN_CMD"
echo "# command: $PIPEGEN_RUN_CMD" > "$LOG"; echo "# started: $(date -u +%FT%TZ) host: $(hostname)" >> "$LOG"
set +e
bash -c "$PIPEGEN_RUN_CMD" 2>&1 | tee -a "$LOG"
RC=${PIPESTATUS[0]}
set -e
echo "# finished: $(date -u +%FT%TZ) exit: $RC" >> "$LOG"
echo "[sentinel] pipeline exited with $RC; waiting for processor to drain ..."
wait $PROC_PID || true
echo "[sentinel] pipeline log: $LOG"
echo "[sentinel] incidents:    $ROOT/data/incidents.jsonl"
echo "[sentinel] stats:        $ROOT/data/stats.json"
exit $RC
