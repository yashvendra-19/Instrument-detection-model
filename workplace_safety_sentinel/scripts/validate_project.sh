#!/usr/bin/env bash
# Evidence-based status check. A stage is only reported COMPLETE if its artifact exists.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
ok()   { printf "  [COMPLETE]     %-38s %s\n" "$1" "$2"; }
miss() { printf "  [NOT VERIFIED] %-38s %s\n" "$1" "$2"; }
first() { find "$@" 2>/dev/null | head -1; }

echo "== Unit tests"; python3 -m pytest -q 2>&1 | tail -3
echo "== Config";     python3 -c "import sys; sys.path.insert(0,'src'); from config_loader import load_config; from zone_manager import zones_from_config; c=load_config('config/settings.yaml'); print('  settings.yaml valid; zones:', [z.id for z in zones_from_config(c['zones'])])"
echo "== PipeGen evidence (reports/evidence/pipegen, pipegen_project/)"
f=$(first reports/evidence/pipegen -iname '*requirement*'); [[ -n "$f" ]] && ok "1 Requirement" "$f" || miss "1 Requirement" "draft in pipegen_project/requirement.md; export PipeGen's copy to reports/evidence/pipegen/"
f=$(first reports/evidence/pipegen \( -iname '*pipeline_ir*' -o -iname '*graph*' \)); [[ -n "$f" ]] && ok "2 Pipeline IR" "$f" || miss "2 Pipeline IR" "no IR artifact found"
f=$(first pipegen_project reports/evidence/pipegen \( -name '*.onnx' -o -name '*.etlt' -o -iname '*model*.txt' -o -iname 'labels*.txt' \)); [[ -n "$f" ]] && ok "3 Model" "$f" || miss "3 Model" "no model/label file found"
f=$(first "$ROOT" -name '*.engine'); [[ -z "$f" ]] && f=$(first reports/evidence/pipegen -iname '*engine*'); [[ -n "$f" ]] && ok "4 TensorRT engine" "$f" || miss "4 TensorRT engine" "no *.engine found"
f=$(first reports/evidence/pipegen -iname '*speed*'); [[ -n "$f" ]] && ok "4 Speed report" "$f" || miss "4 Speed report" "no speed report in reports/evidence/pipegen/"
f=$(first reports/evidence/pipeline_runs -name 'pipeline_run_*.log'); [[ -n "$f" ]] && ok "5 Run (pipeline log)" "$f" || miss "5 Run (pipeline log)" "run scripts/run_pipeline.sh on the GPU machine"
echo "== Actionable output"
if [[ -s data/incidents.jsonl ]]; then ok "Live incidents (data/incidents.jsonl)" "$(wc -l < data/incidents.jsonl) record(s)"; else miss "Live incidents" "data/incidents.jsonl empty/absent"; fi
[[ -s reports/evidence/synthetic_component_test/mqtt_subscriber_received.txt ]] && ok "MQTT (component, synthetic input)" "reports/evidence/synthetic_component_test/" || miss "MQTT" ""
