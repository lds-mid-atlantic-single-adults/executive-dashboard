import { num, pct } from "@/lib/analytics";

export function BarList({ items, valueKey = "rate", labelKey = "name", max = 1, formatter = pct }) {
  return (
    <div className="bar-list">
      {items.map((item) => {
        const value = item[valueKey] || 0;
        return (
          <div className="bar-row" key={item[labelKey]}>
            <div className="bar-meta">
              <span>{item[labelKey]}</span>
              <strong>{formatter(value)}</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DemographicMatrix({ segments }) {
  return (
    <div className="matrix">
      <div className="matrix-head">
        <span>Segment</span>
        <span>Members</span>
        <span>Reached</span>
        <span>Rate</span>
        <span>Male</span>
        <span>Female</span>
      </div>
      {segments.map((segment) => (
        <div className="matrix-row" key={segment.id}>
          <span>
            <strong>{segment.shortLabel}</strong>
            <small>{segment.meaning}</small>
          </span>
          <span>{num(segment.members)}</span>
          <span>{num(segment.participating)}</span>
          <span className={segment.rate < 0.1 ? "danger-text" : ""}>{pct(segment.rate)}</span>
          <span>{pct(segment.maleRate)}</span>
          <span>{pct(segment.femaleRate)}</span>
        </div>
      ))}
    </div>
  );
}

export function MovementRibbon({ model }) {
  const items = [
    { label: "Active", value: model.engagementCounts.active, tone: "green" },
    { label: "Recently inactive", value: model.engagementCounts.recentlyInactive, tone: "amber" },
    { label: "Long inactive", value: model.engagementCounts.longInactive, tone: "red" }
  ];
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);
  return (
    <div className="movement-ribbon">
      {items.map((item) => (
        <div className={`movement-block tone-${item.tone}`} key={item.label} style={{ flexBasis: `${(item.value / total) * 100}%` }}>
          <strong>{num(item.value)}</strong>
          <span>{item.label} units</span>
        </div>
      ))}
    </div>
  );
}

export function OpportunityTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Unit</th>
            <th>Stake</th>
            <th>Archetype</th>
            <th>Rate</th>
            <th>Score</th>
            <th>Est. lift</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row, index) => (
            <tr key={row.unitJoinKey}>
              <td>{index + 1}</td>
              <td>
                <strong>{row.unitName}</strong>
                <small>{row.city}, {row.state}</small>
              </td>
              <td>{row.stakeOrDistrict}</td>
              <td>{row.archetype}</td>
              <td>{pct(row.rate)}</td>
              <td>{row.opportunityScore.toFixed(1)}</td>
              <td>{num(row.estimatedLift)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MAP_WIDTH = 900;
const MAP_HEIGHT = 520;
const MAP_PADDING = 30;
const TILE_SIZE = 256;
const MAX_TILE_COUNT = 44;
const MAX_MERCATOR_LAT = 85.05112878;

function clamp(value, min, max) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function hasMapCoordinates(row) {
  return (
    Number.isFinite(row.cityLatitude) &&
    Number.isFinite(row.cityLongitude) &&
    row.cityLatitude >= -MAX_MERCATOR_LAT &&
    row.cityLatitude <= MAX_MERCATOR_LAT &&
    row.cityLongitude >= -180 &&
    row.cityLongitude <= 180
  );
}

function haversineMiles(latA, lonA, latB, lonB) {
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function latLonToWorld(lat, lon, zoom) {
  const safeLat = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  const sinLat = Math.sin(toRadians(safeLat));
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
  };
}

function expandGeoBounds(points) {
  const lats = points.map((point) => point.lat ?? point.cityLatitude);
  const lons = points.map((point) => point.lon ?? point.cityLongitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lonSpan = Math.max(maxLon - minLon, 0.01);
  const latPad = Math.max(latSpan * 0.14, 0.12);
  const lonPad = Math.max(lonSpan * 0.14, 0.12);

  return {
    minLat: clamp(minLat - latPad, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT),
    maxLat: clamp(maxLat + latPad, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT),
    minLon: clamp(minLon - lonPad, -179.9, 179.9),
    maxLon: clamp(maxLon + lonPad, -179.9, 179.9)
  };
}

function projectedBounds(bounds, zoom) {
  const northWest = latLonToWorld(bounds.maxLat, bounds.minLon, zoom);
  const southEast = latLonToWorld(bounds.minLat, bounds.maxLon, zoom);
  return {
    minX: Math.min(northWest.x, southEast.x),
    maxX: Math.max(northWest.x, southEast.x),
    minY: Math.min(northWest.y, southEast.y),
    maxY: Math.max(northWest.y, southEast.y)
  };
}

function tileRange(bounds, zoom) {
  const projected = projectedBounds(bounds, zoom);
  const tileMax = 2 ** zoom - 1;
  const startX = Math.floor(projected.minX / TILE_SIZE);
  const endX = Math.floor(projected.maxX / TILE_SIZE);
  const startY = clamp(Math.floor(projected.minY / TILE_SIZE), 0, tileMax);
  const endY = clamp(Math.floor(projected.maxY / TILE_SIZE), 0, tileMax);
  return {
    startX,
    endX,
    startY,
    endY,
    count: Math.max(endX - startX + 1, 0) * Math.max(endY - startY + 1, 0)
  };
}

function chooseZoom(bounds) {
  for (let zoom = 10; zoom >= 5; zoom -= 1) {
    const range = tileRange(bounds, zoom);
    if (range.count <= MAX_TILE_COUNT) return zoom;
  }
  return 5;
}

function buildMapViewport(points) {
  const bounds = expandGeoBounds(points);
  const zoom = chooseZoom(bounds);
  const projected = projectedBounds(bounds, zoom);
  const spanX = Math.max(projected.maxX - projected.minX, 1);
  const spanY = Math.max(projected.maxY - projected.minY, 1);
  const scale = Math.min((MAP_WIDTH - MAP_PADDING * 2) / spanX, (MAP_HEIGHT - MAP_PADDING * 2) / spanY);
  const offsetX = (MAP_WIDTH - spanX * scale) / 2;
  const offsetY = (MAP_HEIGHT - spanY * scale) / 2;
  const range = tileRange(bounds, zoom);
  const tileModulo = 2 ** zoom;
  const tiles = [];

  for (let tileX = range.startX; tileX <= range.endX; tileX += 1) {
    for (let tileY = range.startY; tileY <= range.endY; tileY += 1) {
      const wrappedX = ((tileX % tileModulo) + tileModulo) % tileModulo;
      tiles.push({
        key: `${zoom}-${tileX}-${tileY}`,
        href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        x: (tileX * TILE_SIZE - projected.minX) * scale + offsetX,
        y: (tileY * TILE_SIZE - projected.minY) * scale + offsetY,
        size: TILE_SIZE * scale
      });
    }
  }

  return {
    zoom,
    tiles,
    toScreen(lat, lon) {
      const point = latLonToWorld(lat, lon, zoom);
      return {
        x: (point.x - projected.minX) * scale + offsetX,
        y: (point.y - projected.minY) * scale + offsetY
      };
    }
  };
}

function stakeCentroids(points) {
  const groups = new Map();
  points.forEach((row) => {
    const stake = row.stakeOrDistrict || "Unassigned stake";
    const weight = Math.max(row.members || 0, 1);
    if (!groups.has(stake)) {
      groups.set(stake, { stake, lat: 0, lon: 0, weight: 0, members: 0, participating: 0, units: 0 });
    }
    const group = groups.get(stake);
    group.lat += row.cityLatitude * weight;
    group.lon += row.cityLongitude * weight;
    group.weight += weight;
    group.members += row.members || 0;
    group.participating += row.participating || 0;
    group.units += 1;
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      lat: group.lat / group.weight,
      lon: group.lon / group.weight,
      rate: group.members > 0 ? group.participating / group.members : null
    }))
    .sort((a, b) => b.members - a.members);
}

function nearestCentroid(row, centroids) {
  return centroids.reduce(
    (best, centroid) => {
      const distance = haversineMiles(row.cityLatitude, row.cityLongitude, centroid.lat, centroid.lon);
      return !best || distance < best.distance ? { centroid, distance } : best;
    },
    null
  );
}

function rateColor(rate) {
  if (rate >= 0.18) return "#2f7d59";
  if (rate >= 0.08) return "#a86618";
  return "#a94442";
}

function unitRadius(row) {
  return Math.max(4.5, Math.min(13, Math.sqrt(row.members || 1) / 2.5));
}

function shortStakeName(stake) {
  return String(stake || "Stake")
    .replace(/\b(Stake|District)\b/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
}

export function CouncilMap({ rows, centroidRows = rows, selectedCouncil = "all" }) {
  const points = rows.filter(hasMapCoordinates);

  if (!points.length) {
    return <div className="map-empty">No mapped units have latitude and longitude for this filter.</div>;
  }

  const centroidPoints = centroidRows.filter(hasMapCoordinates);
  const centroids = stakeCentroids(centroidPoints.length ? centroidPoints : points);
  const viewport = buildMapViewport([...points, ...centroids]);
  const relationships = points
    .map((row) => {
      const nearest = nearestCentroid(row, centroids);
      const unit = viewport.toScreen(row.cityLatitude, row.cityLongitude);
      const centroid = nearest ? viewport.toScreen(nearest.centroid.lat, nearest.centroid.lon) : null;
      return {
        row,
        unit,
        nearest,
        centroid,
        active: selectedCouncil === "all" || row.coordinatingCouncil === selectedCouncil
      };
    })
    .filter((item) => item.nearest && item.centroid);
  const farthest = [...relationships].sort((a, b) => b.nearest.distance - a.nearest.distance)[0];
  const crossStakeCount = relationships.filter((item) => item.nearest.centroid.stake !== item.row.stakeOrDistrict).length;
  const labeledCentroids = centroids
    .slice(0, centroids.length <= 10 ? centroids.length : 10)
    .map((centroid) => ({ ...centroid, screen: viewport.toScreen(centroid.lat, centroid.lon), label: shortStakeName(centroid.stake) }));

  return (
    <figure className="map-figure">
      <svg
        className="council-map actual-map"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label="OpenStreetMap basemap showing unit points connected to their closest computed stake centroid"
      >
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} className="map-backdrop" />
        {viewport.tiles.map((tile) => (
          <image
            key={tile.key}
            className="map-tile"
            href={tile.href}
            x={tile.x}
            y={tile.y}
            width={tile.size}
            height={tile.size}
            preserveAspectRatio="none"
          />
        ))}
        <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} className="map-softener" />

        {relationships.map((item) => (
          <line
            key={`${item.row.unitJoinKey}-to-centroid`}
            className="unit-centroid-link"
            x1={item.unit.x}
            y1={item.unit.y}
            x2={item.centroid.x}
            y2={item.centroid.y}
            opacity={item.active ? 0.34 : 0.08}
          >
            <title>{`${item.row.unitName} to ${item.nearest.centroid.stake}: ${item.nearest.distance.toFixed(1)} mi`}</title>
          </line>
        ))}

        {centroids.map((centroid) => {
          const screen = viewport.toScreen(centroid.lat, centroid.lon);
          return (
            <g key={centroid.stake} className="centroid" transform={`translate(${screen.x} ${screen.y})`}>
              <rect className="centroid-marker" x="-7" y="-7" width="14" height="14" transform="rotate(45)" />
              <circle className="centroid-core" r="3" />
              <title>{`${centroid.stake} computed centroid: ${num(centroid.units)} units, ${num(centroid.members)} singles, ${pct(centroid.rate)}`}</title>
            </g>
          );
        })}

        {relationships.map((item) => (
          <g key={item.row.unitJoinKey} opacity={item.active ? 0.95 : 0.18}>
            <circle
              className="unit-dot"
              cx={item.unit.x}
              cy={item.unit.y}
              r={unitRadius(item.row)}
              fill={rateColor(item.row.rate)}
            />
            <title>{`${item.row.unitName}: ${pct(item.row.rate)} (${num(item.row.members)} singles). Nearest centroid: ${item.nearest.centroid.stake}, ${item.nearest.distance.toFixed(1)} mi.`}</title>
          </g>
        ))}

        {labeledCentroids.map((centroid) => {
          const labelWidth = Math.min(Math.max(centroid.label.length * 5.8 + 14, 56), 160);
          const labelX = clamp(centroid.screen.x + 12, 8, MAP_WIDTH - labelWidth - 8);
          const labelY = clamp(centroid.screen.y - 22, 10, MAP_HEIGHT - 26);
          return (
            <g key={`${centroid.stake}-label`} className="centroid-label">
              <rect x={labelX} y={labelY} width={labelWidth} height="19" rx="5" />
              <text x={labelX + 7} y={labelY + 13}>{centroid.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-line" /> unit to closest centroid</span>
        <span><i className="legend-centroid" /> stake centroid</span>
        <span><i className="legend-dot good" /> 18%+ participation</span>
        <span><i className="legend-dot watch" /> 8-18%</span>
        <span><i className="legend-dot risk" /> under 8%</span>
      </div>
      <div className="map-summary">
        <span><strong>{num(points.length)}</strong> mapped units</span>
        <span><strong>{num(centroids.length)}</strong> computed stake centroids</span>
        <span><strong>{num(crossStakeCount)}</strong> nearest to another stake centroid</span>
        {farthest ? (
          <span>
            Farthest nearest: <strong>{farthest.row.unitName}</strong> {farthest.nearest.distance.toFixed(1)} mi
          </span>
        ) : null}
      </div>
      <figcaption className="map-attribution">
        Map tiles: (c) OpenStreetMap contributors. Centroids are member-weighted from the broader period and council context.
      </figcaption>
    </figure>
  );
}
