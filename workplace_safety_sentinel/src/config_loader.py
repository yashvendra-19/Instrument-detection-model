"""Load and validate config/settings.yaml."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

VALID_ANCHORS = {"bottom_center", "center"}
VALID_FORMATS = {"generic", "deepstream_minimal"}


class ConfigError(ValueError):
    """Raised when settings.yaml is missing or invalid."""


def _require_number(section: dict, key: str, where: str, minimum: float | None = None) -> float:
    if key not in section:
        raise ConfigError(f"{where}.{key} is required")
    value = section[key]
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ConfigError(f"{where}.{key} must be a number, got {value!r}")
    if minimum is not None and value < minimum:
        raise ConfigError(f"{where}.{key} must be >= {minimum}, got {value}")
    return float(value)


def validate_config(cfg: Any) -> dict:
    if not isinstance(cfg, dict):
        raise ConfigError("settings file must contain a YAML mapping")

    zones = cfg.get("zones")
    if not isinstance(zones, list) or not zones:
        raise ConfigError("zones must be a non-empty list")
    seen = set()
    for i, z in enumerate(zones):
        if not isinstance(z, dict) or not z.get("id"):
            raise ConfigError(f"zones[{i}] must be a mapping with an 'id'")
        if z["id"] in seen:
            raise ConfigError(f"duplicate zone id {z['id']!r}")
        seen.add(z["id"])
        # Geometry is validated by zone_manager.Zone itself.

    det = cfg.setdefault("detection", {})
    labels = det.setdefault("person_labels", ["person"])
    class_ids = det.setdefault("person_class_ids", [])
    if not isinstance(labels, list) or not isinstance(class_ids, list):
        raise ConfigError("detection.person_labels and person_class_ids must be lists")
    if not labels and not class_ids:
        raise ConfigError("set detection.person_labels or detection.person_class_ids")
    det.setdefault("min_confidence", 0.4)
    conf = _require_number(det, "min_confidence", "detection", 0.0)
    if conf > 1.0:
        raise ConfigError("detection.min_confidence must be <= 1.0")
    det.setdefault("accept_missing_confidence", True)
    det.setdefault("anchor", "bottom_center")
    if det["anchor"] not in VALID_ANCHORS:
        raise ConfigError(f"detection.anchor must be one of {sorted(VALID_ANCHORS)}")

    inc = cfg.setdefault("incidents", {})
    inc.setdefault("output_path", "data/incidents.jsonl")
    inc.setdefault("stats_path", "data/stats.json")
    inc.setdefault("confirm_frames", 3)
    inc.setdefault("cooldown_seconds", 10.0)
    inc.setdefault("track_timeout_seconds", 5.0)
    if not isinstance(inc["confirm_frames"], int) or inc["confirm_frames"] < 1:
        raise ConfigError("incidents.confirm_frames must be an integer >= 1")
    _require_number(inc, "cooldown_seconds", "incidents", 0.0)
    _require_number(inc, "track_timeout_seconds", "incidents", 0.0)

    inp = cfg.setdefault("input", {})
    inp.setdefault("format", "generic")
    if inp["format"] not in VALID_FORMATS:
        raise ConfigError(f"input.format must be one of {sorted(VALID_FORMATS)}")
    inp.setdefault("frame_width", 1920)
    inp.setdefault("frame_height", 1080)
    _require_number(inp, "frame_width", "input", 1)
    _require_number(inp, "frame_height", "input", 1)

    mq = cfg.setdefault("mqtt", {})
    mq.setdefault("enabled", False)
    mq.setdefault("host", "localhost")
    mq.setdefault("port", 1883)
    mq.setdefault("topic", "workplace_safety/alerts")
    mq.setdefault("qos", 1)
    mq.setdefault("client_id", "workplace-safety-sentinel")
    if mq["qos"] not in (0, 1, 2):
        raise ConfigError("mqtt.qos must be 0, 1 or 2")
    return cfg


def load_config(path: str | Path) -> dict:
    path = Path(path)
    if not path.is_file():
        raise ConfigError(f"settings file not found: {path}")
    try:
        cfg = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        raise ConfigError(f"invalid YAML in {path}: {exc}") from exc
    return validate_config(cfg)
