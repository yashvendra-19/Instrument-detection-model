# PipeGen Stage 1 — Requirement (draft input)

> This is the text to give PipeGen v0.5.1 at Stage 1. It is a **draft**, and it
> becomes evidence only once PipeGen has consumed it. Save a screenshot to
> `reports/evidence/pipegen/01_requirement.png`.

## Short version (one sentence)

Detect and track people from a USB camera, mark a restricted zone on the
right-hand side of the frame, compile the detector to TensorRT FP16, show live
boxes with track IDs, and publish per-frame detection metadata as JSON and MQTT.

## Full version

Build a real-time workplace-safety perception pipeline called
"Workplace Safety Sentinel".

- Input: the USB camera (V4L2), or for rehearsal a video file stored under /home.
- Task: detect **people** with a pretrained detector that has a person class,
  confidence about 0.4, and **track** each person with a persistent ID.
- Optimization: compile the ONNX detector to a **TensorRT engine** (FP16, with
  INT8 as a stretch goal) and produce the speed report.
- Display: live display with bounding boxes, labels and track IDs. The restricted
  zone is the rectangle at normalized x 0.60–0.95, y 0.20–0.90 (at 1920x1080 that
  is pixels 1152,216 to 1824,972).
- Outputs (actionable): a **JSON metadata file** with one record per frame (frame
  number, timestamp, frame size, and for each object its label/class ID,
  confidence, track ID and bounding box) and the same metadata over **MQTT**.
  A downstream incident processor turns this into `restricted_zone_intrusion`
  alerts on `workplace_safety/alerts`.
- Target: real-time (≥ 25 FPS) on the target GPU.
