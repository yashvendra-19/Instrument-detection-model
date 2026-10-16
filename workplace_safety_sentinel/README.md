# Workplace Safety Sentinel

**"See the danger. Detect the violation. Trigger the alert."**

Embedded SF: CraftifAI Physical AI Hackathon, **Track A: PipeGen (Perception)**.
This is suggested problem track #1 in the official problem statement.

An edge-AI safety monitor. It detects people in a live video stream and recognizes
when someone enters a restricted zone, such as a machine cell, a robot work area,
or a lab hazard area. It then raises a structured alert as a JSON Lines record and,
optionally, an MQTT message.

## Current status: read this first

| Stage | Status | Evidence |
| --- | --- | --- |
| Incident processor (zone logic, dedup, stats, JSONL) | **Complete; unit-tested (36 passing)** | `tests/`, `pytest -q` |
| MQTT alert publishing | **Complete for the component, tested on a local Mosquitto broker with synthetic input** | `reports/evidence/synthetic_component_test/` |
| PipeGen Requirement → IR → Model → Compiler → Run | **Not done yet. Must run on the NVIDIA machine** | `pipegen_project/README.md` (runbook) |
| TensorRT engine and speed report | **Not generated** | — |
| Live video / camera execution | **Not verified** | — |

This repository was prepared in a cloud container with **no NVIDIA GPU, no
PipeGen, no DeepStream or TensorRT, and no camera**
(`reports/environment_report_CLOUD_CONTAINER_no_gpu.txt`). The CraftifAI
developer portal was unreachable from there. No PipeGen output, engine, speed
report, or live incident in this repo has been fabricated. Those stages run on the
hackathon GPU machine by following `pipegen_project/README.md`.

## Architecture

```
 camera / RTSP / video file
            │
 ┌──────────▼──────────────── PipeGen-generated DeepStream pipeline (GPU) ──┐
 │ source → nvstreammux → nvinfer [TensorRT engine: person detector]        │
 │        → nvtracker (track IDs) → nvdsosd (boxes + zone) → sink           │
 │        └→ metadata out (JSON lines file / nvmsgconv + MQTT)              │
 └──────────┬───────────────────────────────────────────────────────────────┘
            │  per-frame detections: label, conf, bbox, track_id
 ┌──────────▼──────────── src/incident_processor.py (CPU, no inference) ────┐
 │ metadata_adapters → person filter → bottom-center anchor → zone_manager  │
 │ → dedup (track state / zone cooldown) → event_logger + mqtt_publisher    │
 │ → safety_stats                                                           │
 └──────────┬───────────────────────────────────────────────────────────────┘
            ▼
 data/incidents.jsonl   data/stats.json   MQTT workplace_safety/alerts
```

PipeGen does all the perception work. The Python side does **no inference**. It
turns the pipeline's metadata into actionable incidents. For details, see
`docs/architecture.md`.

## Requirements

- On the GPU machine, per the official setup checklist: **PipeGen v0.5.1**
  (`pipegen --version` prints `0.5.1`), signed in with a CraftifAI account, on
  x86-64 Linux with an NVIDIA GPU or a Jetson on JetPack 6, in an **X11** session.
  Use the kit's USB camera, and keep videos under `/home`. Download PipeGen from
  https://developer.craftifai.com/dashboard?tab=downloads
- For the incident processor: Python ≥ 3.9, `PyYAML`; optionally `paho-mqtt` and a
  broker such as Mosquitto; `pytest` for the tests.

## Installation

```bash
git clone <this repo> && cd <repo>/workplace_safety_sentinel
# or copy/symlink it:  ln -s "$PWD" ~/workplace_safety_sentinel
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
scripts/check_environment.sh
```

## Configuration (`config/settings.yaml`)

- `zones`: one or more rectangles in **normalized** coordinates (0–1), so they work
  at any resolution. The boundary counts as inside.
- `detection.person_labels` / `person_class_ids`: set these **from your model's label
  file**. Matching on labels is case-insensitive.
- `detection.anchor`: `bottom_center` (default; approximates where the feet touch
  the floor) or `center`.
- `incidents.confirm_frames`: the number of consecutive in-zone frames needed before
  a tracked person triggers an alert (default 3).
- `incidents.cooldown_seconds`: guards against repeat alerts for the same track
  re-entering, and is the dedup window when there are no track IDs.
- `input.format`: `generic` or `deepstream_minimal`. `input.frame_width/height` is
  used when the metadata carries no frame size.
- `mqtt.*`: broker host, port, and topic (`workplace_safety/alerts`). Off by default.
  Turn it on in the settings file or with `--mqtt`.

The zone check is validated at startup. Invalid coordinates (outside 0–1, or
min ≥ max) stop the processor with a clear error.

## Running the real pipeline (GPU machine)

Follow `pipegen_project/README.md` for stages 1–5. Then:

PipeGen generates a DeepStream app with a `run.sh`. Export the project to
`pipegen_project/export/`, then run:

```bash
export METADATA_PATH="<JSON metadata file written by the generated app>"
export METADATA_FORMAT=generic      # or deepstream_minimal, after checking `head -3`
SENTINEL_MQTT=1 scripts/run_pipeline.sh   # auto-finds export/**/run.sh (or set PIPEGEN_RUN_CMD)
```

