const payload = window.MASC_DASHBOARD_DATA;
const meta = payload.metadata;
const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const sourceRows = payload.rows.map((row) => ({
  ...row,
  members: toNumberOrNull(row.members),
  participating: toNumberOrNull(row.participating),
  males: toNumberOrNull(row.males),
  females: toNumberOrNull(row.females),
  participatingMales: toNumberOrNull(row.participatingMales),
  participatingFemales: toNumberOrNull(row.participatingFemales),
  cityLatitude: toNumberOrNull(row.cityLatitude),
  cityLongitude: toNumberOrNull(row.cityLongitude),
}));

const baselinePeriod = meta.baselinePeriod;
const latestPeriod = meta.latestPeriod;
const state = {
  activeTab: "executive",
  ageSegment: meta.defaultAgeScope || "allAdults",
  council: "All councils",
  stake: "All stakes / districts",
  query: "",
  sort: "membersDesc",
};

const ARCHETYPE_STRATEGIES = {
  "Low isolation / High participation": "Scale and replicate",
  "Low isolation / Low participation": "Fix execution",
  "High isolation / Low participation": "Reduce friction",
  "High isolation / High participation": "Protect and learn",
};

const AGE_SEGMENTS = [
  {
    id: "ysa",
    label: "Young Single Adults (18-35)",
    shortLabel: "YSA 18-35",
    description: "Young Single Adults, ages 18-35.",
    minRank: 18,
    maxRank: 26,
    rank: 1,
    meaning: "Young adult handoff, transition, and early retention.",
  },
  {
    id: "singleAdults",
    label: "Single Adults (36-45)",
    shortLabel: "SA 36-45",
    description: "Single Adults, ages 36-45.",
    minRank: 36,
    maxRank: 36,
    rank: 2,
    meaning: "Midlife engagement trough and focused reactivation.",
  },
  {
    id: "singles46plus",
    label: "Singles (46+)",
    shortLabel: "Singles 46+",
    description: "Singles, ages 46 and older.",
    minRank: 46,
    maxRank: Infinity,
    rank: 3,
    meaning: "Older adult connection, male re-engagement, and durable belonging.",
  },
];

const DASHBOARD_VARIABLES = {
  ageSegment: {
    id: "ageSegment",
    label: "Age Segment",
    defaultValue: meta.defaultAgeScope || "allAdults",
    allValue: "allAdults",
    options: [
      {
        id: "allAdults",
        label: "All singles 18+",
        shortLabel: "All 18+",
        description: "All adult singles, excluding rows for ages 0-17.",
      },
      ...AGE_SEGMENTS,
    ],
  },
  personas: [
    "Area Seventy / senior leadership",
    "Executive Advisory Council",
    "Council representatives",
    "Stake representatives",
    "Age-bucket owners",
  ],
};

window.MASC_DASHBOARD_VARIABLES = DASHBOARD_VARIABLES;

const CHART_COLORS = {
  blue: "#0d4f67",
  teal: "#007fa3",
  tealDark: "#006073",
  gold: "#a3832d",
  goldSoft: "#f2e4bf",
  red: "#a94442",
  green: "#2f7d59",
  slate: "#9eb2c0",
  soft: "#e8eff3",
};

const ICON_PATHS = {
  landmark:
    '<path d="M3 21h18" /><path d="M5 21V9l7-4 7 4v12" /><path d="M9 21v-7" /><path d="M15 21v-7" />',
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
  map:
    '<path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" /><path d="M9 3v15" /><path d="M15 6v15" />',
  trend:
    '<path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />',
  clipboard:
    '<rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0" /><path d="M9 12h6" /><path d="M9 16h4" />',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />',
  target:
    '<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" />',
  route:
    '<circle cx="6" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M8.5 16C14 13 10 9 15.5 7" />',
  hand:
    '<path d="M8 11v5a4 4 0 0 0 4 4h2a5 5 0 0 0 5-5v-3" /><path d="M8 11a2 2 0 1 1 4 0v3" /><path d="M12 11V9a2 2 0 1 1 4 0v5" /><path d="M16 12a2 2 0 1 1 4 0v2" />',
  bridge:
    '<path d="M3 18h18" /><path d="M5 18c1-6 5-9 7-9s6 3 7 9" /><path d="M8 18v-5" /><path d="M16 18v-5" />',
  spark:
    '<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />',
};

const TAB_ICONS = {
  executive: "landmark",
  overview: "dashboard",
  demographics: "users",
  geography: "map",
  time: "trend",
  drilldown: "clipboard",
};

const fmt = new Intl.NumberFormat("en-US");
const pctFmt = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconSvg(name, extraClass = "") {
  const paths = ICON_PATHS[name] || ICON_PATHS.spark;
  return `<svg class="ui-icon${extraClass ? ` ${extraClass}` : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function compactLabel(value, maxLength = 28) {
  const text = String(value ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatNumber(value) {
  return Number.isFinite(value) ? fmt.format(Math.round(value)) : "--";
}

function formatPercent(value) {
  return Number.isFinite(value) ? pctFmt.format(value) : "--";
}

function formatDeltaNumber(value) {
  if (!Number.isFinite(value)) return "--";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${fmt.format(rounded)}`;
}

function formatDeltaPct(value) {
  if (!Number.isFinite(value)) return "--";
  const points = value * 100;
  return `${points > 0 ? "+" : ""}${points.toFixed(1)} percentage points`;
}

function formatAbsDeltaPct(value) {
  if (!Number.isFinite(value)) return "--";
  return `${Math.abs(value * 100).toFixed(1)} percentage points`;
}

function formatGenderGap(value) {
  if (!Number.isFinite(value)) return "--";
  const points = Math.abs(value * 100).toFixed(1);
  if (Math.abs(value) < 0.0001) return "Even";
  return value > 0
    ? `Female +${points} percentage points`
    : `Male +${points} percentage points`;
}

function valueClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0001) return "";
  return value > 0 ? " positive" : " negative";
}

function rateClass(rate) {
  return Number.isFinite(rate) && rate < 0.12 ? " low" : "";
}

function formatScore(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function cleanDistanceTier(value) {
  return String(value || "Unassigned")
    .replace(/\u00ef\u00bf\u00bd/g, "-")
    .replace(/\uFFFD/g, "-")
    .replace(/\u2013/g, "-")
    .replace("?75 mi", ">=75 mi")
    .replace("=75 mi", ">=75 mi");
}

function distanceTierRank(value) {
  const tier = cleanDistanceTier(value);
  if (tier.startsWith("<20")) return 1;
  if (tier.startsWith("20-40")) return 2;
  if (tier.startsWith("40-75")) return 3;
  if (tier.startsWith(">=75")) return 4;
  return 99;
}

function hasCounts(row) {
  return Number.isFinite(row.members) && Number.isFinite(row.participating);
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function ageGroupRank(ageGroup) {
  const group = String(ageGroup || "").trim();
  if (group === "0-17") return 0;
  if (group === "18-25") return 18;
  if (group === "26-35") return 26;
  if (group === "36-45") return 36;
  if (group === "46-55") return 46;
  if (group === "56-65") return 56;
  if (group === "66-75") return 66;
  if (group === "76+") return 76;
  return 999;
}

function ageSegmentForRank(rank) {
  if (!Number.isFinite(rank) || rank < 18) return null;
  return AGE_SEGMENTS.find((segment) => rank >= segment.minRank && rank <= segment.maxRank) || null;
}

function ageSegmentForGroup(ageGroup) {
  return ageSegmentForRank(ageGroupRank(ageGroup));
}

function selectedAgeSegmentInfo() {
  return (
    DASHBOARD_VARIABLES.ageSegment.options.find((option) => option.id === state.ageSegment) ||
    DASHBOARD_VARIABLES.ageSegment.options[0]
  );
}

function rowIncludedByAge(row) {
  if (row.sourceGrain !== "age_group") return true;
  const rank = ageGroupRank(row.ageGroup);
  if (rank < 18) return false;
  if (state.ageSegment === "ysa") return rank >= 18 && rank <= 26;
  if (state.ageSegment === "singleAdults") return rank === 36;
  if (state.ageSegment === "singles46plus") return rank >= 46;
  return rank >= 18;
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = typeof key === "function" ? key(item) : item[key];
    if (!groupKey) return groups;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
    return groups;
  }, new Map());
}

