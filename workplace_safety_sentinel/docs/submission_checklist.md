# Submission checklist

Status values: **Complete**, **Incomplete**, **Blocked**, **Not verified**.
This checklist was last updated in the cloud container (no GPU) on 2026-10-16.
Re-run `scripts/validate_project.sh` on the GPU machine and update this file.

## Mandatory (official Track A requirements)

| # | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| A1 | PipeGen stage 1: Requirement | Incomplete | Draft at `pipegen_project/requirement.md`. Not yet fed to PipeGen. |
| A2 | PipeGen stage 2: Pipeline IR | Blocked (here) | PipeGen not installed. CraftifAI portal unreachable from the container. |
| A3 | PipeGen stage 3: Model | Blocked (here) | Requires PipeGen. |
| A4 | PipeGen stage 4: Compiler | Blocked (here) | Requires PipeGen, TensorRT, and a GPU. |
| A5 | PipeGen stage 5: Run | Blocked (here) | Requires a GPU and DeepStream. |
| B1 | At least one model compiled to a TensorRT engine | Not verified | No `*.engine` exists. No GPU in the container. |
| B2 | PipeGen speed report preserved | Not verified | Save it to `reports/evidence/pipegen/04_speed_report.*` |
| C1 | Live input (USB, CSI, RTSP or file) | Not verified | No camera or video in the container. |
| C2 | Runs on an NVIDIA GPU or Jetson | Not verified | `reports/environment_report_CLOUD_CONTAINER_no_gpu.txt` shows no GPU here. |
| D1 | Actionable output: JSON incidents | Complete (component) / Not verified (live) | `reports/evidence/synthetic_component_test/incidents_synthetic.jsonl` (synthetic input), plus unit tests |
| D2 | Actionable output: MQTT (optional) | Complete (component) / Not verified (live) | `reports/evidence/synthetic_component_test/mqtt_subscriber_received.txt`, tested with local Mosquitto 2.x |
| E1 | PipeGen central to the implementation | Not verified | The design puts all perception in PipeGen. Needs the actual run. |

## Project deliverables

| Item | Status | Path |
| --- | --- | --- |
| Source code | Complete | `src/`, `scripts/`, `config/` |
| Unit tests (36) | Complete: all pass | `tests/` (run `python3 -m pytest -q`) |
| README | Complete | `README.md` |
| Architecture / project description | Complete | `docs/architecture.md`, `README.md` |
| Demo script | Complete | `docs/demo_script.md` |
| PipeGen runbook | Complete | `pipegen_project/README.md` |
| PipeGen export directory | Incomplete | `pipegen_project/export/` (to be created by PipeGen) |
| Pipeline IR graph evidence | Not verified | `reports/evidence/pipegen/` |
| Live incident log | Not verified | `data/incidents.jsonl` (written only by real runs) |
| Screenshots | Not verified | Take them on the GPU machine. Never fabricate them. |

## Unmet mandatory requirements right now
A1–A5, B1, B2, C1, C2, E1. All of them need the NVIDIA machine with CraftifAI PipeGen.
