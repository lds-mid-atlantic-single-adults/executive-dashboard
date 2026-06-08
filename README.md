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

- Executive Story: senior-leadership readout of corridor health, priority segments, and operating focus.
- Council Overview: council scale, participation rate, and current versus prior snapshot comparison.
- Age & Gender: Q1 2026 age curve, gender gap by age, and segment-level participation table.
- Geography: distance tiers, structural archetypes, and highest-priority units.
- Time Over Time: 2025 Q3 to 2026 Q1 movement by council, stake, and matched unit.
- Stake & Unit Action: filters for council reps and stake representatives to inspect their local situation.

## Source Caveat

The available SQL sources are 2025 Q3 and 2026 Q1. The 2025 Q3 rows are unit-level and do not include age or gender fields. The 2026 Q1 rows are age-group level and include age group, sex counts, participating male/female counts, unit zip code, distance tiers, and structural priority fields. Time-over-time views therefore compare the best available snapshots, not a same-quarter year-over-year series.