function sumField(items, field) {
  const values = items.map((item) => item[field]).filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function unitRowsForPeriod(period) {
  const periodRows = sourceRows.filter((row) => row.period === period && rowIncludedByAge(row));
  return [...groupBy(periodRows, "unitJoinKey")].map(([unitJoinKey, groupRows]) => {
    const first = groupRows[0];
    const members = sumField(groupRows, "members");
    const participating = sumField(groupRows, "participating");
    const males = sumField(groupRows, "males");
    const females = sumField(groupRows, "females");
    const participatingMales = sumField(groupRows, "participatingMales");
    const participatingFemales = sumField(groupRows, "participatingFemales");
    const ageGroups = uniqueValues(groupRows, "ageGroup");

    return {
      period,
      unitJoinKey,
      unitCode: first.unitCode,
      unitZipCode: first.unitZipCode,
      unitName: first.unitName,
      coordinatingCouncil: first.coordinatingCouncil,
      stakeOrDistrict: first.stakeOrDistrict,
      state: first.state,
      city: first.city,
      cityLatitude: first.cityLatitude,
      cityLongitude: first.cityLongitude,
      snapshotDate: first.snapshotDate,
      sourceObject: first.sourceObject,
      sourceGrain: first.sourceGrain,
      ageGroups,
      members,
      participating,
      males,
      females,
      participatingMales,
      participatingFemales,
      rate: members > 0 && Number.isFinite(participating) ? participating / members : null,
      lowParticipationFlag: groupRows.some((row) => row.lowParticipationFlag === 1),
      unitPriorityIndex: Math.max(
        ...groupRows.map((row) => row.unitPriorityIndex).filter(Number.isFinite),
        0
      ),
      cityPriorityIndex: Math.max(
        ...groupRows.map((row) => row.cityPriorityIndex).filter(Number.isFinite),
        0
      ),
      isolationVsPerformance: first.isolationVsPerformance,
      stakeDistanceTier: first.stakeDistanceTier,
      councilDistanceTier: first.councilDistanceTier,
      milesToCouncilCentroid: first.milesToCouncilCentroid,
    };
  });
}

function summarize(items) {
  const members = sumField(items, "members") || 0;
  const participating = sumField(items, "participating") || 0;
  const stakes = new Set(items.map((row) => row.stakeOrDistrict).filter(Boolean));
  const councils = new Set(items.map((row) => row.coordinatingCouncil).filter(Boolean));
  const missing = items.filter((row) => !hasCounts(row)).length;
  return {
    members,
    participating,
    rate: members > 0 ? participating / members : null,
    units: items.length,
    unitsWithCounts: items.filter(hasCounts).length,
    missing,
    stakes: stakes.size,
    councils: councils.size,
  };
}

function summarizeSourceRows(items) {
  const summary = summarize(items);
  const males = sumField(items, "males") || 0;
  const females = sumField(items, "females") || 0;
  const participatingMales = sumField(items, "participatingMales") || 0;
  const participatingFemales = sumField(items, "participatingFemales") || 0;
  return {
    ...summary,
    males,
    females,
    participatingMales,
    participatingFemales,
    maleRate: males > 0 ? participatingMales / males : null,
    femaleRate: females > 0 ? participatingFemales / females : null,
    genderGap:
      males > 0 && females > 0
        ? participatingFemales / females - participatingMales / males
        : null,
  };
}

function averageField(items, field) {
  const values = items.map((item) => item[field]).filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregate(items, key) {
  return [...groupBy(items, key)].map(([name, groupRows]) => ({
    name,
    key: name,
    rows: groupRows,
    ...summarize(groupRows),
  }));
}

function latestAgeSourceRows() {
  return sourceRows.filter(
    (row) =>
      row.period === latestPeriod &&
      row.sourceGrain === "age_group" &&
      ageGroupRank(row.ageGroup) >= 18
  );
}

function ageGenderData(items = latestAgeSourceRows()) {
  return [...groupBy(items, "ageGroup")]
    .map(([ageGroup, groupRows]) => ({
      name: ageGroup,
      ageGroup,
      rank: ageGroupRank(ageGroup),
      rows: groupRows,
      ...summarizeSourceRows(groupRows),
    }))
    .sort((a, b) => a.rank - b.rank);
}

function ageSegmentData(items = latestAgeSourceRows()) {
  return AGE_SEGMENTS.map((segment) => {
    const groupRows = items.filter((row) => ageSegmentForGroup(row.ageGroup)?.id === segment.id);
    return {
      name: segment.shortLabel,
      label: segment.label,
      ageGroup: segment.label,
      segmentId: segment.id,
      rank: segment.rank,
      meaning: segment.meaning,
      rows: groupRows,
      ...summarizeSourceRows(groupRows),
    };
  });
}

function segmentSummary(label, items) {
  return {
    label,
    ...summarizeSourceRows(items),
  };
}

function rateDeltaValue(latestSummary, baselineSummary) {
  return Number.isFinite(latestSummary.rate) && Number.isFinite(baselineSummary.rate)
    ? latestSummary.rate - baselineSummary.rate
    : null;
}

function participationLiftNeeded(summary, targetRate) {
  if (!Number.isFinite(summary.members) || !Number.isFinite(targetRate)) return null;
  const targetParticipating = Math.round(summary.members * targetRate);
  return Math.max(targetParticipating - Math.round(summary.participating || 0), 0);
}

function ageDropoffData(segments) {
  const pairs = [
    [segments.find((item) => item.segmentId === "ysa"), segments.find((item) => item.segmentId === "singleAdults")],
    [
      segments.find((item) => item.segmentId === "singleAdults"),
      segments.find((item) => item.segmentId === "singles46plus"),
    ],
  ];

  return pairs
    .filter(([from, to]) => from && to)
    .map(([from, to]) => {
      const change = Number.isFinite(from.rate) && Number.isFinite(to.rate) ? to.rate - from.rate : null;
      const isDrop = Number.isFinite(change) && change < 0;
      const isRecovery = Number.isFinite(change) && change > 0;
      return {
        transition: `${from.name} to ${to.name}`,
        from,
        to,
        change,
        interpretation: isDrop
          ? `${formatDeltaPct(change)} drop-off; this is where council programming must protect continuity.`
          : isRecovery
            ? `${formatDeltaPct(change)} recovery; preserve what is working and translate it upstream.`
            : "No measurable movement between these buckets.",
      };
    });
}

function renderStoryCards(container, cards) {
  container.innerHTML = cards
    .map((card) => storyCard(card.title, card.body, card.context))
    .join("");
}

function comparisonByKey(latestItems, baselineItems, keyFn) {
  const latestMap = new Map(aggregate(latestItems, keyFn).map((item) => [item.key, item]));
  const baselineMap = new Map(aggregate(baselineItems, keyFn).map((item) => [item.key, item]));
  const keys = [...new Set([...latestMap.keys(), ...baselineMap.keys()])];

  return keys.map((key) => {
    const latest = latestMap.get(key);
    const baseline = baselineMap.get(key);
    return {
      key,
      name: latest?.name || baseline?.name || key,
      latest,
      baseline,
      deltaMembers: (latest?.members ?? 0) - (baseline?.members ?? 0),
      deltaParticipating: (latest?.participating ?? 0) - (baseline?.participating ?? 0),
      deltaRate:
        Number.isFinite(latest?.rate) && Number.isFinite(baseline?.rate)
          ? latest.rate - baseline.rate
          : null,
    };
  });
}

function comparisonByUnit(latestItems, baselineItems) {
  const latestMap = new Map(latestItems.map((item) => [item.unitJoinKey, item]));
  const baselineMap = new Map(baselineItems.map((item) => [item.unitJoinKey, item]));
  const keys = [...new Set([...latestMap.keys(), ...baselineMap.keys()])];

  return keys.map((key) => {
    const latest = latestMap.get(key);
    const baseline = baselineMap.get(key);
    return {
      key,
      latest,
      baseline,
      name: latest?.unitName || baseline?.unitName || key,
      stakeOrDistrict: latest?.stakeOrDistrict || baseline?.stakeOrDistrict || "--",
      coordinatingCouncil: latest?.coordinatingCouncil || baseline?.coordinatingCouncil || "--",
      deltaMembers: (latest?.members ?? 0) - (baseline?.members ?? 0),
      deltaParticipating: (latest?.participating ?? 0) - (baseline?.participating ?? 0),
      deltaRate:
        Number.isFinite(latest?.rate) && Number.isFinite(baseline?.rate)
          ? latest.rate - baseline.rate
          : null,
    };
  });
}

function currentRows() {
  return unitRowsForPeriod(latestPeriod);
}

function priorRows() {
  return unitRowsForPeriod(baselinePeriod);
}

function ageSegmentInfo() {
  return selectedAgeSegmentInfo();
}

function kpiCard(label, value, context, delta) {
  return `
    <article class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-context">${context}</div>
      ${delta ? `<div class="kpi-delta${valueClass(delta.value)}">${delta.label}</div>` : ""}
    </article>
  `;
}

function setKpis(container, latestSummary, baselineSummary, coverage) {
  container.innerHTML = [
    kpiCard(
      "Adult Members",
      formatNumber(latestSummary.members),
      `${latestPeriod}; ${formatNumber(latestSummary.units)} units`,
      {
        value: latestSummary.members - baselineSummary.members,
        label: `${formatDeltaNumber(latestSummary.members - baselineSummary.members)} vs ${baselinePeriod}`,
      }
    ),
    kpiCard(
      "Participating Adults",
      formatNumber(latestSummary.participating),
      `${formatPercent(latestSummary.rate)} aggregate participation`,
      {
        value: latestSummary.participating - baselineSummary.participating,
        label: `${formatDeltaNumber(latestSummary.participating - baselineSummary.participating)} participating`,
      }
    ),
    kpiCard(
      "Bottom-Line Rate",
      formatPercent(latestSummary.rate),
      `Prior snapshot: ${formatPercent(baselineSummary.rate)}`,
      {
        value:
          Number.isFinite(latestSummary.rate) && Number.isFinite(baselineSummary.rate)
            ? latestSummary.rate - baselineSummary.rate
            : 0,
        label: `${formatDeltaPct(latestSummary.rate - baselineSummary.rate)} rate change`,
      }
    ),
    kpiCard(
      "Comparable Units",
      formatNumber(coverage.matched),
      `${formatNumber(coverage.newUnits)} new; ${formatNumber(coverage.missingUnits)} prior-only`,
      null
    ),
  ].join("");
}

function coverageSummary(latestItems, baselineItems) {
  const latestKeys = new Set(latestItems.map((row) => row.unitJoinKey));
  const baselineKeys = new Set(baselineItems.map((row) => row.unitJoinKey));
  return {
    matched: [...latestKeys].filter((key) => baselineKeys.has(key)).length,
    newUnits: [...latestKeys].filter((key) => !baselineKeys.has(key)).length,
    missingUnits: [...baselineKeys].filter((key) => !latestKeys.has(key)).length,
  };
}

function chartEmpty(message) {
  return `<div class="chart-empty">${message}</div>`;
}

function renderCouncilScale(container, data) {
  if (!data.length) {
    container.innerHTML = chartEmpty("No data in the current selection");
    return;
  }

  const width = 860;
  const rowHeight = 54;
  const height = data.length * rowHeight + 36;
  const labelWidth = 194;
  const chartWidth = width - labelWidth - 118;
  const maxMembers = Math.max(...data.map((item) => item.members), 1);

  const bars = data
    .map((item, index) => {
      const y = index * rowHeight + 26;
      const membersWidth = (item.members / maxMembers) * chartWidth;
      const partWidth = (item.participating / maxMembers) * chartWidth;
      return `
        <text class="bar-label" x="0" y="${y + 15}">${escapeHtml(item.name)}</text>
        <rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="18" rx="4" fill="${CHART_COLORS.soft}"></rect>
        <rect x="${labelWidth}" y="${y}" width="${membersWidth}" height="18" rx="4" fill="${CHART_COLORS.slate}"></rect>
        <rect x="${labelWidth}" y="${y}" width="${partWidth}" height="18" rx="4" fill="${CHART_COLORS.teal}"></rect>
        <text class="bar-value" x="${labelWidth + chartWidth + 16}" y="${y + 15}">${formatNumber(item.participating)} / ${formatNumber(item.members)}</text>
        <text class="axis-label" x="${labelWidth}" y="${y + 36}">${formatPercent(item.rate)}</text>
      `;
    })
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Council members and participating counts">
      ${bars}
      <text class="axis-label" x="${labelWidth}" y="${height - 4}">teal = participating, gray = total members</text>
    </svg>
  `;
}

function renderHorizontalBars(container, data, options = {}) {
  const filtered = data.filter((item) => Number.isFinite(item.value));
  if (!filtered.length) {
    container.innerHTML = chartEmpty("No data in the current selection");
    return;
  }

  const visible = filtered.slice(0, options.limit || filtered.length);
  const width = options.width || 760;
  const rowHeight = 42;
  const height = visible.length * rowHeight + 28;
  const labelWidth = options.labelWidth || 210;
  const valueLabelWidth = options.valueLabelWidth || 116;
  const chartWidth = width - labelWidth - valueLabelWidth;
  const absolute = options.absolute || false;
  const maxValue =
    options.maxValue || Math.max(...visible.map((item) => (absolute ? Math.abs(item.value) : item.value)), 1);
  const zeroX = absolute ? labelWidth + chartWidth / 2 : labelWidth;
  const scaleWidth = absolute ? chartWidth / 2 : chartWidth;

  const bars = visible
    .map((item, index) => {
      const y = index * rowHeight + 18;
      const magnitude = Math.max((Math.abs(item.value) / maxValue) * scaleWidth, item.value ? 2 : 0);
      const x = absolute && item.value < 0 ? zeroX - magnitude : zeroX;
      const color =
        item.color ||
        (absolute
          ? item.value >= 0
            ? CHART_COLORS.teal
            : CHART_COLORS.red
          : options.color || CHART_COLORS.teal);
      const label = compactLabel(item.name, options.maxLabelLength || 30);
      return `
        <text class="bar-label" x="0" y="${y + 14}">${escapeHtml(label)}</text>
        <rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="16" rx="4" fill="${CHART_COLORS.soft}"></rect>
        ${absolute ? `<line x1="${zeroX}" x2="${zeroX}" y1="${y - 3}" y2="${y + 19}" stroke="#d4dee7"></line>` : ""}
        <rect x="${x}" y="${y}" width="${magnitude}" height="16" rx="4" fill="${color}"></rect>
        <text class="bar-value" x="${labelWidth + chartWidth + 14}" y="${y + 13}">${options.formatter ? options.formatter(item.value) : formatNumber(item.value)}</text>
      `;
    })
    .join("");

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.label || "Horizontal bar chart")}">${bars}</svg>`;
}

function renderPeriodComparison(container, latestSummary, baselineSummary) {
  const width = 520;
  const height = 230;
  const groups = [
    {
      label: "Members",
      baseline: baselineSummary.members,
      latest: latestSummary.members,
      formatter: formatNumber,
    },
    {
      label: "Participating",
      baseline: baselineSummary.participating,
      latest: latestSummary.participating,
      formatter: formatNumber,
    },
    {
      label: "Rate",
      baseline: baselineSummary.rate,
      latest: latestSummary.rate,
      formatter: formatPercent,
    },
  ];
  const maxes = groups.map((group) => Math.max(group.baseline || 0, group.latest || 0, 0.01));
  const groupWidth = 150;
  const originY = 172;
  const maxHeight = 104;

  const bars = groups
    .map((group, index) => {
      const x = 34 + index * groupWidth;
      const max = maxes[index];
      const baseHeight = ((group.baseline || 0) / max) * maxHeight;
      const latestHeight = ((group.latest || 0) / max) * maxHeight;
      return `
        <text class="bar-label" x="${x}" y="28">${group.label}</text>
        <rect x="${x + 6}" y="${originY - baseHeight}" width="38" height="${baseHeight}" rx="5" fill="${CHART_COLORS.slate}"></rect>
        <rect x="${x + 52}" y="${originY - latestHeight}" width="38" height="${latestHeight}" rx="5" fill="${CHART_COLORS.teal}"></rect>
        <text class="axis-label" x="${x + 6}" y="${originY + 22}">${baselinePeriod}</text>
        <text class="axis-label" x="${x + 52}" y="${originY + 22}">${latestPeriod}</text>
        <text class="bar-value" x="${x + 6}" y="${originY - baseHeight - 8}">${group.formatter(group.baseline)}</text>
        <text class="bar-value" x="${x + 52}" y="${originY - latestHeight - 8}">${group.formatter(group.latest)}</text>
      `;
    })
    .join("");

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Period comparison">${bars}</svg>`;
}

function renderCouncilSummary(data) {
  $("#councilSummaryRows").innerHTML = data
    .slice()
    .sort((a, b) => b.members - a.members)
    .map(
      (item) => `
      <tr>
        <td class="text">${escapeHtml(item.name)}</td>
        <td>${formatNumber(item.units)}</td>
        <td>${formatNumber(item.members)}</td>
        <td>${formatNumber(item.participating)}</td>
        <td><span class="rate-pill${rateClass(item.rate)}">${formatPercent(item.rate)}</span></td>
      </tr>
    `
    )
    .join("");
}

function renderCouncilDeltaRows(comparisons) {
  $("#councilDeltaRows").innerHTML = comparisons
    .slice()
    .sort((a, b) => (b.deltaRate ?? -999) - (a.deltaRate ?? -999))
    .map(
      (item) => `
      <tr>
        <td class="text">${escapeHtml(item.name)}</td>
        <td>${formatPercent(item.baseline?.rate)}</td>
        <td>${formatPercent(item.latest?.rate)}</td>
        <td><span class="rate-pill${valueClass(item.deltaRate)}">${formatDeltaPct(item.deltaRate)}</span></td>
        <td><span class="${valueClass(item.deltaMembers)}">${formatDeltaNumber(item.deltaMembers)}</span></td>
      </tr>
    `
    )
    .join("");
}

function storyCard(title, body, context) {
  return `
    <article class="story-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      ${context ? `<span>${escapeHtml(context)}</span>` : ""}
    </article>
  `;
}

function renderExecutivePriorityRows(rows) {
  $("#executivePriorityRows").innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="text">${escapeHtml(row.question)}</td>
        <td class="text">${escapeHtml(row.evidence)}</td>
        <td class="text">${escapeHtml(row.signal)}</td>
        <td class="text">${escapeHtml(row.status)}</td>
      </tr>
    `
    )
    .join("");
}

function renderExecutiveSegmentRows(segments) {
  $("#executiveSegmentRows").innerHTML = segments
    .map(
      (segment) => `
      <tr>
        <td class="text">${escapeHtml(segment.label)}</td>
        <td>${formatNumber(segment.members)}</td>
        <td><span class="rate-pill${rateClass(segment.rate)}">${formatPercent(segment.rate)}</span></td>
        <td class="text">${escapeHtml(segment.meaning)}</td>
      </tr>
    `
    )
    .join("");
}

function actionOutcomeData(latest, segments) {
  const dropoffs = ageDropoffData(segments);
  const biggestDrop = dropoffs
    .filter((item) => Number.isFinite(item.change) && item.change < 0)
    .sort((a, b) => a.change - b.change)[0];
  const lowRateUnits = latest.filter((row) => Number.isFinite(row.rate) && row.rate < 0.12);
  const farUnits = latest.filter((row) => distanceTierRank(row.councilDistanceTier) >= 3);
  const farSummary = summarize(farUnits);
  const executionGaps = latest.filter(
    (row) => row.isolationVsPerformance === "Low isolation / Low participation"
  );
  const highDistanceLow = latest.filter(
    (row) => row.isolationVsPerformance === "High isolation / Low participation"
  );
  const resilient = latest.filter(
    (row) => row.isolationVsPerformance === "High isolation / High participation"
  );
  const olderSingles = segments.find((segment) => segment.segmentId === "singles46plus");

  return [
    {
      icon: "bridge",
      action: "Repair the age-bucket handoff",
      need: biggestDrop
        ? `${biggestDrop.to.name} is ${formatAbsDeltaPct(
            biggestDrop.change
          )} lower than ${biggestDrop.from.name}.`
        : "No adult age-bucket drop-off is visible yet; keep monitoring the handoffs.",
      outcome: "Keep adults participating as they move from one life stage to the next.",
      proof: biggestDrop
        ? `${biggestDrop.to.name} participation rises from ${formatPercent(
            biggestDrop.to.rate
          )}, and the drop-off gets smaller over time.`
        : "The age-bucket trend remains stable or improves over time.",
    },
    {
      icon: "target",
      action: "Prioritize low-rate units first",
      need: `${formatNumber(lowRateUnits.length)} units are below 12% participation in the current selection.`,
      outcome: "Move the bottom of the portfolio, where a few more participating adults can materially lift the rate.",
      proof: "The count of units below 12% falls, and the bottom-line participation rate rises.",
    },
    {
      icon: "route",
      action: "Localize or cluster high-distance units",
      need: `${formatNumber(farSummary.units)} units are at least 40 miles from the council centroid; ${formatNumber(
        highDistanceLow.length
      )} also have low participation.`,
      outcome: "Reduce travel friction through nearby gatherings, rotating locations, and cross-stake clusters.",
      proof: `40+ mile unit participation improves from ${formatPercent(
        farSummary.rate
      )}, with more participating adults in those units.`,
    },
    {
      icon: "users",
      action: "Design a 46+ male re-engagement play",
      need: `Singles 46+ show ${formatGenderGap(
        olderSingles?.genderGap
      )} between female and male participation rates.`,
      outcome: "Increase belonging and participation among older single men instead of relying on general adult programming.",
      proof: `The 46+ male rate rises from ${formatPercent(
        olderSingles?.maleRate
      )}, and the gender gap narrows.`,
    },
    {
      icon: "hand",
      action: "Pair strong outliers with execution-gap units",
      need: `${formatNumber(resilient.length)} high-distance units are still participating well; ${formatNumber(
        executionGaps.length
      )} nearby-access units are underperforming.`,
      outcome: "Transfer repeatable practices from units succeeding despite constraints into units where execution is the barrier.",
      proof: "Execution-gap units improve, and resilient practices show up in stake-rep feedback.",
    },
  ];
}

function renderActionOutcomeRows(rows) {
  $("#actionOutcomeRows").innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td class="text">
          <span class="action-cell">
            <span class="action-icon">${iconSvg(row.icon)}</span>
            <span>${escapeHtml(row.action)}</span>
          </span>
        </td>
        <td class="text">${escapeHtml(row.need)}</td>
        <td class="text">${escapeHtml(row.outcome)}</td>
        <td class="text">${escapeHtml(row.proof)}</td>
      </tr>
    `
    )
    .join("");
}

function renderExecutive() {
  const latest = currentRows();
  const prior = priorRows();
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const ageRows = latestAgeSourceRows();
  const segments = ageSegmentData(ageRows);
  const olderSingles = segments.find((segment) => segment.segmentId === "singles46plus");
  const councilLatest = aggregate(latest, "coordinatingCouncil").sort((a, b) => b.rate - a.rate);
  const leadingCouncil = councilLatest[0];
  const trailingCouncil = councilLatest[councilLatest.length - 1];
  const rateDelta =
    Number.isFinite(latestSummary.rate) && Number.isFinite(priorSummary.rate)
      ? latestSummary.rate - priorSummary.rate
      : null;

  $("#executiveKpis").innerHTML = [
    kpiCard(
      "Adult Participation",
      formatPercent(latestSummary.rate),
      `${formatNumber(latestSummary.participating)} of ${formatNumber(latestSummary.members)} singles 18+ participating`,
      {
        value: rateDelta,
        label: `${formatDeltaPct(rateDelta)} vs ${baselinePeriod}`,
      }
    ),
    kpiCard(
      "Tracker Scope",
      "5 areas",
      "Community, spirituality, relationships, council impact, feedback",
      null
    ),
    kpiCard(
      "Council Impact Items",
      "3 measures",
      "Coordination, new opportunities, and overall value",
      null
    ),
    kpiCard(
      "46+ Gender Gap",
      formatGenderGap(olderSingles?.genderGap),
      "Female minus male participation rate among Singles 46+",
      {
        value: olderSingles?.genderGap,
        label: `${formatPercent(olderSingles?.femaleRate)} female; ${formatPercent(olderSingles?.maleRate)} male`,
      }
    ),
  ].join("");

  $("#executiveNarrative").innerHTML = [
    storyCard(
      "Persona: Area Seventy / Senior Leaders",
      "Is the council valuable, and is it making a measurable difference for adult singles across stakes?",
      "Stake Rep Tracker proof frame"
    ),
    storyCard(
      "Bottom-Line Proof Today",
      `${formatNumber(latestSummary.units)} units across ${formatNumber(
        latestSummary.stakes
      )} stakes or districts are represented after excluding under-18 rows; participation movement is visible by council, stake, and unit.`,
      `${latestPeriod} adult source snapshot`
    ),
    storyCard(
      "What Completes The Brief",
      "Stake reps will answer whether singles are more connected, spiritually engaged, forming relationships, and seeing council-created opportunities that would not otherwise exist.",
      "Repeated periodically for time over time proof"
    ),
  ].join("");

  renderExecutivePriorityRows([
    {
      question: "Are singles more connected and participating more?",
      evidence:
        "comm_stake_act; comm_stake_12_ago; comm_stake_12_partic; comm_stake_6mon; comm_groups_form",
      signal: `${formatPercent(latestSummary.rate)} adult participation; ${formatDeltaPct(
        rateDelta
      )} versus ${baselinePeriod}.`,
      status: "Partially populated from SQL; tracker responses add social connection and activity frequency.",
    },
    {
      question: "Are single adults more spiritually engaged and optimistic?",
      evidence: "spiritual_engaged; spiritual_more_invol; spiritual_morale",
      signal: "Not measured in the SQL participation extract.",
      status: "Needs stake rep tracker responses before the dashboard can prove movement.",
    },
    {
      question: "Are relationships and marriages forming through singles efforts?",
      evidence: "relations_dates; relations_marriage; relations_hopeful",
      signal: "Not measured in the SQL participation extract.",
      status: "Needs tracker response data for 6-month dating, marriage, and hopefulness indicators.",
    },
    {
      question: "Has the council improved cross-stake coordination and created new opportunities?",
      evidence: "council_improved; council_opps; council_opps_yes; council_overall",
      signal: `${formatNumber(councilLatest.length)} councils and ${formatNumber(
        latestSummary.stakes
      )} stakes represented in the adult participation view.`,
      status: "Council value proof depends on tracker responses for coordination, opportunity creation, and overall value.",
    },
    {
      question: "What support should leadership prioritize next?",
      evidence: "feedback_challenge; feedback_support",
      signal: `${leadingCouncil?.name} leads at ${formatPercent(
        leadingCouncil?.rate
      )}; ${trailingCouncil?.name} trails at ${formatPercent(trailingCouncil?.rate)}.`,
      status: "Use open feedback with the stake/unit action tab to turn findings into council work.",
    },
  ]);

  renderExecutiveSegmentRows(
    segments.map((segment) => ({
      ...segment,
      meaning: segment.meaning,
    }))
  );
  renderActionOutcomeRows(actionOutcomeData(latest, segments));

  $("#executiveCouncilSubtitle").textContent = `${latestPeriod}; ${ageSegmentInfo().label}`;
  renderHorizontalBars(
    $("#executiveCouncilChart"),
    councilLatest.map((item) => ({ name: item.name, value: item.rate })),
    {
      label: "Council standing by participation rate",
      formatter: formatPercent,
      maxValue: Math.max(...councilLatest.map((item) => item.rate), 0.01),
      width: 520,
      labelWidth: 198,
      maxLabelLength: 23,
      color: CHART_COLORS.gold,
    }
  );
}

function renderAgeGenderRows(ageData) {
  $("#ageGenderRows").innerHTML = ageData
    .map(
      (item) => `
      <tr>
        <td class="text">${escapeHtml(item.ageGroup)}</td>
        <td>${formatNumber(item.members)}</td>
        <td>${formatNumber(item.participating)}</td>
        <td><span class="rate-pill${rateClass(item.rate)}">${formatPercent(item.rate)}</span></td>
        <td>${formatPercent(item.maleRate)}</td>
        <td>${formatPercent(item.femaleRate)}</td>
        <td><span class="rate-pill${valueClass(item.genderGap)}">${formatGenderGap(item.genderGap)}</span></td>
      </tr>
    `
    )
    .join("");
}

function renderAgeDropoffRows(dropoffs) {
  $("#ageDropoffRows").innerHTML = dropoffs
    .map(
      (item) => `
      <tr>
        <td class="text">${escapeHtml(item.transition)}</td>
        <td>${formatPercent(item.from.rate)}</td>
        <td>${formatPercent(item.to.rate)}</td>
        <td><span class="rate-pill${valueClass(item.change)}">${formatDeltaPct(item.change)}</span></td>
        <td class="text">${escapeHtml(item.interpretation)}</td>
      </tr>
    `
    )
    .join("");
}

function renderDemographics() {
  const ageRows = latestAgeSourceRows();
  const segmentData = ageSegmentData(ageRows);
  const lowestAdult = segmentData.reduce(
    (lowest, item) => (!lowest || item.rate < lowest.rate ? item : lowest),
    null
  );
  const ysa = segmentData.find((segment) => segment.segmentId === "ysa");
  const singleAdults = segmentData.find((segment) => segment.segmentId === "singleAdults");
  const olderSingles = segmentData.find((segment) => segment.segmentId === "singles46plus");
  const dropoffs = ageDropoffData(segmentData);
  const biggestDrop = dropoffs
    .filter((item) => Number.isFinite(item.change) && item.change < 0)
    .sort((a, b) => a.change - b.change)[0];
  const maxAgeRate = Math.max(...segmentData.map((item) => item.rate), 0.01);
  const maxGap = Math.max(...segmentData.map((item) => Math.abs(item.genderGap || 0)), 0.01);

  $("#demographicKpis").innerHTML = [
    kpiCard(
      "Lowest Segment",
      formatPercent(lowestAdult?.rate),
      `${lowestAdult?.label || "--"}; ${formatNumber(lowestAdult?.members)} members`,
      null
    ),
    kpiCard(
      "YSA 18-35",
      formatPercent(ysa?.rate),
      `${formatNumber(ysa?.participating)} of ${formatNumber(ysa?.members)} participating`,
      null
    ),
    kpiCard(
      "SA 36-45",
      formatPercent(singleAdults?.rate),
      `${formatNumber(singleAdults?.participating)} of ${formatNumber(singleAdults?.members)} participating`,
      null
    ),
    kpiCard(
      "46+ Male Rate",
      formatPercent(olderSingles?.maleRate),
      `${formatGenderGap(olderSingles?.genderGap)} versus female rate`,
      null
    ),
  ].join("");

  renderStoryCards($("#demographicStory"), [
    {
      title: "Persona: Age-Bucket Owners",
      body: "This page shows where participation falls between life stages, so programming can be designed for the moment people actually disengage.",
      context: "YSA, SA, and Singles strategies",
    },
    {
      title: "Bottom-Line Lever",
      body: biggestDrop
        ? `${biggestDrop.transition} is the sharpest drop at ${formatDeltaPct(
            biggestDrop.change
          )}. That is the handoff the council must repair.`
        : "No participation drop-off is visible between the adult buckets in the current data.",
      context: "Protect the handoff",
    },
    {
      title: "Gender Lens",
      body: `Singles 46+ show ${formatGenderGap(
        olderSingles?.genderGap
      )}; older outreach should account for male re-engagement separately from general adult programming.`,
      context: "Different age buckets need different plays",
    },
  ]);

  $("#ageCurveSubtitle").textContent = `${latestPeriod}; under-18 rows excluded`;
  renderHorizontalBars(
    $("#ageCurveChart"),
    segmentData.map((item) => ({
      name: item.name,
      value: item.rate,
      color: item.segmentId === "singleAdults" ? CHART_COLORS.gold : CHART_COLORS.teal,
    })),
    {
      label: "Age segment participation",
      formatter: formatPercent,
      maxValue: maxAgeRate,
      width: 760,
      labelWidth: 170,
      maxLabelLength: 24,
    }
  );
  renderHorizontalBars(
    $("#genderGapChart"),
    segmentData.map((item) => ({ name: item.name, value: item.genderGap })),
    {
      label: "Gender gap by age segment",
      formatter: formatGenderGap,
      absolute: true,
      maxValue: maxGap,
      width: 660,
      labelWidth: 134,
      valueLabelWidth: 214,
      maxLabelLength: 18,
    }
  );
  renderAgeDropoffRows(dropoffs);
  renderAgeGenderRows(segmentData);
}

function renderArchetypeRows(archetypes) {
  $("#archetypeRows").innerHTML = archetypes
    .map(
      (item) => `
      <tr>
        <td class="text">${escapeHtml(item.name)}</td>
        <td>${formatNumber(item.units)}</td>
        <td><span class="rate-pill${rateClass(item.rate)}">${formatPercent(item.rate)}</span></td>
        <td class="text">${escapeHtml(ARCHETYPE_STRATEGIES[item.name] || "Review locally")}</td>
      </tr>
    `
    )
    .join("");
}

function renderPriorityUnitRows(rows) {
  $("#priorityUnitRows").innerHTML = rows
    .slice()
    .sort((a, b) => (b.unitPriorityIndex || 0) - (a.unitPriorityIndex || 0))
    .slice(0, 12)
    .map(
      (row) => `
      <tr>
        <td class="text">${escapeHtml(row.unitName)}</td>
        <td class="text">${escapeHtml(row.stakeOrDistrict)}</td>
        <td class="text">${escapeHtml(row.coordinatingCouncil)}</td>
        <td>${formatNumber(row.members)}</td>
        <td><span class="rate-pill${rateClass(row.rate)}">${formatPercent(row.rate)}</span></td>
        <td>${formatScore(row.unitPriorityIndex)}</td>
        <td class="text">${escapeHtml(row.isolationVsPerformance || "--")}</td>
      </tr>
    `
    )
    .join("");
}

function mapRateColor(rate) {
  if (!Number.isFinite(rate)) return CHART_COLORS.slate;
  if (rate < 0.12) return CHART_COLORS.red;
  if (rate < 0.2) return CHART_COLORS.gold;
  return CHART_COLORS.teal;
}

function stableHash(value) {
  return String(value || "").split("").reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) % 9973;
  }, 7);
}

