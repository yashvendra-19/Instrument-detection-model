import copy

import pytest

BASE_CFG = {
    "zones": [{"id": "restricted_zone_1", "x_min": 0.6, "y_min": 0.2, "x_max": 0.95, "y_max": 0.9}],
    "detection": {
        "person_labels": ["person"],
        "person_class_ids": [],
        "min_confidence": 0.4,
        "accept_missing_confidence": True,
        "anchor": "bottom_center",
    },
    "incidents": {"confirm_frames": 3, "cooldown_seconds": 10.0, "track_timeout_seconds": 5.0},
    "input": {"format": "generic", "frame_width": 1000, "frame_height": 1000},
    "mqtt": {"enabled": False},
}


@pytest.fixture
def cfg():
    from config_loader import validate_config
    return validate_config(copy.deepcopy(BASE_CFG))
