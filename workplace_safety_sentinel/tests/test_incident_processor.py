import json

import pytest

from config_loader import ConfigError, validate_config
from event_logger import EventLogger
from incident_processor import IncidentProcessor, main
from metadata_adapters import Detection, Frame, MetadataError, parse_line
from zone_manager import zones_from_config

INSIDE = (0.70, 0.40, 0.80, 0.80)    # feet at (0.75, 0.80) -> inside zone
OUTSIDE = (0.10, 0.40, 0.20, 0.80)   # feet at (0.15, 0.80) -> outside


def _ts(sec: float) -> str:
    return f"2026-10-16T12:00:{sec:06.3f}+00:00"


def _proc(cfg, tmp_path):
    return IncidentProcessor(zones_from_config(cfg["zones"]), cfg, EventLogger(tmp_path / "inc.jsonl"))


def _frame(i, dets, t=None):
    return Frame(frame_id=i, timestamp=_ts(i * 0.1 if t is None else t), detections=dets)


def person(box, tid=None, conf=0.9, label="person", class_id=None):
    return Detection(label=label, class_id=class_id, confidence=conf, bbox_norm=box, track_id=tid)


def test_tracked_person_entering_zone_creates_one_incident(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    out = []
    for i in range(5):
        out += p.process_frame(_frame(i, [person(OUTSIDE, tid=1)]))
    assert out == []
    for i in range(5, 30):  # stays inside for 25 frames
        out += p.process_frame(_frame(i, [person(INSIDE, tid=1)]))
    assert len(out) == 1
    rec = out[0]
    assert rec["event_type"] == "restricted_zone_intrusion"
    assert rec["zone_id"] == "restricted_zone_1"
    assert rec["track_id"] == 1 and rec["confidence"] == 0.9
    assert rec["frame"] == 7  # confirmed on 3rd consecutive inside frame
    assert p.stats.incidents_total == 1
    assert p.stats.total_detections == 30


def test_object_outside_zone_no_alert(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    for i in range(20):
        assert p.process_frame(_frame(i, [person(OUTSIDE, tid=2), person(OUTSIDE)])) == []
    assert p.stats.incidents_total == 0
    assert not (tmp_path / "inc.jsonl").exists() or (tmp_path / "inc.jsonl").read_text() == ""


def test_non_person_in_zone_no_alert(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    for i in range(10):
        assert p.process_frame(_frame(i, [person(INSIDE, tid=3, label="forklift")])) == []
    assert p.stats.total_detections == 0


def test_low_confidence_ignored(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    for i in range(10):
        assert p.process_frame(_frame(i, [person(INSIDE, tid=4, conf=0.1)])) == []


def test_class_id_match(cfg, tmp_path):
    cfg["detection"]["person_labels"] = []
    cfg["detection"]["person_class_ids"] = [2]
    p = _proc(cfg, tmp_path)
    out = []
    for i in range(5):
        out += p.process_frame(_frame(i, [person(INSIDE, tid=1, label=None, class_id=2)]))
    assert len(out) == 1


def test_untracked_duplicates_suppressed_by_cooldown(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    out = []
    for i in range(50):  # 5 seconds of frames at 10 fps, no track IDs
        out += p.process_frame(_frame(i, [person(INSIDE)]))
    assert len(out) == 1 and out[0]["dedup_method"] == "zone_cooldown"
    out += p.process_frame(_frame(0, [person(INSIDE)], t=11.0))  # after 10 s cooldown
    assert len(out) == 2


def test_boundary_flicker_does_not_spam(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    out = []
    i = 0
    for _ in range(5):  # in 3 frames, out 1 frame, repeatedly, within cooldown
        for box in (INSIDE, INSIDE, INSIDE, OUTSIDE):
            out += p.process_frame(_frame(i, [person(box, tid=9)]))
            i += 1
    assert len(out) == 1


def test_reentry_after_cooldown_is_new_incident(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    out = []
    for i in range(5):
        out += p.process_frame(_frame(i, [person(INSIDE, tid=5)]))
    out += p.process_frame(_frame(0, [person(OUTSIDE, tid=5)], t=3.0))
    for k in range(3):
        out += p.process_frame(_frame(0, [person(INSIDE, tid=5)], t=20.0 + k * 0.1))
    assert len(out) == 2


def test_two_people_tracked_independently(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    out = []
    for i in range(5):
        out += p.process_frame(_frame(i, [person(INSIDE, tid=1), person(INSIDE, tid=2)]))
    assert sorted(r["track_id"] for r in out) == [1, 2]
    assert p.stats.unique_tracked_people == 2
    assert p.stats.current_people == 2


def test_missing_optional_metadata_is_safe(cfg, tmp_path):
    p = _proc(cfg, tmp_path)
    frame = Frame(frame_id=None, timestamp=None,
                  detections=[Detection(label="person", class_id=None, confidence=None, bbox_norm=INSIDE)])
    out = p.process_frame(frame)
    assert len(out) == 1
    assert out[0]["confidence"] is None and out[0]["track_id"] is None
    assert out[0]["timestamp"]  # filled with processing time


def test_event_ids_continue_across_runs(cfg, tmp_path):
    for _ in range(2):
        p = _proc(cfg, tmp_path)
        p.process_frame(_frame(0, [person(INSIDE)]))
    ids = [json.loads(l)["event_id"] for l in (tmp_path / "inc.jsonl").read_text().splitlines()]
    assert ids == ["incident_0001", "incident_0002"]


# --- adapters ------------------------------------------------------------

def test_parse_generic_pixel_bbox():
    line = json.dumps({"frame": 1, "width": 1000, "height": 500, "objects": [
        {"label": "person", "confidence": 0.8, "track_id": 4,
         "bbox": {"left": 600, "top": 100, "width": 100, "height": 300}}]})
    f = parse_line(line, "generic", 0, 0)
    d = f.detections[0]
    assert d.bbox_norm == pytest.approx((0.6, 0.2, 0.7, 0.8))
    assert d.track_id == 4


def test_parse_generic_skips_bad_objects_keeps_good():
    line = json.dumps({"width": 100, "height": 100, "objects": [
        "junk", {"label": "person"}, {"label": "person", "bbox_norm": [0.1, 0.1, 0.2, 0.2]}]})
    assert len(parse_line(line, "generic", 0, 0).detections) == 1


def test_parse_deepstream_minimal():
    line = json.dumps({"version": "4.0", "id": "12", "@timestamp": "2026-10-16T12:00:00.000Z",
                       "sensorId": "cam0",
                       "objects": ["3|1200|300|1350|720|Person", "18446744073709551615|0|0|10|10|Person", "bad"]})
    f = parse_line(line, "deepstream_minimal", 1920, 1080)
    assert len(f.detections) == 2
    assert f.detections[0].track_id == 3 and f.detections[0].label == "Person"
    assert f.detections[1].track_id is None
    assert f.detections[0].bbox_norm[3] == pytest.approx(720 / 1080)


@pytest.mark.parametrize("line", ["{not json", "[1,2]", json.dumps({"objects": "x"})])
def test_malformed_records_raise_metadata_error(line):
    with pytest.raises(MetadataError):
        parse_line(line, "generic", 100, 100)


def test_cli_end_to_end_with_malformed_line(tmp_path, cfg):
    meta = tmp_path / "meta.jsonl"
    rows = ["{broken"]
    for i in range(6):
        rows.append(json.dumps({"frame": i, "timestamp": _ts(i * 0.1), "width": 1000, "height": 1000,
                                "objects": [{"label": "person", "confidence": 0.77, "track_id": 1,
                                             "bbox_norm": list(INSIDE)}]}))
    meta.write_text("\n".join(rows) + "\n")
    out, stats = tmp_path / "o" / "inc.jsonl", tmp_path / "o" / "stats.json"
    assert main(["--input", str(meta), "--output", str(out), "--stats", str(stats)]) == 0
    assert len(out.read_text().splitlines()) == 1
    s = json.loads(stats.read_text())
    assert s["malformed_records"] == 1 and s["frames_processed"] == 6 and s["incidents_total"] == 1


def test_cli_missing_input_file_fails_gracefully(tmp_path):
    assert main(["--input", str(tmp_path / "nope.jsonl"), "--output", str(tmp_path / "i.jsonl"),
                 "--stats", str(tmp_path / "s.json")]) == 1


def test_config_validation(cfg):
    bad = dict(cfg, detection=dict(cfg["detection"], anchor="top"))
    with pytest.raises(ConfigError):
        validate_config(bad)
    with pytest.raises(ConfigError):
        validate_config(dict(cfg, zones=[]))
