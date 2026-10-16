# Demo script (~2 minutes)

> Only show what has really been run. If a step has not been run on the GPU
> machine, say so. Say whether the input is a **video file** or a **live camera**.

**0:00 – Problem (15 s)**
"People walk into robot cells and press lines unnoticed. CCTV is passive, and
nobody watches every screen. Workplace Safety Sentinel sees the danger, detects
the violation, and triggers the alert."

**0:15 – PipeGen pipeline (35 s)**
- Show `pipegen_project/requirement.md`, the requirement fed to PipeGen.
- Show the generated **Pipeline IR graph** (`reports/evidence/pipegen/02_pipeline_ir.*`):
  source → nvinfer → nvtracker → OSD → metadata out.
- Name the model and its person label (`reports/evidence/pipegen/03_model_labels.txt`).
- Show the **TensorRT compile** result and the **speed report**
  (mandatory evidence: these screenshots)
  (`reports/evidence/pipegen/04_*`). Read out the precision and FPS from the report.

**0:50 – Live run (35 s)**
```bash
cd ~/workplace_safety_sentinel
mosquitto_sub -t workplace_safety/alerts -v &        # terminal 2
export METADATA_PATH="<JSON metadata file from the generated app>"
SENTINEL_MQTT=1 scripts/run_pipeline.sh     # runs PipeGen's generated run.sh
```
Point out the boxes, the track IDs, and the restricted zone. When a person's feet
cross into the zone, the console prints `ALERT incident_000N`, and the MQTT
subscriber receives the JSON.

**1:25 – Actionable output (20 s)**
```bash
tail -n 3 data/incidents.jsonl | python3 -m json.tool --json-lines
cat data/stats.json
```
Explain the difference between detections, unique tracked people, and incidents.

**1:45 – Engineering honesty and next steps (15 s)**
- Run `python3 -m pytest -q`: 36 tests cover the zone geometry, dedup, and logging.
- Run `scripts/validate_project.sh`: it reports each stage's status from real artifacts.
- Next steps: polygon zones, PPE detection (helmet and vest), and a PLC or e-stop
  output over MQTT.

### Fallback if the footage has no zone entry
Move the zone in `config/settings.yaml` so it covers a walkway in the video, then
rerun. Alternatively, run `scripts/run_synthetic_demo.sh` and state clearly that it
is a **synthetic** metadata replay that exercises the incident logic only.
