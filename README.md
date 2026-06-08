# Mid-Atlantic Singles Council Dashboard

Static, public-shareable dashboard built from local Mid-Atlantic Singles Council participation extracts:

`USNE - SA participation - 03 Nov 2025.hyper`

The runtime dashboard has no Tableau dependency, no paid BI license dependency, no CDN, and no build step. It is plain HTML, CSS, JavaScript, and an exported aggregate data file.

## Open Locally

Open `index.html` directly, or run a small local server:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Refresh Data

The checked-in dashboard reads `data/council-data.js`. To refresh from a newer Hyper extract:

1. Put the new `.hyper` extract in the project folder.
2. Update `SOURCE` in `scripts/export_hyper.py` if the filename changed.
3. Install the one-time converter dependency if needed:

```powershell
python -m pip install --target .vendor tableauhyperapi
```

4. Run:

```powershell
python scripts/export_hyper.py
```

## Publish To A Public URL

Because the dashboard is static, the simplest options are:

- GitHub Pages: push this folder to a GitHub repo, then enable Pages from the repo root.
- Netlify: deploy the folder as a static site.
- Vercel: import the repo as a static project.

Anything in `data/council-data.js` is visible to anyone with the URL. The current file contains aggregate unit-level counts, not individual records.

## Dashboard Tabs

- Executive Story: Area Seventy / senior-leadership proof of whether the council is valuable and moving outcomes.
- Council Overview: council-rep operating portfolio for scale, participation gaps, and cross-council lift.
- Age & Gender: age-bucket owner view of YSA, Single Adult, and Singles participation drop-offs.
- Geography: logistics and calendar owner view of distance friction, archetypes, and priority units.
- Time Over Time: accountability review of whether participation is improving by council, stake, and unit.
- Stake & Unit Action: stake-rep view of local situation, benchmarks, and action queue.

## Universal Variables

The dashboard exposes a shared `ageSegment` variable through `window.MASC_DASHBOARD_VARIABLES` and the metadata `filterVariables.ageSegment` contract. The options are:

- `allAdults`: All singles 18+
- `ysa`: Young Single Adults (18-35)
- `singleAdults`: Single Adults (36-45)
- `singles46plus`: Singles (46+)

Every page uses the same selected age segment for headline metrics, council/stake breakdowns, geography, time-over-time movement, and unit drilldowns.

## Executive Brief Proof Model

The Executive Story tab is mapped to `Mid-Atlantic_Singles_Council_-_Stake_Rep_Tracker.docx`. That tracker defines the council-value evidence model across community and participation, spiritual engagement, relationships and marriage, council coordination and impact, and open feedback. The SQL extract populates the participation and movement signals; tracker response data is still needed to populate the spiritual, relationship, coordination, and qualitative proof points.

## Source Caveat

The available SQL sources are 2025 Q3 and 2026 Q1. The dashboard excludes 2026 rows for ages 0-17. The 2025 Q3 rows are unit-level and do not include age or gender fields. The 2026 Q1 rows are age-group level and include age group, sex counts, participating male/female counts, unit zip code, distance tiers, and structural priority fields. Time-over-time views therefore compare the best available snapshots, not a same-quarter year-over-year series. Age-segment filters apply to the current 2026 snapshot; the prior 2025 Q3 source remains unit-level.
