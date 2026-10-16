# PipeGen runbook (run on the NVIDIA GPU / Jetson machine)

PipeGen was **not available** in the environment where this repository was
prepared (cloud container: no NVIDIA GPU, no PipeGen, CraftifAI portal
unreachable). Nothing in this folder is generated PipeGen output yet. Follow
these steps on the hackathon machine and keep every generated file.

The exact PipeGen commands are **not** written here on purpose — use the ones
from `pipegen --help` and https://developer.craftifai.com/ for your installed
version. Do not use the unrelated `pipegen` package on PyPI (an AWS CodePipeline
tool by another author).

## 0. Check the machine (2 min)

```bash
cd ~/workplace_safety_sentinel
scripts/check_environment.sh          # saves reports/environment_report_*.txt
```

You need: `nvidia-smi` working, DeepStream (`deepstream-app --version-all`),
TensorRT (`trtexec` or `python3 -c "import tensorrt"`), PipeGen (`pipegen --version`),
and a login to the CraftifAI developer environment.

## 1. Requirement
Feed `pipegen_project/requirement.md` to PipeGen. Save PipeGen's copy or a
screenshot as `reports/evidence/pipegen/01_requirement.*`.

## 2. Pipeline IR
Generate the IR / pipeline graph. Copy the IR file and the graph image to
`reports/evidence/pipegen/02_pipeline_ir.*`. Check it contains: source →
streammux → nvinfer (detector) → nvtracker → OSD → sink, plus a metadata/JSON
(msgconv/msgbroker or file) output.

## 3. Model
Pick a supported pretrained detector **that has a person class**. Open its label
file and set `detection.person_labels` / `person_class_ids` in
`config/settings.yaml` from what it actually says (PeopleNet labels are
`Person;Bag;Face`; COCO models use `person`). Copy the label file to
`reports/evidence/pipegen/03_model_labels.txt`.

## 4. Compiler (TensorRT)
Compile to a TensorRT engine (FP16 where supported). Keep the `*.engine` in the
exported project (it is git-ignored because of its size) and copy the compiler
log and **speed report** to `reports/evidence/pipegen/04_compile.log` and
`reports/evidence/pipegen/04_speed_report.*`.

## 5. Run
Export the generated project into `pipegen_project/export/`. Then run it together
with the incident processor:

```bash
export PIPEGEN_RUN_CMD="<run command from your PipeGen project>"
export METADATA_PATH="<JSONL file the pipeline writes detections to>"
export METADATA_FORMAT=generic          # or deepstream_minimal
scripts/run_pipeline.sh                 # logs -> reports/evidence/pipeline_runs/
```

### Connecting the pipeline's metadata to the incident processor
Use whichever the generated pipeline really supports:

| Pipeline output | How to connect |
| --- | --- |
| JSON lines file (one object per frame) | `METADATA_PATH=<file>`, format `generic` (adapt field names in `src/metadata_adapters.py::parse_generic` if they differ) |
| DeepStream nvmsgconv → nvmsgbroker over MQTT (`libnvds_mqtt_proto.so`), minimal schema | `mosquitto_sub -h <broker> -t <ds-topic> \| python3 src/incident_processor.py --input - --format deepstream_minimal` |
| DeepStream nvmsgconv → file / Kafka | dump to a JSONL file, then `--follow` it |

Inspect 3–4 real lines of the metadata first (`head -3 <file>`) and confirm the
fields before the demo.

### Restricted zone on screen
If the pipeline has (or lets you add) `nvdsanalytics`, generate its ROI config
from `settings.yaml`:

```bash
python3 src/zone_to_nvdsanalytics.py --width 1920 --height 1080
# -> config/config_nvdsanalytics.txt
```

Finally run `scripts/validate_project.sh`. Every stage it reports COMPLETE has a
real artifact behind it.
