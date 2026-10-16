# Submission checklist

Source of the requirements: *Embedded SF: CraftifAI Physical AI Hackathon:
Official Problem Statement*, Track A.

- **Deadline:** 4:00 pm
- **Submission form (PipeGen):** https://forms.gle/eJyeCKCG2UH757QZ8

Status values: **Complete**, **Incomplete**, **Blocked**, **Not verified**.
Last updated in the cloud container (no GPU) on 2026-10-16. Re-run
`scripts/validate_project.sh` on the GPU machine and update this file.

## Setup checklist (official)

| Item | Status | Note |
| --- | --- | --- |
| PipeGen v0.5.1 installed, `pipegen --version` prints `0.5.1` | Not verified | Not installed in the container |
| Signed in with a CraftifAI account | Not verified | Must be done by you |
| x86-64 + NVIDIA GPU, or Jetson on JetPack 6 | Not verified | The container has no GPU (`reports/environment_report_CLOUD_CONTAINER_no_gpu.txt`) |
| X11 desktop session | Not verified | `echo $XDG_SESSION_TYPE` should print `x11` |
| USB camera from the kit | Not verified | No camera in the container |
| Videos under `/home` | Not verified | — |

## Mandatory requirements (Track A)

| # | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| 1 | Full PipeGen flow: Requirement | Incomplete | Draft at `pipegen_project/requirement.md` |
| 1 | Full PipeGen flow: Pipeline IR | Blocked (here) | Needs PipeGen. Screenshot to `reports/evidence/pipegen/02_pipeline_ir_graph.png` |
| 1 | Full PipeGen flow: Model | Blocked (here) | Needs PipeGen |
| 1 | Full PipeGen flow: Compiler | Blocked (here) | Needs PipeGen and a GPU |
| 1 | Full PipeGen flow: Run | Blocked (here) | Needs a GPU and the generated `run.sh` |
| 2 | TensorRT engine and PipeGen speed report | Not verified | Screenshot to `reports/evidence/pipegen/04_speed_report.png` |
| 3 | Live run (video file, USB, CSI or RTSP) on a GPU or Jetson | Not verified | `scripts/run_pipeline.sh` puts logs in `reports/evidence/pipeline_runs/` |
| 4 | Actionable output (JSON or MQTT feed, alerts) | Complete (component) / Not verified (live) | Synthetic-input test: `reports/evidence/synthetic_component_test/` (JSONL and MQTT received from a local Mosquitto broker). 36 unit tests. |
| — | Deep integration: PipeGen is load-bearing | Not verified | By design, all perception and the metadata feed come from PipeGen, and the Python side does no inference. This needs the real run. |

## What to submit

| Item | Status | Path |
| --- | --- | --- |
| Working prototype: live demo at the venue | Not verified | `docs/demo_script.md` |
| Repository link, **including the PipeGen export folder** | Incomplete | `pipegen_project/export/` does not exist yet |
| Project description (inputs, tasks, models, precision, outputs, bonus) | Incomplete | `docs/project_description.md` (fill in the `TBD`s) |
| Evidence: IR node graph screenshot | Not verified | `reports/evidence/pipegen/02_pipeline_ir_graph.png` |
| Evidence: TensorRT speed report screenshot | Not verified | `reports/evidence/pipegen/04_speed_report.png` |
| Pitch deck or video (optional) | — | — |

## Supporting deliverables already complete
- Source: `src/`, `scripts/`, `config/`
- Tests: `tests/`, 36 passing
- Docs: `README.md`, `docs/architecture.md`, `docs/demo_script.md`, and the runbook
  at `pipegen_project/README.md`

## Unmet mandatory requirements right now
All five PipeGen stages, the TensorRT engine and speed report, the live run on a
GPU, the PipeGen export folder, and both evidence screenshots. Every one of them
needs the NVIDIA machine running PipeGen v0.5.1.
