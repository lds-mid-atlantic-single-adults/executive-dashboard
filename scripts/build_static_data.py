"""Build GitHub Pages-ready dashboard data from the SQL Server extract."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
JS_OUT = DATA_DIR / "council-data.js"
CSV_OUT = DATA_DIR / "masc-sql-source-rows.csv"


NUMERIC_FIELDS = {
    "members",
    "participating",
    "males",
    "females",
    "notParticipating",
    "participatingMales",
    "participatingFemales",
    "sourceParticipationRate",
    "unitPriorityIndex",
    "cityPriorityIndex",
    "milesToCouncilCentroid",
    "cityLatitude",
    "cityLongitude",
}


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def clean_number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def clean_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    return int(float(value))


def normalize_row(row: dict[str, Any]) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    for key, value in row.items():
        if key in NUMERIC_FIELDS:
            normalized[key] = clean_number(value)
        elif key in {"periodYear", "periodQuarter", "periodOrder", "lowParticipationFlag"}:
            normalized[key] = clean_int(value)
        else:
            normalized[key] = clean_text(value)
    return normalized


def unique_sorted(values: list[str]) -> list[str]:
    return sorted(set(values), key=lambda value: value.lower())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", default=str(DATA_DIR / "sql-source-rows.json"))
    args = parser.parse_args()

    raw_path = Path(args.raw)
    payload = json.loads(raw_path.read_text(encoding="utf-8-sig"))
    rows = [normalize_row(row) for row in payload["rows"]]

    periods = sorted(
        {
            (row["periodOrder"], row["period"], row["periodYear"], row["periodQuarter"])
            for row in rows
        }
    )
    period_records = [
        {
            "period": period,
            "periodYear": year,
            "periodQuarter": quarter,
            "periodOrder": order,
        }
        for order, period, year, quarter in periods
    ]

    source_counts = Counter(row["sourceObject"] for row in rows)
    source_objects = [
        {"object": source, "rows": count}
        for source, count in sorted(source_counts.items())
    ]

    metadata = {
        "title": "Mid-Atlantic Singles Council Dashboard",
        "sourceSystem": "Local SQL Server",
        "sourceServer": payload.get("server", "LAPTOP"),
        "sourceDatabase": payload.get("database", "BV"),
        "sourceSchema": "masc",
        "sourceQuery": payload.get("sourceQuery", "scripts/export_sql_server.sql"),
        "sourceObjects": source_objects,
        "exportedAt": payload.get("exportedAt") or datetime.now(timezone.utc).isoformat(),
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "rowCount": len(rows),
        "periods": period_records,
        "baselinePeriod": period_records[0]["period"] if period_records else None,
        "latestPeriod": period_records[-1]["period"] if period_records else None,
        "defaultAgeScope": "26plus",
        "ageScopes": [
            {
                "id": "26plus",
                "label": "26+ adult proxy",
                "description": "Uses 2026 age groups 26-35 and older. 2025 Q3 has no age-group field, so it remains unchanged.",
            },
            {
                "id": "18plus",
                "label": "18+ adult view",
                "description": "Uses 2026 age groups 18-25 and older. 2025 Q3 has no age-group field, so it remains unchanged.",
            },
            {
                "id": "all",
                "label": "All 2026 age groups",
                "description": "Includes the 2026 0-17 age group. This is not the recommended comparison for single-adult review.",
            },
        ],
        "methodology": (
            "The dashboard is built from SQL Server BV.masc tables whose names include "
            "mid-atlantic-singles-council. 2025 Q3 rows are already unit-level. 2026 Q1 "
            "rows are age-group level and are aggregated to unit, stake, and council "
            "inside the dashboard based on the selected age scope. Rates are recomputed "
            "from summed participating and member counts."
        ),
        "caveat": (
            "The available SQL sources are 2025 Q3 and 2026 Q1, so the comparison is a "
            "snapshot-over-snapshot year assessment rather than same-quarter YoY. The "
            "2026 source includes age groups, including 0-17; the default 26+ scope is "
            "the closest available adult proxy, not an exact age >= 28 filter."
        ),
    }

    dashboard_payload = {"metadata": metadata, "rows": rows}

    DATA_DIR.mkdir(exist_ok=True)
    JS_OUT.write_text(
        "window.MASC_DASHBOARD_DATA = "
        + json.dumps(dashboard_payload, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    fieldnames = list(rows[0].keys()) if rows else []
    with CSV_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows):,} source rows to {JS_OUT}")
    print(f"Wrote CSV extract to {CSV_OUT}")


if __name__ == "__main__":
    main()
