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

export function CouncilMap({ rows, selectedCouncil = "all" }) {
  const points = rows.filter((row) => Number.isFinite(row.cityLatitude) && Number.isFinite(row.cityLongitude));
  const minLat = Math.min(...points.map((row) => row.cityLatitude), 35);
  const maxLat = Math.max(...points.map((row) => row.cityLatitude), 42);
  const minLon = Math.min(...points.map((row) => row.cityLongitude), -81);
  const maxLon = Math.max(...points.map((row) => row.cityLongitude), -73);
  const x = (lon) => ((lon - minLon) / Math.max(maxLon - minLon, 0.01)) * 820 + 40;
  const y = (lat) => 440 - ((lat - minLat) / Math.max(maxLat - minLat, 0.01)) * 380;

  return (
    <svg className="council-map" viewBox="0 0 900 500" role="img" aria-label="Unit geography by participation rate">
      <defs>
        <linearGradient id="mapBg" x1="0" x2="1">
          <stop offset="0%" stopColor="#eef7ff" />
          <stop offset="100%" stopColor="#f8fbf8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="900" height="500" rx="24" fill="url(#mapBg)" />
      <path d="M120 420 C 230 250, 300 180, 430 210 S 640 170, 790 80" fill="none" stroke="#9bb8cf" strokeWidth="10" opacity="0.28" />
      <path d="M150 455 C 260 300, 315 260, 460 275 S 670 230, 820 120" fill="none" stroke="#2c7a7b" strokeWidth="3" opacity="0.35" />
      {points.map((row) => {
        const active = selectedCouncil === "all" || row.coordinatingCouncil === selectedCouncil;
        const rate = row.rate || 0;
        const color = rate >= 0.18 ? "#15803d" : rate >= 0.08 ? "#d97706" : "#dc2626";
        return (
          <g key={row.unitJoinKey} opacity={active ? 0.9 : 0.18}>
            <circle cx={x(row.cityLongitude)} cy={y(row.cityLatitude)} r={Math.max(4, Math.min(18, Math.sqrt(row.members || 1)))} fill={color} />
            <title>{`${row.unitName}: ${pct(row.rate)} (${num(row.members)} singles)`}</title>
          </g>
        );
      })}
    </svg>
  );
}