function renderParticipationMap(container, rows) {
  const points = rows.filter(
    (row) =>
      Number.isFinite(row.cityLatitude) &&
      Number.isFinite(row.cityLongitude) &&
      Number.isFinite(row.rate)
  );
  if (!points.length) {
    container.innerHTML = chartEmpty("No geocoded unit participation in the current selection");
    return;
  }

  const width = 920;
  const height = 450;
  const pad = 42;
  const lats = points.map((point) => point.cityLatitude);
  const lons = points.map((point) => point.cityLongitude);
  const minLat = Math.min(...lats) - 0.35;
  const maxLat = Math.max(...lats) + 0.35;
  const minLon = Math.min(...lons) - 0.55;
  const maxLon = Math.max(...lons) + 0.55;
  const maxMembers = Math.max(...points.map((point) => point.members || 0), 1);

  const project = (lon, lat) => ({
    x: pad + ((lon - minLon) / (maxLon - minLon || 1)) * (width - pad * 2),
    y: height - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (height - pad * 2),
  });

  const labels = [
    { name: "New York", lat: 41.3, lon: -74.6 },
    { name: "New Jersey", lat: 40.1, lon: -74.6 },
    { name: "Pennsylvania", lat: 40.2, lon: -77.4 },
    { name: "Delaware", lat: 39.1, lon: -75.5 },
    { name: "Maryland", lat: 39.1, lon: -76.8 },
    { name: "D.C.", lat: 38.9, lon: -77.0 },
    { name: "Virginia", lat: 38.2, lon: -77.7 },
  ]
    .filter((label) => label.lat >= minLat && label.lat <= maxLat && label.lon >= minLon && label.lon <= maxLon)
    .map((label) => {
      const { x, y } = project(label.lon, label.lat);
      return `<text class="map-label" x="${x}" y="${y}">${escapeHtml(label.name)}</text>`;
    })
    .join("");

  const heat = points
    .map((point, index) => {
      const base = project(point.cityLongitude, point.cityLatitude);
      const hash = stableHash(point.unitJoinKey || point.unitName);
      const angle = (hash % 360) * (Math.PI / 180);
      const offset = (hash % 7) + (index % 3);
      const x = base.x + Math.cos(angle) * offset;
      const y = base.y + Math.sin(angle) * offset;
      const color = mapRateColor(point.rate);
      const radius = 11 + Math.sqrt((point.members || 0) / maxMembers) * 30;
      return `
        <circle class="map-heat" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(
          1
        )}" fill="${color}"></circle>
      `;
    })
    .join("");

  const dots = points
    .map((point, index) => {
      const base = project(point.cityLongitude, point.cityLatitude);
      const hash = stableHash(point.unitJoinKey || point.unitName);
      const angle = (hash % 360) * (Math.PI / 180);
      const offset = (hash % 7) + (index % 3);
      const x = base.x + Math.cos(angle) * offset;
      const y = base.y + Math.sin(angle) * offset;
      const color = mapRateColor(point.rate);
      const radius = 3.5 + Math.sqrt((point.members || 0) / maxMembers) * 5.5;
      return `
        <circle class="map-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(
          1
        )}" fill="${color}">
          <title>${escapeHtml(point.unitName)} (${escapeHtml(point.city || "--")}): ${formatPercent(
            point.rate
          )}; ${formatNumber(point.participating)} of ${formatNumber(point.members)} participating</title>
        </circle>
      `;
    })
    .join("");

  container.innerHTML = `
    <svg class="participation-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="Unit participation heatmap by city">
      <rect class="map-bg" x="0" y="0" width="${width}" height="${height}" rx="8"></rect>
      <path class="map-coast" d="M760 40 C735 100 725 150 744 204 C765 264 738 306 760 398"></path>
      <path class="map-river" d="M485 85 C520 140 516 198 555 250 C590 295 586 350 625 405"></path>
      <path class="map-river" d="M655 92 C620 150 618 205 655 252 C688 292 686 346 712 398"></path>
      <g class="map-grid">
        <line x1="140" x2="140" y1="38" y2="410"></line>
        <line x1="300" x2="300" y1="38" y2="410"></line>
        <line x1="460" x2="460" y1="38" y2="410"></line>
        <line x1="620" x2="620" y1="38" y2="410"></line>
        <line x1="780" x2="780" y1="38" y2="410"></line>
        <line x1="44" x2="876" y1="130" y2="130"></line>
        <line x1="44" x2="876" y1="230" y2="230"></line>
        <line x1="44" x2="876" y1="330" y2="330"></line>
      </g>
      <g>${labels}</g>
      <g>${heat}</g>
      <g>${dots}</g>
      <g class="map-legend" transform="translate(48 382)">
        <rect x="0" y="-24" width="348" height="50" rx="8"></rect>
        <circle cx="20" cy="0" r="7" fill="${CHART_COLORS.red}"></circle>
        <text x="34" y="4">Lower participation</text>
        <circle cx="158" cy="0" r="7" fill="${CHART_COLORS.gold}"></circle>
        <text x="172" y="4">Middle</text>
        <circle cx="244" cy="0" r="7" fill="${CHART_COLORS.teal}"></circle>
        <text x="258" y="4">Higher</text>
        <text class="map-legend-note" x="0" y="22">Circle size reflects member count; color reflects participation rate.</text>
      </g>
    </svg>
  `;
}

