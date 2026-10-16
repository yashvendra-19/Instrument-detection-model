# PipeGen Stage 1 — Requirement (draft input)

> This is the requirement text to give PipeGen at Stage 1. It is a **draft**:
> it becomes evidence only once PipeGen has consumed it. Save PipeGen's own copy
> or screenshot to `reports/evidence/pipegen/`.

## Requirement (paste into PipeGen)

Build a real-time workplace-safety perception pipeline called
"Workplace Safety Sentinel" for an NVIDIA GPU / Jetson running DeepStream.

- Input: one live video source — a USB camera (V4L2), an RTSP stream, or a video
  file (H.264 / MP4). The source must be configurable.
- Perception: detect **people** in every frame with a pretrained object detector
  that includes a person class (e.g. a PeopleNet / TrafficCamNet / YOLO-family
  COCO model supported by PipeGen). Confidence threshold about 0.4.
- Tracking: assign a persistent tracking ID to each person (DeepStream nvtracker,
  e.g. NvDCF or IOU) so one person entering a zone is counted once.
- Optimization: compile the detector to a **TensorRT engine** (FP16 if supported,
  otherwise FP32) and produce the PipeGen speed report.
- Visualization: on-screen display of bounding boxes, labels, track IDs, and a
  rectangular restricted zone at normalized coordinates
  x 0.60–0.95, y 0.20–0.90 (pixel ROI at 1920x1080: 1152,216 → 1824,972).
- Output (actionable, beyond boxes): emit per-frame object metadata as JSON —
  for each object: label/class ID, confidence, tracking ID, bounding box
  (left, top, width, height) plus frame number, timestamp and frame size —
  to a JSON-lines file and/or an MQTT topic. A downstream incident processor
  turns this into `restricted_zone_intrusion` events on `workplace_safety/alerts`.
- Target: ≥ 25 FPS at 1080p on the target GPU.
