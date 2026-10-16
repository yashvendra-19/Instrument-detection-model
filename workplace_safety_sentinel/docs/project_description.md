# Project description (for the PipeGen submission form)

> Fill every `TBD` from the real PipeGen run. Leave it as `TBD` rather than guessing.

**Project:** Workplace Safety Sentinel. "See the danger. Detect the violation.
Trigger the alert."

**Track:** A, PipeGen (Perception). This is the problem statement's suggested
track #1.

**Bonus targeted:** Edge Optimization, if an INT8 engine is built and its trade-off
report is captured: `TBD`. Closed Loop: not targeted.

## Problem
Workers enter hazard zones, such as robot cells, presses, or chemical benches, and
nobody notices until an incident happens. Passive CCTV depends on someone watching
the screen.

## Solution
A PipeGen-generated DeepStream pipeline detects and tracks people on a site
camera. A lightweight incident processor reads PipeGen's JSON/MQTT metadata,
checks each person's ground-contact point against a configurable restricted zone,
and publishes deduplicated intrusion alerts over MQTT and to a JSON incident log.

**Intended users:** EHS officers, plant and lab supervisors, and integrators of
andon/PLC alerting.

## PipeGen pipeline
| Item | Value |
| --- | --- |
| Input | USB camera (`/dev/videoN`) or video file: `TBD` |
| Tasks | person detection, multi-object tracking |
| Model | `TBD` (name/source from the PipeGen catalog; person label = `TBD`) |
| Precision | `TBD` (FP16 planned; INT8 stretch) |
| TensorRT engine | `TBD` (file name, size) |
| Speed (from PipeGen report) | `TBD` FPS / latency, power `TBD`, accuracy `TBD` |
| Outputs | live display; JSON metadata file; MQTT (PipeGen); plus `workplace_safety/alerts` MQTT and `data/incidents.jsonl` (incident processor) |

## Decision logic
- Anchor = bottom-center of the person box, as an approximation of where the feet
  touch the floor.
- Point-in-rectangle test in normalized coordinates (the zone is set in
  `config/settings.yaml`).
- Tracked people: one alert per entry, after 3 consecutive frames inside the zone,
  with a 10 s re-entry cooldown.
- Untracked detections: one alert per zone per 10 s.
- Statistics: detections, current people, unique track IDs, incidents.

## Evidence
- Pipeline IR node graph: `reports/evidence/pipegen/02_pipeline_ir_graph.png`
- TensorRT speed report: `reports/evidence/pipegen/04_speed_report.png`
- Live run: `reports/evidence/pipegen/05_live_run.png`,
  `reports/evidence/pipeline_runs/`
- Incidents: `data/incidents.jsonl`, `data/stats.json`

## Known limitations
Zones are rectangular. A camera looking straight down makes the bottom-center
anchor less meaningful. Without tracking, two people entering within one cooldown
window produce one alert.
