"""Run statistics. Detections, tracked people and incidents are counted separately:

* total_detections  - person detections summed over all frames (one person seen
                      in 100 frames = 100 detections)
* unique_tracked_people - distinct tracker IDs (None when the input has no tracking)
* incidents_total   - confirmed restricted-zone entries written to the log
"""
from __future__ import annotations

import json
from pathlib import Path


class Statistics:
    def __init__(self) -> None:
        self.frames_processed = 0
        self.total_detections = 0
        self.current_people = 0
        self.incidents_total = 0
        self.incidents_by_zone: dict[str, int] = {}
        self.last_incident_timestamp: str | None = None
        self.malformed_records = 0
        self._track_ids: set = set()
        self._tracking_seen = False

    def record_frame(self, person_count: int, track_ids: list) -> None:
        self.frames_processed += 1
        self.total_detections += person_count
        self.current_people = person_count
        for tid in track_ids:
            if tid is not None:
                self._tracking_seen = True
                self._track_ids.add(tid)

    def record_incident(self, zone_id: str, timestamp: str) -> None:
        self.incidents_total += 1
        self.incidents_by_zone[zone_id] = self.incidents_by_zone.get(zone_id, 0) + 1
        self.last_incident_timestamp = timestamp

    def record_malformed(self) -> None:
        self.malformed_records += 1

    @property
    def unique_tracked_people(self) -> int | None:
        return len(self._track_ids) if self._tracking_seen else None

    def as_dict(self) -> dict:
        return {
            "frames_processed": self.frames_processed,
            "total_detections": self.total_detections,
            "current_people": self.current_people,
            "unique_tracked_people": self.unique_tracked_people,
            "incidents_total": self.incidents_total,
            "incidents_by_zone": dict(self.incidents_by_zone),
            "last_incident_timestamp": self.last_incident_timestamp,
            "malformed_records": self.malformed_records,
        }

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(self.as_dict(), indent=2))
        tmp.replace(path)