function renderGeography() {
  const latest = currentRows();
  const latestSummary = summarize(latest);
  const avgDistance = averageField(latest, "milesToCouncilCentroid");
  const farUnits = latest.filter((row) => distanceTierRank(row.councilDistanceTier) >= 3);
  const farSummary = summarize(farUnits);
  const executionGap = latest.filter(
    (row) => row.isolationVsPerformance === "Low isolation / Low participation"
  );
  const resilient = latest.filter(
    (row) => row.isolationVsPerformance === "High isolation / High participation"
  );
  const archetypes = aggregate(latest, (row) => row.isolationVsPerformance || "Unassigned").sort(
    (a, b) => a.name.localeCompare(b.name)
  );
  const distanceData = aggregate(latest, (row) => cleanDistanceTier(row.councilDistanceTier)).sort(
    (a, b) => distanceTierRank(a.name) - distanceTierRank(b.name)
  );
  const highPriorityUnits = latest
    .slice()
    .sort((a, b) => (b.unitPriorityIndex || 0) - (a.unitPriorityIndex || 0));
  const topPriorityUnit = highPriorityUnits[0];

  $("#geographyKpis").innerHTML = [
    kpiCard(
      "Average Distance",
      Number.isFinite(avgDistance) ? `${avgDistance.toFixed(0)} mi` : "--",
      `Council centroid distance across ${formatNumber(latestSummary.units)} units`,
      null
    ),
    kpiCard(
      "40+ Mile Units",
      formatNumber(farSummary.units),
      `${formatPercent(farSummary.rate)} participation; ${formatNumber(farSummary.members)} members`,
      null
    ),
    kpiCard(
      "Execution Gaps",
      formatNumber(executionGap.length),
      "Low isolation / low participation units",
      null
    ),
    kpiCard(
      "Resilient Outliers",
      formatNumber(resilient.length),
      "High isolation / high participation units",
      null
    ),
  ].join("");

  renderStoryCards($("#geographyStory"), [
    {
      title: "Persona: Logistics And Calendar Owners",
      body: "This page shows where geography is creating friction, so the council can decide when to localize, cluster, rotate, or replicate.",
      context: "Reduce travel friction",
    },
    {
      title: "Bottom-Line Lever",
      body: `${formatNumber(farSummary.units)} units are 40+ miles from the council centroid at ${formatPercent(
        farSummary.rate
      )} participation.`,
      context: "Distance is a design constraint",
    },
    {
      title: "Action Queue",
      body: topPriorityUnit
        ? `${topPriorityUnit.unitName} in ${topPriorityUnit.stakeOrDistrict} is the highest priority unit in this selection.`
        : "No priority unit is available for the current selection.",
      context: "Turn structure into visits, clusters, and mentoring",
    },
  ]);

  $("#distanceTierSubtitle").textContent = `${latestPeriod}; ${ageSegmentInfo().label}`;
  $("#participationMapSubtitle").textContent = `${latestPeriod}; ${formatNumber(
    latest.filter((row) => Number.isFinite(row.cityLatitude) && Number.isFinite(row.cityLongitude)).length
  )} geocoded units; ${ageSegmentInfo().label}`;
  renderParticipationMap($("#participationMap"), latest);
  renderHorizontalBars(
    $("#distanceTierChart"),
    distanceData.map((item) => ({
      name: item.name,
      value: item.rate,
      color: distanceTierRank(item.name) >= 3 ? CHART_COLORS.gold : CHART_COLORS.teal,
    })),
    {
      label: "Participation by distance tier",
      formatter: formatPercent,
      maxValue: Math.max(...distanceData.map((item) => item.rate), 0.01),
      width: 760,
      labelWidth: 110,
      maxLabelLength: 18,
    }
  );
  renderArchetypeRows(archetypes);
  renderPriorityUnitRows(latest);
}

