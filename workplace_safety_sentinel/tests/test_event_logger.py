import json

from event_logger import EventLogger
from safety_stats import Statistics


def test_creates_missing_directory(tmp_path):
    path = tmp_path / "nested" / "deeper" / "incidents.jsonl"
    EventLogger(path).append({"event_id": "incident_0001"})
    assert path.is_file()


def test_records_are_valid_json_lines(tmp_path):
    path = tmp_path / "incidents.jsonl"
    log = EventLogger(path)
    log.append({"event_id": "incident_0001", "confidence": 0.9, "alert": True})
    for line in path.read_text().splitlines():
        assert json.loads(line)["alert"] is True


def test_multiple_events_appended(tmp_path):
    path = tmp_path / "incidents.jsonl"
    log = EventLogger(path)
    for i in range(3):
        log.append({"event_id": f"incident_{i:04d}"})
    EventLogger(path).append({"event_id": "incident_0003"})  # new logger, same file
    lines = path.read_text().splitlines()
    assert len(lines) == 4
    assert [json.loads(l)["event_id"] for l in lines][-1] == "incident_0003"
    assert EventLogger(path).existing_count() == 4


def test_statistics_counts():
    s = Statistics()
    s.record_frame(2, [None, None])
    s.record_frame(3, [None, None, None])
    assert s.total_detections == 5
    assert s.current_people == 3
    assert s.unique_tracked_people is None  # no tracking -> not reported as 0
    s.record_frame(2, [7, 8])
    s.record_frame(1, [7])
    assert s.unique_tracked_people == 2
    assert s.incidents_total == 0
    s.record_incident("z", "2026-10-16T00:00:00+00:00")
    assert s.incidents_total == 1 and s.last_incident_timestamp.startswith("2026")


def test_statistics_save(tmp_path):
    s = Statistics()
    s.record_frame(1, [1])
    out = tmp_path / "x" / "stats.json"
    s.save(out)
    assert json.loads(out.read_text())["total_detections"] == 1
