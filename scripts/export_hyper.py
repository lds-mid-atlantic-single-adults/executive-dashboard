"""Export the Tableau Hyper extract to static dashboard data files.

The dashboard itself does not depend on Tableau or the Hyper API at runtime.
This script is only needed when refreshing the open data files from a newer
`.hyper` extract.
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / ".vendor"
if VENDOR.exists():
    sys.path.insert(0, str(VENDOR))

try:
    from tableauhyperapi import Connection, HyperProcess, TableName, Telemetry
except ImportError as exc:  # pragma: no cover - human setup path
    raise SystemExit(
        "Missing tableauhyperapi. Install it with:\n"
        "  python -m pip install --target .vendor tableauhyperapi"
    ) from exc


SOURCE = ROOT / "USNE - SA participation - 03 Nov 2025.hyper"
DATA_DIR = ROOT / "data"
CSV_OUT = DATA_DIR / "usne-sa-participation.csv"
JS_OUT = DATA_DIR / "council-data.js"
LOG_DIR = ROOT / ".hyper-logs"


def iso_date(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        return f"{value.year:04d}-{value.month:02d}-{value.day:02d}"
    text = str(value)
    return text[:10] if text else None


def as_int(value: Any) -> int | None:
    return None if value is None else int(value)


def as_float(value: Any) -> float | None:
    return None if value is None else float(value)


def normalized_row(row: list[Any]) -> dict[str, Any]:
    return {
        "coordinatingCouncil": row[0],
        "stakeOrDistrict": row[1],
        "state": row[2],
        "city": row[3],
        "unitName": row[4],
        "members": as_int(row[5]),
        "participating": as_int(row[6]),
        "participationRate": as_float(row[7]),
        "date": iso_date(row[8]),
    }


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source Hyper extract not found: {SOURCE}")

    DATA_DIR.mkdir(exist_ok=True)
    LOG_DIR.mkdir(exist_ok=True)

    query = """
        SELECT
            "Coordinating Council",
            "Stake or District",
            "State",
            "City",
            "Unit Name",
            "Member",
            "Participating",
            "%",
            "Date"
        FROM "Extract"."Extract"
        ORDER BY
            "Coordinating Council",
            "Stake or District",
            "Unit Name"
    """

    with HyperProcess(
        Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU,
        parameters={"log_dir": str(LOG_DIR)},
    ) as hyper:
        with Connection(endpoint=hyper.endpoint, database=str(SOURCE)) as conn:
            rows = [normalized_row(list(row)) for row in conn.execute_query(query)]

    dates = sorted({row["date"] for row in rows if row["date"]})
    members = sum(row["members"] or 0 for row in rows)
    participating = sum(row["participating"] or 0 for row in rows)
    missing_counts = sum(
        1 for row in rows if row["members"] is None or row["participating"] is None
    )

    payload = {
        "metadata": {
            "title": "Mid-Atlantic Singles Council Dashboard",
            "sourceExtract": SOURCE.name,
            "sourceExtractLastModified": datetime.fromtimestamp(
                SOURCE.stat().st_mtime, tz=timezone.utc
            ).isoformat(),
            "exportedAt": datetime.now(timezone.utc).isoformat(),
            "sourceDataDateMin": dates[0] if dates else None,
            "sourceDataDateMax": dates[-1] if dates else None,
            "rowCount": len(rows),
            "rowsWithMissingCounts": missing_counts,
            "totalMembers": members,
            "totalParticipating": participating,
            "availableFields": [
                "Coordinating Council",
                "Stake or District",
                "State",
                "City",
                "Unit Name",
                "Member",
                "Participating",
                "%",
                "Date",
            ],
            "methodology": (
                "Participation rates are recomputed from summed participating "
                "and member counts at each aggregation level. Rows with missing "
                "member or participating counts are retained in unit counts but "
                "contribute zero to member and participation totals."
            ),
            "caveat": (
                "This extract is unit-level aggregate participation data. It does "
                "not include the future SOP fields for exact age, sex, unit zip "
                "code, participating males, or participating females."
            ),
        },
        "rows": rows,
    }

    with CSV_OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    JS_OUT.write_text(
        "window.MASC_DASHBOARD_DATA = "
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    print(f"Exported {len(rows):,} rows to {CSV_OUT}")
    print(f"Wrote dashboard data to {JS_OUT}")


if __name__ == "__main__":
    main()