function renderUnitMovementRows(movements) {
  $("#unitMovementRows").innerHTML = movements
    .map(
      (item) => `
      <tr>
        <td class="text">${escapeHtml(item.name)}</td>
        <td class="text">${escapeHtml(item.stakeOrDistrict)}</td>
        <td class="text">${escapeHtml(item.coordinatingCouncil)}</td>
        <td>${formatPercent(item.baseline?.rate)}</td>
        <td>${formatPercent(item.latest?.rate)}</td>
        <td><span class="rate-pill${valueClass(item.deltaRate)}">${formatDeltaPct(item.deltaRate)}</span></td>
        <td><span class="${valueClass(item.deltaMembers)}">${formatDeltaNumber(item.deltaMembers)}</span></td>
      </tr>
    `
    )
    .join("");
}

function renderTime() {
  const latest = currentRows();
  const prior = priorRows();
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const coverage = coverageSummary(latest, prior);
  const rateDelta =
    Number.isFinite(latestSummary.rate) && Number.isFinite(priorSummary.rate)
      ? latestSummary.rate - priorSummary.rate
      : null;
  const councilComparisons = comparisonByKey(latest, prior, "coordinatingCouncil");
  const stakeComparisons = comparisonByKey(latest, prior, "stakeOrDistrict")
    .filter((item) => item.latest && item.baseline && Number.isFinite(item.deltaRate))
    .sort((a, b) => Math.abs(b.deltaRate) - Math.abs(a.deltaRate))
    .slice(0, 12);
  const unitMovements = comparisonByUnit(latest, prior)
    .filter((item) => item.latest && item.baseline && Number.isFinite(item.deltaRate))
    .sort((a, b) => Math.abs(b.deltaRate) - Math.abs(a.deltaRate))
    .slice(0, 20);
  const bestCouncilMove = councilComparisons
    .filter((item) => Number.isFinite(item.deltaRate))
    .sort((a, b) => b.deltaRate - a.deltaRate)[0];
  const watchCouncilMove = councilComparisons
    .filter((item) => Number.isFinite(item.deltaRate))
    .sort((a, b) => a.deltaRate - b.deltaRate)[0];

  $("#timeKpis").innerHTML = [
    kpiCard(
      "Rate Change",
      formatDeltaPct(rateDelta),
      `${formatPercent(priorSummary.rate)} to ${formatPercent(latestSummary.rate)}`,
      null
    ),
    kpiCard(
      "Participating Change",
      formatDeltaNumber(latestSummary.participating - priorSummary.participating),
      `${baselinePeriod} to ${latestPeriod}`,
      null
    ),
    kpiCard(
      "Member Change",
      formatDeltaNumber(latestSummary.members - priorSummary.members),
      `${baselinePeriod} to ${latestPeriod}`,
      null
    ),
    kpiCard(
      "Comparable Units",
      formatNumber(coverage.matched),
      `${formatNumber(coverage.newUnits)} new; ${formatNumber(coverage.missingUnits)} prior-only`,
      null
    ),
  ].join("");

  renderStoryCards($("#timeStory"), [
    {
      title: "Persona: Accountability Review",
      body: "This page answers whether the council is moving participation over time, not just describing the current state.",
      context: "Repeatable operating review",
    },
    {
      title: "Bottom-Line Movement",
      body: `${formatDeltaPct(rateDelta)} rate movement and ${formatDeltaNumber(
        latestSummary.participating - priorSummary.participating
      )} participating adults versus the prior source snapshot.`,
      context: "Movement is the executive proof",
    },
    {
      title: "Where To Investigate",
      body:
        bestCouncilMove && watchCouncilMove
          ? `${bestCouncilMove.name} improved most at ${formatDeltaPct(
              bestCouncilMove.deltaRate
            )}; ${watchCouncilMove.name} needs review at ${formatDeltaPct(watchCouncilMove.deltaRate)}.`
          : "Council movement is not available for this selection.",
      context: "Scale wins, diagnose losses",
    },
  ]);

  $("#timeCouncilSubtitle").textContent = `${baselinePeriod} to ${latestPeriod}; ${ageSegmentInfo().label}`;
  renderHorizontalBars(
    $("#timeCouncilDeltaChart"),
    councilComparisons
      .map((item) => ({ name: item.name, value: item.deltaRate }))
      .sort((a, b) => (b.value ?? -999) - (a.value ?? -999)),
    {
      label: "Council rate movement",
      formatter: formatDeltaPct,
      absolute: true,
      maxValue: Math.max(...councilComparisons.map((item) => Math.abs(item.deltaRate || 0)), 0.01),
      labelWidth: 210,
      valueLabelWidth: 184,
      width: 840,
    }
  );
  renderHorizontalBars(
    $("#stakeMovementChart"),
    stakeComparisons.map((item) => ({ name: item.name, value: item.deltaRate })),
    {
      label: "Stake rate movement leaders",
      formatter: formatDeltaPct,
      absolute: true,
      maxValue: Math.max(...stakeComparisons.map((item) => Math.abs(item.deltaRate || 0)), 0.01),
      width: 680,
      labelWidth: 218,
      valueLabelWidth: 184,
      maxLabelLength: 25,
    }
  );
  renderUnitMovementRows(unitMovements);
}

