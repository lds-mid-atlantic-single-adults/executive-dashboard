"""Validate the static dashboard payload before publishing."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "council-data.js"


def age_group_rank(age_group: str | None) -> int:
    ranks = {
        "0-17": 0,
        "18-25": 18,
        "26-35": 26,
        "36-45": 36,
        "46-55": 46,
        "56-65": 56,
        "66-75": 66,
        "76+": 76,
    }
    return ranks.get(str(age_group or "").strip(), 999)


def load_payload() -> dict:
    text = DATA_FILE.read_text(encoding="utf-8-sig")
    match = re.match(r"\s*window\.MASC_DASHBOARD_DATA\s*=\s*(.*);\s*\Z", text, re.S)
    if not match:
        raise AssertionError("data/council-data.js does not expose window.MASC_DASHBOARD_DATA")
    return json.loads(match.group(1))


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    payload = load_payload()
    metadata = payload.get("metadata", {})
    rows = payload.get("rows", [])

    assert_true(rows, "payload has no dashboard rows")
    assert_true(metadata.get("rowCount") == len(rows), "metadata rowCount does not match payload rows")
    assert_true(metadata.get("baselinePeriod"), "baselinePeriod is missing")
    assert_true(metadata.get("latestPeriod"), "latestPeriod is missing")
    assert_true(metadata.get("sourceSystem") == "Local SQL Server", "sourceSystem should be Local SQL Server")

    source_objects = [item.get("object", "") for item in metadata.get("sourceObjects", [])]
    assert_true(source_objects, "metadata sourceObjects is empty")
    assert_true(
        all("mid-atlantic-singles-council" in source.lower() for source in source_objects),
        "not every source object is a Mid-Atlantic Singles Council SQL object",
    )

    under_18_rows = [
        row
        for row in rows
        if row.get("sourceGrain") == "age_group" and age_group_rank(row.get("ageGroup")) < 18
    ]
    assert_true(not under_18_rows, "age_group rows for ages 0-17 are present")

    required_fields = {
        "period",
        "sourceObject",
        "sourceGrain",
        "unitJoinKey",
        "unitName",
        "coordinatingCouncil",
        "stakeOrDistrict",
        "members",
        "participating",
    }
    missing_field_rows = [
        index
        for index, row in enumerate(rows, start=1)
        if any(field not in row for field in required_fields)
    ]
    assert_true(not missing_field_rows, f"rows missing required fields: {missing_field_rows[:5]}")

    invalid_counts = [
        index
        for index, row in enumerate(rows, start=1)
        if row.get("members") is not None
        and row.get("participating") is not None
        and float(row["participating"]) > float(row["members"])
    ]
    assert_true(not invalid_counts, f"participating exceeds members in rows: {invalid_counts[:5]}")

    periods = sorted({row.get("period") for row in rows if row.get("period")})
    councils = sorted({row.get("coordinatingCouncil") for row in rows if row.get("coordinatingCouncil")})
    stakes = sorted({row.get("stakeOrDistrict") for row in rows if row.get("stakeOrDistrict")})

    print("Dashboard data validation passed")
    print(f"Rows: {len(rows):,}")
    print(f"Periods: {', '.join(periods)}")
    print(f"Councils: {len(councils):,}")
    print(f"Stakes/Districts: {len(stakes):,}")
    print("Age rule: no 0-17 age_group rows in dashboard payload")
    print("Dashboard API: window.MASC_DASHBOARD_DATA is ready")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"Dashboard data validation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
