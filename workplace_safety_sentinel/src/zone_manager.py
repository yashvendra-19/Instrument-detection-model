"""Restricted-zone geometry in normalized (0..1) frame coordinates."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


class ZoneError(ValueError):
    """Raised for invalid zone definitions."""


@dataclass(frozen=True)
class Zone:
    id: str
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    name: str = ""

    def __post_init__(self) -> None:
        coords = (self.x_min, self.y_min, self.x_max, self.y_max)
        for c in coords:
            if isinstance(c, bool) or not isinstance(c, (int, float)):
                raise ZoneError(f"zone {self.id!r}: coordinates must be numbers, got {c!r}")
            if not 0.0 <= c <= 1.0:
                raise ZoneError(f"zone {self.id!r}: coordinates must be within [0, 1], got {c}")
        if self.x_min >= self.x_max or self.y_min >= self.y_max:
            raise ZoneError(f"zone {self.id!r}: requires x_min < x_max and y_min < y_max")

    def contains(self, x: float, y: float) -> bool:
        """Point-in-rectangle test. The boundary counts as INSIDE."""
        return self.x_min <= x <= self.x_max and self.y_min <= y <= self.y_max

    def to_pixels(self, width: int, height: int) -> tuple[int, int, int, int]:
        return (
            round(self.x_min * width),
            round(self.y_min * height),
            round(self.x_max * width),
            round(self.y_max * height),
        )


def anchor_point(bbox_norm: tuple[float, float, float, float], anchor: str = "bottom_center") -> tuple[float, float]:
    """Return the reference point of a normalized (x1, y1, x2, y2) box.

    bottom_center approximates where a standing person touches the floor, so a
    person whose head overlaps the zone but whose feet are outside is NOT inside.
    """
    x1, y1, x2, y2 = bbox_norm
    cx = (x1 + x2) / 2.0
    if anchor == "bottom_center":
        return cx, y2
    if anchor == "center":
        return cx, (y1 + y2) / 2.0
    raise ValueError(f"unknown anchor {anchor!r}")


def zones_from_config(zone_cfgs: Iterable[dict]) -> list[Zone]:
    zones = []
    for z in zone_cfgs:
        try:
            zones.append(
                Zone(
                    id=str(z["id"]),
                    name=str(z.get("name", "")),
                    x_min=z["x_min"],
                    y_min=z["y_min"],
                    x_max=z["x_max"],
                    y_max=z["y_max"],
                )
            )
        except KeyError as exc:
            raise ZoneError(f"zone {z.get('id')!r} is missing {exc}") from exc
    return zones