function filteredLatestRows() {
  const latest = currentRows();
  const query = state.query.trim().toLowerCase();
  return latest.filter((row) => {
    const councilMatches =
      state.council === "All councils" || row.coordinatingCouncil === state.council;
    const stakeMatches =
      state.stake === "All stakes / districts" || row.stakeOrDistrict === state.stake;
    const queryMatches =
      !query ||
      [row.unitName, row.city, row.stakeOrDistrict, row.coordinatingCouncil]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    return councilMatches && stakeMatches && queryMatches;
  });
}

function filteredLatestSourceRows() {
  const query = state.query.trim().toLowerCase();
  return latestAgeSourceRows().filter((row) => {
    const councilMatches =
      state.council === "All councils" || row.coordinatingCouncil === state.council;
    const stakeMatches =
      state.stake === "All stakes / districts" || row.stakeOrDistrict === state.stake;
    const queryMatches =
      !query ||
      [row.unitName, row.city, row.stakeOrDistrict, row.coordinatingCouncil]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    return councilMatches && stakeMatches && queryMatches && rowIncludedByAge(row);
  });
}

function matchingPriorRows(latestItems) {
  const latestKeys = new Set(latestItems.map((row) => row.unitJoinKey));
  return priorRows().filter((row) => latestKeys.has(row.unitJoinKey));
}

