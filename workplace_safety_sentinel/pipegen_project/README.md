# PipeGen runbook (run on the NVIDIA GPU / Jetson machine)

Official requirements come from *Embedded SF: CraftifAI Physical AI Hackathon:
Official Problem Statement*, Track A. This project is the problem statement's
**suggested track #1, "Workplace Safety Sentinel"**: person detection plus zone
checks on a site camera, with alerts published over MQTT and a JSON incident log.

PipeGen was **not available** in the environment where this repository was
prepared (a cloud container with no NVIDIA GPU, no PipeGen, and no access to the
CraftifAI portal). Nothing in this folder is PipeGen output yet. Use the commands
and screens from the **PipeGen v0.5.1 Lab** for every step below. This runbook
only says *what* to produce and *where to save it*. Do not use the unrelated
`pipegen` package on PyPI, which is an AWS CodePipeline tool by another author.

## 0. Setup (official checklist)

- Download PipeGen **v0.5.1** from https://developer.craftifai.com/dashboard?tab=downloads
  and sign in with your CraftifAI account.
- Confirm that `pipegen --version` prints `0.5.1`.
- Use an x86-64 Linux PC with an NVIDIA GPU, or a Jetson on **JetPack 6**, in an
  **X11** desktop session (`echo $XDG_SESSION_TYPE` should print `x11`).
- Plug in the kit's USB camera. Keep any videos **under `/home`**.

```bash
cd ~/workplace_safety_sentinel
scripts/check_environment.sh          # prints PASS/FAIL against the checklist above
```

## 1. Requirement
Give PipeGen the sentence/paragraph in `pipegen_project/requirement.md`. Take a
screenshot and save it as `reports/evidence/pipegen/01_requirement.png`.

## 2. Pipeline IR
Review the generated IR. It should contain: source (USB camera or file) →
detector → tracker → OSD/display → **JSON metadata output** and **MQTT output**.
**Screenshot the Pipeline IR node graph** (this is mandatory evidence) and save it
as `reports/evidence/pipegen/02_pipeline_ir_graph.png`. Also save the IR file if
PipeGen exports one.

## 3. Model
Choose a model from the CraftifAI catalog, or use Deep Search, as long as it has a
**person** class. Open its label file and set `detection.person_labels` /
`person_class_ids` in `config/settings.yaml` exactly as the file names the class.
Copy the label file to `reports/evidence/pipegen/03_model_labels.txt`.

## 4. Compiler (TensorRT)
Compile the ONNX model to a TensorRT engine. **FP16** is the safe default.
**INT8** earns the *Edge Optimization* bonus, but only if you report the
speed/power/accuracy trade-off from PipeGen's reports. **Screenshot the TensorRT
speed report** (mandatory evidence) and save it as
`reports/evidence/pipegen/04_speed_report.png`, plus any exported text/JSON.
Engine files (`*.engine`) are git-ignored because of their size.

## 5. Run
Export the PipeGen project into **`pipegen_project/export/`**. It must be part of
the submitted repository. PipeGen generates a DeepStream app with a `run.sh`.

```bash
export METADATA_PATH="<JSON metadata file the generated app writes>"
scripts/run_pipeline.sh       # finds export/**/run.sh; logs -> reports/evidence/pipeline_runs/
```

Screenshot the live display with boxes and track IDs, and save it as
`reports/evidence/pipegen/05_live_run.png`. Say whether the input was the USB
camera or a video file.

### Connecting PipeGen's outputs to the incident processor
PipeGen natively outputs **JSON metadata files** and **MQTT**. Before the demo,
look at 3 real lines:

```bash
head -3 "$METADATA_PATH"        # or: mosquitto_sub -h <broker> -t '<pipegen topic>' -C 3
```

| What the lines look like | What to do |
| --- | --- |
| One JSON per frame with objects (label, confidence, bbox, track id) | Use `--format generic`, and adjust key names in `src/metadata_adapters.py::parse_generic` if needed |
| DeepStream nvmsgconv minimal (`"objects": ["id\|l\|t\|r\|b\|label"]`) | Use `--format deepstream_minimal` |
| PipeGen MQTT topic | Run `mosquitto_sub -h <broker> -t '<topic>' \| python3 src/incident_processor.py --input - --format <fmt>` |

The incident processor republishes **only confirmed intrusions** to
`workplace_safety/alerts` and to `data/incidents.jsonl`.

### Restricted zone on screen (optional)
If the generated app has, or lets you add, `nvdsanalytics`, run
`python3 src/zone_to_nvdsanalytics.py --width <W> --height <H>`. The output goes
to `config/config_nvdsanalytics.txt`.

### Closed Loop bonus (optional, needs Track B)
An ESP32 built with FirmGen can subscribe to `workplace_safety/alerts` and drive a
buzzer or light. To qualify, the MQTT bridge has to be written into the FirmGen PRD
as a requirement.

Finally, run `scripts/validate_project.sh`.