`run_pipeline.sh` starts the incident processor in follow mode, launches the
generated app, and saves both logs to `reports/evidence/pipeline_runs/`.

## Running the incident processor directly

```bash
python3 src/incident_processor.py --input <metadata.jsonl>               # batch
python3 src/incident_processor.py --input <metadata.jsonl> --follow      # live tail
mosquitto_sub -t <ds-topic> | python3 src/incident_processor.py --input - --format deepstream_minimal
```

### Metadata contract (`generic`)

There is one JSON object per frame, per line:

```json
{"frame": 12, "timestamp": "2026-10-16T15:00:00.000Z", "source_id": 0,
 "width": 1920, "height": 1080,
 "objects": [{"label": "person", "class_id": 0, "confidence": 0.91, "track_id": 3,
              "bbox": {"left": 1200, "top": 300, "width": 150, "height": 420}}]}
```

You can use `bbox_norm: [x1,y1,x2,y2]` instead of `bbox`. The `timestamp`,
`class_id`, `confidence` and `track_id` fields are optional. Malformed lines are
counted and skipped; they never crash the processor.

## Component demo without a GPU (synthetic input)

```bash
scripts/run_synthetic_demo.sh            # add --mqtt with a broker running
```

This replays a **synthetic** stream: one person walks into the zone, one stays out,
and a forklift sits in the zone. The output goes to `data/synthetic/` and is kept
separate from the live `data/incidents.jsonl`.

## Tests

```bash
python3 -m pytest -q          # 36 tests: geometry, dedup, adapters, logging, stats, CLI
scripts/validate_project.sh   # tests + evidence-based stage status
```

Passing unit tests only verify the incident-processing component. They say
nothing about the PipeGen pipeline, TensorRT, or live video.

## Example incident record

This record came from the synthetic component test, not from a live detection:

```json
{"event_id":"incident_0001","event_type":"restricted_zone_intrusion","object_class":"person",
 "zone_id":"restricted_zone_1","timestamp":"2026-01-01T00:00:05.100000+00:00","confidence":0.88,
 "alert":true,"track_id":1,"source_id":0,"frame":51,"anchor_point":{"x":0.6187,"y":0.7222},
 "bbox_norm":[0.5823,0.3519,0.6552,0.7222],"dedup_method":"track","input_format":"generic",
 "processed_at":"2026-10-16T15:50:12.874+00:00"}
```

The fields mean:

- `timestamp` is the frame time from the metadata. If the metadata has none, it is
  the processing time.
- `processed_at` is when the processor saw the record.
- `confidence` is `null` when the input schema carries none (for example, the
  DeepStream minimal schema).

## Statistics (`data/stats.json`)

| Field | Meaning |
| --- | --- |
| `total_detections` | Person detections summed over frames. One person seen in 100 frames counts as 100. |
| `current_people` | People in the most recent frame |
| `unique_tracked_people` | Distinct tracker IDs. `null` if the input has no tracking. |
| `incidents_total`, `incidents_by_zone` | Confirmed zone entries written to the log |
| `last_incident_timestamp`, `frames_processed`, `malformed_records` | — |

## Troubleshooting

- **`pipegen: command not found`**: install CraftifAI PipeGen from the developer
  portal. `pip install pipegen` installs an **unrelated** AWS tool.
- **No incidents**: check that `person_labels` matches the model's label text. Run
  `head -3` on the metadata file. Check that the zone covers where feet appear, since
  the anchor is the bottom-center of the box.
- **Too many incidents**: there are probably no track IDs. Enable nvtracker, or
  raise `cooldown_seconds`.
- **`MQTT broker ... unavailable`**: start `mosquitto`. JSONL logging keeps working
  without it.
- **`metadata file never appeared`**: `METADATA_PATH` doesn't match the path the
  pipeline writes to.

## Submission contents

- `src/`: incident processor, zone geometry, adapters, logger, stats, MQTT, and the
  nvdsanalytics zone exporter
- `config/settings.yaml`
- `tests/`
- `scripts/`
- `pipegen_project/`: PipeGen requirement and runbook. **The PipeGen export folder
  goes in `pipegen_project/export/`**; the official rules require it in the repo.
- `docs/project_description.md`: the text for the submission form
  (https://forms.gle/eJyeCKCG2UH757QZ8, deadline 4:00 pm)
- `reports/`: environment reports and evidence
- `docs/`: architecture, demo script, submission checklist

## Known limitations

- The PipeGen, TensorRT, DeepStream and live-run stages have **not been executed**
  yet. See `docs/submission_checklist.md`.
- The format of the generated pipeline's metadata output is unverified. The adapters
  follow the documented contract above and DeepStream's published nvmsgconv minimal
  schema, and may need a field-name tweak.
- Zones are axis-aligned rectangles, and the bottom-center anchor assumes a roughly
  side or oblique camera view. Occlusion of the feet can delay detection.
- Without track IDs, deduplication uses a per-zone cooldown. Two people entering
  within one cooldown window produce a single incident.