function populateSelect(select, values, allLabel, selected) {
  select.innerHTML = [allLabel, ...values]
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  select.value = selected;
}

function refreshStakeOptions() {
  const latest = currentRows();
  const scoped =
    state.council === "All councils"
      ? latest
      : latest.filter((row) => row.coordinatingCouncil === state.council);
  const stakes = uniqueValues(scoped, "stakeOrDistrict");
  if (state.stake !== "All stakes / districts" && !stakes.includes(state.stake)) {
    state.stake = "All stakes / districts";
  }
  populateSelect($("#stakeFilter"), stakes, "All stakes / districts", state.stake);
}

function sortUnitRows(items, priorMap) {
  const withComparison = items.map((row) => {
    const prior = priorMap.get(row.unitJoinKey);
    return {
      ...row,
      prior,
      deltaRate:
        Number.isFinite(row.rate) && Number.isFinite(prior?.rate) ? row.rate - prior.rate : null,
      deltaMembers: (row.members || 0) - (prior?.members || 0),
    };
  });

  const sorters = {
    membersDesc: (a, b) => (b.members || 0) - (a.members || 0),
    rateAsc: (a, b) => (a.rate ?? 999) - (b.rate ?? 999),
    rateDesc: (a, b) => (b.rate ?? -1) - (a.rate ?? -1),
    unitAsc: (a, b) => a.unitName.localeCompare(b.unitName),
  };

  return withComparison.sort(sorters[state.sort]);
}

function renderUnitDetail(items) {
  const priorMap = new Map(priorRows().map((row) => [row.unitJoinKey, row]));
  const sorted = sortUnitRows(items, priorMap);
  $("#detailCount").textContent = `${formatNumber(sorted.length)} units in the current filter`;
  $("#unitDetailRows").innerHTML = sorted
    .map(
      (row) => `
      <tr>
        <td class="text">${escapeHtml(row.unitName)}</td>
        <td class="text">${escapeHtml(row.stakeOrDistrict)}</td>
        <td class="text">${escapeHtml(row.coordinatingCouncil)}</td>
        <td class="text">${escapeHtml(row.city || "--")}</td>
        <td>${formatNumber(row.members)}</td>
        <td>${formatNumber(row.participating)}</td>
        <td><span class="rate-pill${rateClass(row.rate)}">${formatPercent(row.rate)}</span></td>
        <td>${formatPercent(row.prior?.rate)}</td>
        <td><span class="rate-pill${valueClass(row.deltaRate)}">${formatDeltaPct(row.deltaRate)}</span></td>
      </tr>
    `
    )
    .join("");
}

