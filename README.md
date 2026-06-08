# Mid-Atlantic Singles Council Dashboard

Static, public-shareable dashboard built from the local Tableau Hyper extract:

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

## Source Caveat

The current extract is not the exact SOP schema. It includes council, stake/district, state, city, unit name, member count, participating count, percent, and date. It does not include exact age, sex, unit zip code, participating males, or participating females.
