import pytest

from zone_manager import Zone, ZoneError, anchor_point, zones_from_config

ZONE = Zone("z", 0.6, 0.2, 0.95, 0.9)


def test_point_clearly_outside():
    assert not ZONE.contains(0.1, 0.5)
    assert not ZONE.contains(0.8, 0.95)


def test_point_clearly_inside():
    assert ZONE.contains(0.8, 0.5)


def test_point_on_boundary_counts_as_inside():
    assert ZONE.contains(0.6, 0.5)    # left edge
    assert ZONE.contains(0.95, 0.9)   # bottom-right corner
    assert not ZONE.contains(0.5999, 0.5)


@pytest.mark.parametrize("coords", [
    (0.9, 0.2, 0.6, 0.9),     # x_min > x_max
    (0.6, 0.5, 0.95, 0.5),    # zero height
    (-0.1, 0.2, 0.95, 0.9),   # negative
    (0.6, 0.2, 1.5, 0.9),     # > 1
    ("a", 0.2, 0.95, 0.9),    # non-numeric
])
def test_invalid_zone_coordinates_rejected(coords):
    with pytest.raises(ZoneError):
        Zone("bad", *coords)


def test_missing_coordinate_in_config():
    with pytest.raises(ZoneError):
        zones_from_config([{"id": "z", "x_min": 0.1, "y_min": 0.1, "x_max": 0.5}])


def test_bottom_center_anchor_feet_outside_head_inside():
    # Box overlaps the zone's top area but the feet (bottom-center) are below it.
    box = (0.7, 0.5, 0.8, 0.97)
    assert anchor_point(box) == pytest.approx((0.75, 0.97))
    assert not ZONE.contains(*anchor_point(box))
    assert ZONE.contains(*anchor_point(box, "center"))


def test_to_pixels():
    assert ZONE.to_pixels(1920, 1080) == (1152, 216, 1824, 972)
