"""Load Mid-Atlantic Singles Council CSV survey files into STG.

This script normalizes the known participation-style columns when present and
preserves source lineage for every row. It uses pyodbc when available:

    python etl/masc_csv_to_stg.py --server LAPTOP --database BV --file "C:\\path\\survey.csv" --period "2026 Q1"
"""

from __future__ import annotations

import argparse
import csv
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FIELD_MAP = {
    "period": ["period"],
    "age_group": ["Age Group", "ageGroup", "Age"],
    "unit_join_key": ["unitJoinKey"],
    "unit_code": ["Unit_Code", "Unit Code", "Unit"],
    "unit_zip_code": ["Unit_Zip_Code", "Unit Zip Code"],
    "unit_name": ["Unit Name", "Unit_Name", "Ward", "Branch"],
    "coordinating_council": ["Coordinating Council", "Coordinating_Council"],
    "stake_or_district": ["Stake or District", "Stake_or_District", "Stake"],
    "state": ["State"],
    "city": ["City"],
    "snapshot_date": ["Snapshot_Date", "Date", "snapshotDate"],
    "members": ["Members", "Member", "members"],
    "participating": ["Participating", "participating"],
    "males": ["Males", "males"],
    "females": ["Females", "females"],
    "not_participating": ["Not_Participating", "Not Participating"],
    "participating_males": ["Participating_Males", "Participating Males"],
    "participating_females": ["Participating_Females", "Participating Females"],
    "source_participation_rate": ["age_group_participation_rate", "unit_participation_rate", "sourceParticipationRate"],
    "low_participation_flag": ["low_participation_flag", "lowParticipationFlag"],
    "unit_priority_index": ["unit_priority_index_0to1", "unitPriorityIndex"],
    "city_priority_index": ["city_priority_index_0to1", "cityPriorityIndex"],
    "isolation_vs_performance": ["isolation_vs_perf_quadrant", "isolationVsPerformance"],
    "stake_distance_tier": ["stake_distance_tier", "stakeDistanceTier"],
    "council_distance_tier": ["council_distance_tier", "councilDistanceTier"],
    "miles_to_council_centroid": ["Miles_to_CC_Centroid", "milesToCouncilCentroid"],
    "city_latitude": ["City Latitude", "City_Latitude", "cityLatitude"],
    "city_longitude": ["City Longitude", "City_Longitude", "cityLongitude"],
}

NUMERIC_FIELDS = {
    "members",
    "participating",
    "males",
    "females",
    "not_participating",
    "participating_males",
    "participating_females",
    "source_participation_rate",
    "unit_priority_index",
    "city_priority_index",
    "miles_to_council_centroid",
    "city_latitude",
    "city_longitude",
}


def first_value(row: dict[str, Any], candidates: list[str]) -> str | None:
    lower_map = {key.lower().strip(): value for key, value in row.items()}
    for candidate in candidates:
        value = row.get(candidate)
        if value is None:
            value = lower_map.get(candidate.lower())
        if value not in (None, ""):
            return str(value).strip()
    return None


def as_number(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None


def normalize_row(row: dict[str, Any], args: argparse.Namespace, row_number: int) -> dict[str, Any]:
    normalized: dict[str, Any] = {
        "load_dts": datetime.now(timezone.utc).isoformat(),
        "record_source": Path(args.file).name,
        "source_system": args.source_system,
        "source_file_path": str(Path(args.file).resolve()),
        "source_row_number": row_number,
        "period": args.period,
        "period_year": args.period_year,
        "period_quarter": args.period_quarter,
        "source_grain": args.source_grain,
    }
    for target, candidates in FIELD_MAP.items():
        if target in normalized and normalized[target] not in (None, ""):
            continue
        value = first_value(row, candidates)
        normalized[target] = as_number(value) if target in NUMERIC_FIELDS else value

    if not normalized.get("unit_join_key"):
        stake = normalized.get("stake_or_district") or ""
        unit = normalized.get("unit_name") or ""
        normalized["unit_join_key"] = f"{stake}|{unit}".strip("|").lower()

    hash_basis = "|".join(str(normalized.get(key, "")) for key in sorted(normalized) if key != "load_dts")
    normalized["source_hash_diff"] = hashlib.sha256(hash_basis.encode("utf-8")).digest()
    return normalized


def load_rows(args: argparse.Namespace) -> list[dict[str, Any]]:
    with open(args.file, newline="", encoding=args.encoding) as handle:
        reader = csv.DictReader(handle)
        return [normalize_row(row, args, index) for index, row in enumerate(reader, start=1)]


def insert_rows(args: argparse.Namespace, rows: list[dict[str, Any]]) -> None:
    try:
        import pyodbc
    except ImportError as exc:
        raise SystemExit("pyodbc is required for direct SQL loading. Install pyodbc or use --dry-run.") from exc

    columns = [
        "record_source",
        "source_system",
        "source_file_path",
        "source_row_number",
        "source_hash_diff",
        "period",
        "period_year",
        "period_quarter",
        "source_grain",
        "age_group",
        "unit_join_key",
        "unit_code",
        "unit_zip_code",
        "unit_name",
        "coordinating_council",
        "stake_or_district",
        "state",
        "city",
        "snapshot_date",
        "members",
        "participating",
        "males",
        "females",
        "not_participating",
        "participating_males",
        "participating_females",
        "source_participation_rate",
        "low_participation_flag",
        "unit_priority_index",
        "city_priority_index",
        "isolation_vs_performance",
        "stake_distance_tier",
        "council_distance_tier",
        "miles_to_council_centroid",
        "city_latitude",
        "city_longitude",
    ]
    placeholders = ",".join("?" for _ in columns)
    statement = f"INSERT INTO STG.masc_survey_participation ({','.join(columns)}) VALUES ({placeholders})"
    connection = pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={args.server};DATABASE={args.database};Trusted_Connection=yes;TrustServerCertificate=yes;"
    )
    cursor = connection.cursor()
    cursor.fast_executemany = True
    cursor.executemany(statement, [[row.get(column) for column in columns] for row in rows])
    connection.commit()
    cursor.close()
    connection.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--server", default="LAPTOP")
    parser.add_argument("--database", default="BV")
    parser.add_argument("--period", required=True)
    parser.add_argument("--period-year", type=int, required=True)
    parser.add_argument("--period-quarter", type=int, required=True)
    parser.add_argument("--source-system", default="CSV Survey")
    parser.add_argument("--source-grain", default="survey_response")
    parser.add_argument("--encoding", default="utf-8-sig")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    rows = load_rows(args)
    print(f"Prepared {len(rows):,} rows from {args.file}")
    if args.dry_run:
        print("Dry run complete; no SQL rows inserted.")
        return
    insert_rows(args, rows)
    print(f"Inserted {len(rows):,} rows into STG.masc_survey_participation")


if __name__ == "__main__":
    main()
