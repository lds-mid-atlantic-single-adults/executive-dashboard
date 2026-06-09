# Mid-Atlantic Singles Council Executive Dashboard

Fresh static Next.js / React rebuild of the Mid-Atlantic Single Adult Executive Dashboard. The app is designed as an executive decision-support platform: within 30 seconds, leaders should see who is being reached, who is being missed, and where leadership should focus next.

## Architecture

- `app/`: Next.js App Router pages and API route handlers.
- `components/`: reusable KPI, chart, map, table, and recommendation components.
- `lib/`: metric, recommendation, opportunity-score, and executive-summary logic.
- `sql/`: STG/RV/BV/IM Data Vault scripts.
- `etl/`: CSV-to-STG ingestion utility with record source, load date, source metadata, and hash diff lineage.
- `data/`: SQL-derived static export used by the GitHub Pages build.
- `.github/workflows/deploy-pages.yml`: GitHub Actions workflow that builds and deploys `out/` to GitHub Pages.

## Run The App

Install dependencies:

```powershell
npm install
```

Start Next.js:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

The old static `index.html` is only a launcher notice. The dashboard itself lives in the Next.js App Router.

## GitHub Pages Deployment

This project is configured for static export with:

```js
output: "export"
```

Deploy flow:

1. Refresh the SQL-derived data locally when needed.
2. Commit `data/council-data.js` and `data/masc-sql-source-rows.csv`.
3. Push to `main`.
4. In GitHub, enable Pages with **Source: GitHub Actions**.
5. The workflow builds the static `out/` folder and deploys it.

Expected project URL:

```text
https://lds-mid-atlantic-single-adults.github.io/executive-dashboard/
```

The deployed site does not query SQL Server live. It uses the checked-in SQL-derived extract.

Build locally:

```powershell
npm run build
```

Serve the exported output:

```powershell
npm run serve:out
```

## Data Vault Setup

Run the Data Vault / IM scripts against `BV`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run_data_vault_refresh.ps1
```

Scripts:

- `sql/00_create_schemas.sql`: creates `STG`, `RV`, `BV`, and `IM`.
- `sql/01_data_vault_tables.sql`: creates staging, raw vault hubs/links/satellites.
- `sql/02_load_vault_from_staging.sql`: loads STG rows into RV.
- `sql/03_business_vault_and_im.sql`: creates BV and IM views from Data Vault tables.
- `sql/04_existing_masc_sources_to_im.sql`: creates `IM.masc_dashboard_source_rows` from the current `masc.[mid-atlantic-singles-council-*]` SQL objects.

## CSV ETL

Example:

```powershell
python etl\masc_csv_to_stg.py `
  --file "C:\Users\bradl\OneDrive\Desktop\Summer 2025\Singles+Task+Force+Survey+Research+2025_Tableau.csv" `
  --period "2025 Q3" `
  --period-year 2025 `
  --period-quarter 3 `
  --source-grain survey_response
```

The ETL excludes under-18 rows at the dashboard metric layer and preserves source lineage fields in STG.

## Refresh Static Dashboard Data

After refreshing SQL objects, rebuild the checked-in static payload:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\export_sql_server.ps1
```

The GitHub Pages build reads `data/council-data.js` at build time and copies the downloadable CSV into `public/data/`.

## Dashboard Views

The app has two major tabs:

- Executive Council View: top-line KPIs, dynamic executive summary, Leadership Action Center, age/gender reach, momentum, opportunity scoring, and geography.
- Stake / Ward Drilldown View: council/stake/unit filters, local KPIs, local recommendations, local geography, and unit action queue.

## Recommendation Engine

Recommendations are generated from measurable conditions, including:

- gender imbalance
- underutilized population
- retention / handoff drop-off
- geographic friction
- emerging success
- declining unit
- YSA-to-mid-single transition risk

Each card includes issue, severity, issue type, trend, measured condition, actions, estimated impact, confidence, and priority rank.

Opportunity score:

```text
Opportunity Score = Population Impact x Engagement Gap x Trend Severity x Intervention Probability
```

## Validation

Validate the static SQL-derived payload:

```powershell
npm run validate:data
```

or:

```powershell
python scripts\validate_dashboard_data.py
```

The validator confirms row counts, Mid-Atlantic SQL source objects, required fields, dashboard payload readiness, and exclusion of `0-17` age-group rows.
