"""Append-only JSON Lines incident log."""
from __future__ import annotations

import json
from pathlib import Path


class EventLogger:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def existing_count(self) -> int:
        """Number of records already in the file (used to continue event numbering)."""
        if not self.path.exists():
            return 0
        with self.path.open("r", encoding="utf-8") as fh:
            return sum(1 for line in fh if line.strip())

    def append(self, record: dict) -> None:
        line = json.dumps(record, separators=(",", ":"), ensure_ascii=False)
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
            fh.flush()

    def read_all(self) -> list[dict]:
        if not self.path.exists():
            return []
        with self.path.open("r", encoding="utf-8") as fh:
            return [json.loads(line) for line in fh if line.strip()]
