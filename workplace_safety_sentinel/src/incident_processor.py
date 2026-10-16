#!/usr/bin/env python3
"""Workplace Safety Sentinel - incident processor.

Consumes per-frame detection metadata produced by the PipeGen/DeepStream
perception pipeline, decides whether a detected person has entered a
restricted zone, and emits incident records (JSONL, optional MQTT).

This module does NO inference. Perception is done by the PipeGen pipeline.
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable, Iterator, Optional

from config_loader import ConfigError, load_config
from event_logger import EventLogger
from metadata_adapters import Detection, Frame, MetadataError, parse_line
from safety_stats import Statistics
from zone_manager import Zone, ZoneError, anchor_point, zones_from_config

log = logging.getLogger("sentinel")

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _to_epoch(ts: Optional[str]) -> Optional[float]:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


class _TrackZoneState:
    __slots__ = ("consecutive_inside", "confirmed", "last_seen", "last_incident")

    def __init__(self) -> None:
        self.consecutive_inside = 0
        self.confirmed = False
        self.last_seen = 0.0
        self.last_incident: Optional[float] = None


class IncidentProcessor:
    def __init__(
        self,
        zones: list[Zone],
        cfg: dict,
        logger: EventLogger,
        stats: Optional[Statistics] = None,
        publisher=None,
        input_format: str = "generic",
        clock: Callable[[], float] = time.time,
    ):
        self.zones = zones
        det = cfg["detection"]
        inc = cfg["incidents"]
        self.person_labels = {str(l).lower() for l in det.get("person_labels", [])}
        self.person_class_ids = {int(c) for c in det.get("person_class_ids", [])}
        self.min_conf = float(det["min_confidence"])
        self.accept_missing_conf = bool(det["accept_missing_confidence"])
        self.anchor = det["anchor"]
        self.confirm_frames = int(inc["confirm_frames"])
        self.cooldown = float(inc["cooldown_seconds"])
        self.track_timeout = float(inc["track_timeout_seconds"])
        self.logger = logger
        self.stats = stats or Statistics()
        self.publisher = publisher
        self.input_format = input_format
        self.clock = clock
        self._seq = logger.existing_count()
        self._tracks: dict[tuple, _TrackZoneState] = {}
        self._zone_last_incident: dict[tuple, float] = {}

    # -- classification -------------------------------------------------
    def is_person(self, d: Detection) -> bool:
        label_ok = d.label is not None and str(d.label).lower() in self.person_labels
        class_ok = d.class_id is not None and d.class_id in self.person_class_ids
        if not (label_ok or class_ok):
            return False
        if d.confidence is None:
            return self.accept_missing_conf
        return d.confidence >= self.min_conf

    # -- main entry -----------------------------------------------------
    def process_frame(self, frame: Frame) -> list[dict]:
        ts_iso = frame.timestamp or utc_now_iso()
        now = _to_epoch(frame.timestamp)
        if now is None:
            now = self.clock()

        people = [d for d in frame.detections if self.is_person(d)]
        self.stats.record_frame(len(people), [d.track_id for d in people])

        incidents = []
        for d in people:
            px, py = anchor_point(d.bbox_norm, self.anchor)
            for zone in self.zones:
                inside = zone.contains(px, py)
                if d.track_id is not None:
                    fire = self._update_tracked(frame.source_id, d.track_id, zone.id, inside, now)
                    method = "track"
                else:
                    fire = inside and self._zone_cooldown_ok(frame.source_id, zone.id, now)
                    method = "zone_cooldown"
                if fire:
                    incidents.append(self._emit(frame, d, zone, (px, py), ts_iso, method))

        self._expire_tracks(now)
        return incidents

    # -- dedup strategies ----------------------------------------------
    def _update_tracked(self, source, track_id, zone_id, inside: bool, now: float) -> bool:
        key = (source, track_id, zone_id)
        st = self._tracks.get(key)
        if st is None:
            st = self._tracks[key] = _TrackZoneState()
        st.last_seen = now
        if not inside:
            st.consecutive_inside = 0
            st.confirmed = False  # left the zone: a later re-entry is a new incident
            return False
        st.consecutive_inside += 1
        if st.confirmed or st.consecutive_inside < self.confirm_frames:
            return False
        st.confirmed = True
        if st.last_incident is not None and now - st.last_incident < self.cooldown:
            return False  # boundary flicker: same person re-entering within cooldown
        st.last_incident = now
        return True

    def _zone_cooldown_ok(self, source, zone_id, now: float) -> bool:
        key = (source, zone_id)
        last = self._zone_last_incident.get(key)
        if last is not None and now - last < self.cooldown:
            return False
        self._zone_last_incident[key] = now
        return True

    def _expire_tracks(self, now: float) -> None:
        stale = [k for k, s in self._tracks.items()
                 if now - s.last_seen > self.track_timeout
                 and (s.last_incident is None or now - s.last_incident > self.cooldown)]
        for k in stale:
            del self._tracks[k]

    # -- output ---------------------------------------------------------
    def _emit(self, frame: Frame, d: Detection, zone: Zone, pt, ts_iso: str, method: str) -> dict:
        self._seq += 1
        record = {
            "event_id": f"incident_{self._seq:04d}",
            "event_type": "restricted_zone_intrusion",
            "object_class": "person",
            "zone_id": zone.id,
            "timestamp": ts_iso,
            "confidence": None if d.confidence is None else round(d.confidence, 4),
            "alert": True,
            "track_id": d.track_id,
            "source_id": frame.source_id,
            "frame": frame.frame_id,
            "anchor_point": {"x": round(pt[0], 4), "y": round(pt[1], 4)},
            "bbox_norm": [round(v, 4) for v in d.bbox_norm],
            "dedup_method": method,
            "input_format": self.input_format,
            "processed_at": utc_now_iso(),
        }
        self.logger.append(record)
        self.stats.record_incident(zone.id, ts_iso)
        if self.publisher is not None:
            self.publisher.publish(record)
        log.warning("ALERT %s: person%s entered %s (conf=%s)",
                    record["event_id"],
                    f" track {d.track_id}" if d.track_id is not None else "",
                    zone.id, record["confidence"])
        return record

    def process_lines(self, lines: Iterable[str], fmt: str, frame_w: float, frame_h: float,
                      stats_path: Optional[Path] = None, stats_every: int = 30) -> None:
        for n, line in enumerate(lines, 1):
            try:
                frame = parse_line(line, fmt, frame_w, frame_h)
            except MetadataError as exc:
                self.stats.record_malformed()
                log.warning("skipping malformed record #%d: %s", n, exc)
                continue
            if frame is None:
                continue
            self.process_frame(frame)
            if stats_path and self.stats.frames_processed % stats_every == 0:
                self.stats.save(stats_path)
        if stats_path:
            self.stats.save(stats_path)


def follow_file(path: Path, idle_exit: Optional[float]) -> Iterator[str]:
    """Yield lines from a file that another process is still writing (tail -f)."""
    waited = 0.0
    while not path.exists():
        if idle_exit is not None and waited >= idle_exit:
            raise FileNotFoundError(f"metadata file never appeared: {path}")
        if waited == 0.0:
            log.info("waiting for %s to be created by the pipeline ...", path)
        time.sleep(0.5)
        waited += 0.5
    with path.open("r", encoding="utf-8") as fh:
        buf, idle = "", 0.0
        while True:
            chunk = fh.readline()
            if chunk:
                idle = 0.0
                buf += chunk
                if buf.endswith("\n"):
                    yield buf
                    buf = ""
                continue
            if idle_exit is not None and idle >= idle_exit:
                if buf:
                    yield buf
                return
            time.sleep(0.2)
            idle += 0.2


def _resolve(p: str) -> Path:
    path = Path(p)
    return path if path.is_absolute() else PROJECT_ROOT / path


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Workplace Safety Sentinel incident processor")
    ap.add_argument("--config", default=str(PROJECT_ROOT / "config" / "settings.yaml"))
    ap.add_argument("--input", required=True, help="metadata JSONL file, or '-' for stdin")
    ap.add_argument("--format", choices=["generic", "deepstream_minimal"], help="overrides input.format")
    ap.add_argument("--output", help="overrides incidents.output_path")
    ap.add_argument("--stats", help="overrides incidents.stats_path")
    ap.add_argument("--follow", action="store_true", help="keep reading as the pipeline appends")
    ap.add_argument("--idle-exit", type=float, default=None,
                    help="with --follow: stop after this many seconds without new data")
    ap.add_argument("--mqtt", action="store_true", help="enable MQTT even if disabled in settings")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        cfg = load_config(args.config)
        zones = zones_from_config(cfg["zones"])
    except (ConfigError, ZoneError) as exc:
        log.error("configuration error: %s", exc)
        return 2

    fmt = args.format or cfg["input"]["format"]
    out_path = _resolve(args.output or cfg["incidents"]["output_path"])
    stats_path = _resolve(args.stats or cfg["incidents"]["stats_path"])

    publisher = None
    mq = cfg["mqtt"]
    if args.mqtt or mq["enabled"]:
        from mqtt_publisher import MqttPublisher
        publisher = MqttPublisher(mq["host"], mq["port"], mq["topic"], mq["qos"], mq["client_id"])

    proc = IncidentProcessor(zones, cfg, EventLogger(out_path), Statistics(), publisher, fmt)
    log.info("zones: %s | format: %s | incidents -> %s", [z.id for z in zones], fmt, out_path)

    try:
        if args.input == "-":
            lines: Iterable[str] = sys.stdin
        else:
            in_path = Path(args.input)
            if args.follow:
                lines = follow_file(in_path, args.idle_exit)
            else:
                if not in_path.is_file():
                    log.error("metadata file not found: %s", in_path)
                    return 1
                lines = in_path.open("r", encoding="utf-8")
        proc.process_lines(lines, fmt, cfg["input"]["frame_width"], cfg["input"]["frame_height"], stats_path)
    except FileNotFoundError as exc:
        log.error("%s", exc)
        return 1
    except KeyboardInterrupt:
        log.info("interrupted")
        proc.stats.save(stats_path)
    finally:
        if publisher is not None:
            publisher.close()

    s = proc.stats.as_dict()
    log.info("done: %d frames, %d person detections, %d incidents, %s unique tracks, %d malformed",
             s["frames_processed"], s["total_detections"], s["incidents_total"],
             s["unique_tracked_people"], s["malformed_records"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