function renderRepBrief(latest, prior) {
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const lowRateUnits = latest.filter((row) => Number.isFinite(row.rate) && row.rate < 0.12);
  const constrainedUnits = latest.filter(
    (row) => row.isolationVsPerformance === "High isolation / Low participation"
  );
  const stakes = aggregate(latest, "stakeOrDistrict").sort((a, b) => b.rate - a.rate);
  const strongestStake = stakes[0];
  const watchStake = stakes[stakes.length - 1];
  const rateDelta =
    Number.isFinite(latestSummary.rate) && Number.isFinite(priorSummary.rate)
      ? latestSummary.rate - priorSummary.rate
      : null;

  $("#repBrief").innerHTML = [
    storyCard(
      "Persona: Stake Representative",
      `${formatNumber(latestSummary.members)} members, ${formatNumber(
        latestSummary.participating
      )} participating, ${formatPercent(latestSummary.rate)} current rate.`,
      `${formatDeltaPct(rateDelta)} versus matched prior units`
    ),
    storyCard(
      "Bottom-Line Action",
      `${formatNumber(lowRateUnits.length)} units are below 12% participation; ${formatNumber(
        constrainedUnits.length
      )} are high-isolation / low-participation.`,
      "Local action queue"
    ),
    storyCard(
      "Rep Story",
      strongestStake
        ? `${strongestStake.name} leads the selected view at ${formatPercent(
            strongestStake.rate
          )}; ${watchStake?.name} is lowest at ${formatPercent(watchStake?.rate)}.`
        : "No stake benchmark is available for this filter.",
      "Compare nearby operating patterns"
    ),
  ].join("");
}

function renderFilteredAgePattern() {
  const filteredAgeRows = filteredLatestSourceRows();
  const ageData = ageSegmentData(filteredAgeRows);
  $("#filteredAgeSubtitle").textContent = `${latestPeriod}; ${ageSegmentInfo().label}`;
  renderHorizontalBars(
    $("#filteredAgeChart"),
    ageData.map((item) => ({
      name: item.name,
      value: item.rate,
      color: item.segmentId === "singleAdults" ? CHART_COLORS.gold : CHART_COLORS.teal,
    })),
    {
      label: "Filtered age segment participation pattern",
      formatter: formatPercent,
      maxValue: Math.max(...ageData.map((item) => item.rate), 0.01),
      width: 520,
      labelWidth: 134,
      maxLabelLength: 18,
    }
  );
}

function renderOverview() {
  const latest = currentRows();
  const prior = priorRows();
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const coverage = coverageSummary(latest, prior);
  const councilLatest = aggregate(latest, "coordinatingCouncil").sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const councilComparisons = comparisonByKey(latest, prior, "coordinatingCouncil");
  const rankedCouncils = councilLatest.slice().sort((a, b) => b.rate - a.rate);
  const leadingCouncil = rankedCouncils[0];
  const trailingCouncil = rankedCouncils[rankedCouncils.length - 1];
  const liftToLeader = participationLiftNeeded(trailingCouncil || {}, leadingCouncil?.rate);

  setKpis($("#overviewKpis"), latestSummary, priorSummary, coverage);
  renderStoryCards($("#overviewStory"), [
    {
      title: "Persona: Council Representatives",
      body: "This page turns the corridor into an operating portfolio: where scale is largest, where rates lag, and where coordination can create lift.",
      context: "Manage councils as an accountable system",
    },
    {
      title: "Bottom-Line Lever",
      body:
        leadingCouncil && trailingCouncil
          ? `${leadingCouncil.name} leads at ${formatPercent(
              leadingCouncil.rate
            )}; ${trailingCouncil.name} trails at ${formatPercent(trailingCouncil.rate)}.`
          : "Council standing is unavailable for the current selection.",
      context: "Benchmark against nearby success",
    },
    {
      title: "What Moves The Number",
      body: Number.isFinite(liftToLeader)
        ? `${formatNumber(liftToLeader)} additional participating adults would move ${trailingCouncil.name} to the current leading council rate.`
        : "Use the council summary and change table to identify where the next participation lift is most realistic.",
      context: "Translate rates into people",
    },
  ]);
  $("#latestScaleSubtitle").textContent = `${latestPeriod}; ${ageSegmentInfo().label}`;
  $("#periodComparisonSubtitle").textContent = `${baselinePeriod} to ${latestPeriod}; ${ageSegmentInfo().label}`;
  renderCouncilScale($("#councilScaleChart"), councilLatest);
  renderPeriodComparison($("#periodComparisonChart"), latestSummary, priorSummary);
  renderHorizontalBars(
    $("#councilRateChart"),
    councilLatest
      .map((item) => ({ name: item.name, value: item.rate }))
      .sort((a, b) => b.value - a.value),
    {
      label: "Participation rate by council",
      formatter: formatPercent,
      maxValue: Math.max(...councilLatest.map((item) => item.rate), 0.01),
      width: 520,
      labelWidth: 198,
      maxLabelLength: 23,
      color: CHART_COLORS.gold,
    }
  );
  renderCouncilSummary(councilLatest);
  renderCouncilDeltaRows(councilComparisons);
}

function renderDrilldown() {
  const latest = filteredLatestRows();
  const prior = matchingPriorRows(latest);
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const coverage = coverageSummary(latest, prior);
  const stakeLatest = aggregate(latest, "stakeOrDistrict")
    .map((item) => ({ name: item.name, value: item.rate, members: item.members }))
    .sort((a, b) => b.value - a.value);
  const stakeComparisons = comparisonByKey(latest, prior, "stakeOrDistrict")
    .filter((item) => item.latest || item.baseline)
    .map((item) => ({ name: item.name, value: item.deltaRate }))
    .sort((a, b) => (b.value ?? -999) - (a.value ?? -999));

  setKpis($("#drilldownKpis"), latestSummary, priorSummary, coverage);
  renderRepBrief(latest, prior);
  $("#stakeChartSubtitle").textContent =
    state.council === "All councils" ? `${latestPeriod}; all councils` : `${latestPeriod}; ${state.council}`;
  renderHorizontalBars($("#stakeRateChart"), stakeLatest, {
    label: "Stake and district participation rates",
    formatter: formatPercent,
    maxValue: Math.max(...stakeLatest.map((item) => item.value), 0.01),
    labelWidth: 270,
  });
  renderHorizontalBars($("#stakeDeltaChart"), stakeComparisons, {
    label: "Stake and district rate change",
    formatter: formatDeltaPct,
    absolute: true,
    maxValue: Math.max(...stakeComparisons.map((item) => Math.abs(item.value || 0)), 0.01),
    width: 680,
    labelWidth: 218,
    valueLabelWidth: 184,
    maxLabelLength: 25,
  });
  renderFilteredAgePattern();
  renderUnitDetail(latest);
}

function renderSource() {
  const segment = ageSegmentInfo();
  $("#ageSegmentNote").textContent = segment.description;
  $("#freshness").textContent = `${meta.sourceSystem}: ${meta.sourceServer}.${meta.sourceDatabase}.${meta.sourceSchema}. ${formatNumber(meta.rowCount)} source rows across ${baselinePeriod} and ${latestPeriod}.`;
  $("#sourceNote").textContent = `${meta.methodology} ${meta.caveat} The Executive Story tab maps the Stake Rep Tracker questions to the council-value proof model; every page uses the shared ageSegment variable for headline metrics, breakdowns, movement, and drilldowns.`;
}

function render() {
  renderExecutive();
  renderOverview();
  renderDemographics();
  renderGeography();
  renderTime();
  renderDrilldown();
  renderSource();
}

function decorateInterfaceIcons() {
  document.querySelectorAll(".tab").forEach((tab) => {
    const iconName = TAB_ICONS[tab.dataset.tab];
    if (iconName && !tab.querySelector(".ui-icon")) {
      tab.insertAdjacentHTML("afterbegin", iconSvg(iconName));
    }
  });

  const downloadButton = $("#downloadCsv");
  if (downloadButton && !downloadButton.querySelector(".ui-icon")) {
    downloadButton.insertAdjacentHTML("afterbegin", iconSvg("download"));
  }
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((button) => {
        const isActive = button.dataset.tab === state.activeTab;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });
      document.querySelectorAll(".panel").forEach((panel) => {
        const isActive = panel.id === `panel-${state.activeTab}`;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

function wireFilters() {
  $("#ageSegmentFilter").innerHTML = DASHBOARD_VARIABLES.ageSegment.options
    .map((segment) => `<option value="${escapeHtml(segment.id)}">${escapeHtml(segment.label)}</option>`)
    .join("");
  $("#ageSegmentFilter").value = state.ageSegment;

  populateSelect(
    $("#councilFilter"),
    uniqueValues(currentRows(), "coordinatingCouncil"),
    "All councils",
    state.council
  );
  refreshStakeOptions();

  $("#ageSegmentFilter").addEventListener("change", (event) => {
    state.ageSegment = event.target.value;
    refreshStakeOptions();
    render();
  });
  $("#councilFilter").addEventListener("change", (event) => {
    state.council = event.target.value;
    refreshStakeOptions();
    renderDrilldown();
  });
  $("#stakeFilter").addEventListener("change", (event) => {
    state.stake = event.target.value;
    renderDrilldown();
  });
  $("#unitSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderDrilldown();
  });
  $("#sortUnits").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderDrilldown();
  });
}

function wireDownload() {
  $("#downloadCsv").addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = "data/masc-sql-source-rows.csv";
    link.download = "masc-sql-source-rows.csv";
    link.click();
  });
}

decorateInterfaceIcons();
wireTabs();
wireFilters();
wireDownload();
render();
