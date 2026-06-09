const NUMBER_FIELDS = [
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
  "cityLongitude"
];

const INT_FIELDS = ["periodYear", "periodQuarter", "periodOrder", "lowParticipationFlag"];
const ALL = "all";
const MAP_WIDTH = 900;
const MAP_HEIGHT = 520;
const MAP_PADDING = 30;
const TILE_SIZE = 256;
const MAX_TILE_COUNT = 44;
const MAX_MERCATOR_LAT = 85.05112878;

const AGE_SEGMENTS = [
  {
    id: "ysa",
    label: "Young Single Adults",
    shortLabel: "YSA 18-35",
    minRank: 18,
    maxRank: 26,
    meaning: "Young-adult handoff and early retention."
  },
  {
    id: "singleAdults",
    label: "Single Adults",
    shortLabel: "SA 36-45",
    minRank: 36,
    maxRank: 36,
    meaning: "Mid-singles engagement and transition risk."
  },
  {
    id: "singles46plus",
    label: "Singles",
    shortLabel: "Singles 46+",
    minRank: 46,
    maxRank: 999,
    meaning: "Durable belonging and older-adult re-engagement."
  }
];

const app = document.getElementById("app");
const state = {
  activeTab: "executive",
  filters: {
    ageSegment: ALL,
    gender: ALL,
    period: ALL,
    council: ALL,
    stake: ALL,
    unitQuery: ""
  }
};

const dataset = window.MASC_DASHBOARD_DATA
  ? normalizeDataset(window.MASC_DASHBOARD_DATA)
  : null;

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeDataset(payload) {
  const rows = (payload.rows || [])
    .map((row) => {
      const next = { ...row };
      NUMBER_FIELDS.forEach((field) => {
        next[field] = toNumber(next[field]);
      });
      INT_FIELDS.forEach((field) => {
        const number = toNumber(next[field]);
        next[field] = Number.isFinite(number) ? Math.trunc(number) : null;
      });
      return next;
    })
    .filter((row) => row.sourceGrain !== "age_group" || ageGroupRank(row.ageGroup) >= 18);

  const periods = [...new Map(rows.map((row) => [row.period, row])).values()]
    .map((row) => ({
      period: row.period,
      periodYear: row.periodYear,
      periodQuarter: row.periodQuarter,
      periodOrder: row.periodOrder
    }))
    .sort((a, b) => (a.periodOrder || 0) - (b.periodOrder || 0));

  return {
    metadata: {
      ...payload.metadata,
      rowCount: rows.length,
      periods,
      baselinePeriod: payload.metadata?.baselinePeriod || periods[0]?.period,
      latestPeriod: payload.metadata?.latestPeriod || periods[periods.length - 1]?.period,
      ageRule: "Rows for ages 17 and younger are excluded before metrics are computed."
    },
    rows
  };
}

function ageGroupRank(ageGroup) {
  const value = String(ageGroup || "").trim();
  if (value === "0-17") return 0;
  if (value === "18-25") return 18;
  if (value === "26-35") return 26;
  if (value === "36-45") return 36;
  if (value === "46-55") return 46;
  if (value === "56-65") return 56;
  if (value === "66-75") return 66;
  if (value === "76+") return 76;
  return 999;
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
  return values.length ? values.reduce((sum, value) => sum + value, 0) : 0;
}

function summarize(items) {
  const members = sumField(items, "members");
  const participating = sumField(items, "participating");
  return {
    members,
    participating,
    rate: members > 0 ? participating / members : null,
    units: new Set(items.map((row) => row.unitJoinKey).filter(Boolean)).size || items.length,
    stakes: new Set(items.map((row) => row.stakeOrDistrict).filter(Boolean)).size,
    councils: new Set(items.map((row) => row.coordinatingCouncil).filter(Boolean)).size
  };
}

function summarizeGender(items) {
  const summary = summarize(items);
  const males = sumField(items, "males");
  const females = sumField(items, "females");
  const participatingMales = sumField(items, "participatingMales");
  const participatingFemales = sumField(items, "participatingFemales");
  return {
    ...summary,
    males,
    females,
    participatingMales,
    participatingFemales,
    maleRate: males > 0 ? participatingMales / males : null,
    femaleRate: females > 0 ? participatingFemales / females : null,
    genderGap: males > 0 && females > 0 ? participatingFemales / females - participatingMales / males : null
  };
}

function rowIncludedByFilters(row, filters = {}) {
  const rank = ageGroupRank(row.ageGroup);
  if (row.sourceGrain === "age_group" && rank < 18) return false;
  if (filters.ageSegment && filters.ageSegment !== ALL) {
    const segment = AGE_SEGMENTS.find((item) => item.id === filters.ageSegment);
    if (row.sourceGrain === "age_group" && segment && (rank < segment.minRank || rank > segment.maxRank)) {
      return false;
    }
  }
  if (filters.period && filters.period !== ALL && row.period !== filters.period) return false;
  if (filters.council && filters.council !== ALL && row.coordinatingCouncil !== filters.council) return false;
  if (filters.stake && filters.stake !== ALL && row.stakeOrDistrict !== filters.stake) return false;
  if (filters.unitQuery) {
    const query = filters.unitQuery.toLowerCase();
    const haystack = [row.unitName, row.city, row.stakeOrDistrict, row.coordinatingCouncil]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

function countForGender(row, field, gender) {
  if (gender === "male") {
    return field === "members" ? row.males : row.participatingMales;
  }
  if (gender === "female") {
    return field === "members" ? row.females : row.participatingFemales;
  }
  return row[field];
}

function unitRowsForPeriod(rows, period, filters = {}) {
  const periodRows = rows.filter((row) => row.period === period && rowIncludedByFilters(row, filters));
  return [...groupBy(periodRows, "unitJoinKey")].map(([unitJoinKey, groupRows]) => {
    const first = groupRows[0];
    const members = groupRows.reduce((sum, row) => sum + (countForGender(row, "members", filters.gender) || 0), 0);
    const participating = groupRows.reduce(
      (sum, row) => sum + (countForGender(row, "participating", filters.gender) || 0),
      0
    );
    return {
      period,
      unitJoinKey,
      unitName: first.unitName,
      coordinatingCouncil: first.coordinatingCouncil,
      stakeOrDistrict: first.stakeOrDistrict,
      city: first.city,
      state: first.state,
      cityLatitude: first.cityLatitude,
      cityLongitude: first.cityLongitude,
      members,
      participating,
      rate: members > 0 ? participating / members : null,
      lowParticipationFlag: groupRows.some((row) => row.lowParticipationFlag === 1),
      unitPriorityIndex: Math.max(...groupRows.map((row) => row.unitPriorityIndex || 0)),
      cityPriorityIndex: Math.max(...groupRows.map((row) => row.cityPriorityIndex || 0)),
      isolationVsPerformance: first.isolationVsPerformance,
      stakeDistanceTier: first.stakeDistanceTier,
      councilDistanceTier: first.councilDistanceTier,
      milesToCouncilCentroid: first.milesToCouncilCentroid
    };
  });
}

function aggregateBy(items, key) {
  return [...groupBy(items, key)].map(([name, groupRows]) => ({ name, rows: groupRows, ...summarize(groupRows) }));
}

function ageDistribution(rows, period, filters = {}) {
  const ageRows = rows.filter(
    (row) => row.period === period && row.sourceGrain === "age_group" && rowIncludedByFilters(row, { ...filters, ageSegment: ALL })
  );
  return AGE_SEGMENTS.map((segment) => {
    const groupRows = ageRows.filter((row) => {
      const rank = ageGroupRank(row.ageGroup);
      return rank >= segment.minRank && rank <= segment.maxRank;
    });
    return {
      ...segment,
      ...summarizeGender(groupRows)
    };
  });
}

function comparisonByUnit(latest, prior) {
  const priorMap = new Map(prior.map((row) => [row.unitJoinKey, row]));
  return latest.map((row) => {
    const previous = priorMap.get(row.unitJoinKey);
    return {
      ...row,
      previous,
      deltaRate: Number.isFinite(row.rate) && Number.isFinite(previous?.rate) ? row.rate - previous.rate : null,
      deltaParticipating: (row.participating || 0) - (previous?.participating || 0),
      deltaMembers: (row.members || 0) - (previous?.members || 0)
    };
  });
}

function coverage(latest, prior) {
  const latestKeys = new Set(latest.map((row) => row.unitJoinKey));
  const priorKeys = new Set(prior.map((row) => row.unitJoinKey));
  return {
    matched: [...latestKeys].filter((key) => priorKeys.has(key)).length,
    newUnits: [...latestKeys].filter((key) => !priorKeys.has(key)).length,
    priorOnly: [...priorKeys].filter((key) => !latestKeys.has(key)).length
  };
}

function opportunityTarget(items) {
  const rates = items.map((item) => item.rate).filter(Number.isFinite).sort((a, b) => a - b);
  if (!rates.length) return 0.12;
  const index = Math.floor(rates.length * 0.75);
  return Math.max(rates[index] || 0.12, summarize(items).rate || 0.12, 0.12);
}

function interventionProbability(row) {
  if (row.isolationVsPerformance === "Low isolation / Low participation") return 0.9;
  if (row.isolationVsPerformance === "High isolation / Low participation") return 0.72;
  if (row.lowParticipationFlag) return 0.62;
  if (row.isolationVsPerformance === "High isolation / High participation") return 0.42;
  return 0.34;
}

function classifyArchetype(row) {
  if (Number.isFinite(row.deltaRate) && row.deltaRate < -0.04) return "Declining Legacy";
  if (Number.isFinite(row.deltaRate) && row.deltaRate > 0.04) return "Emerging Momentum";
  if (row.isolationVsPerformance === "High isolation / Low participation") return "Geographic Isolation";
  if (row.isolationVsPerformance === "Low isolation / Low participation") return "Growth Opportunity";
  if (row.isolationVsPerformance === "High isolation / High participation") return "Fragile Success";
  return "Stable Core";
}

function scoreOpportunities(latest, prior) {
  const compared = comparisonByUnit(latest, prior);
  const target = opportunityTarget(latest);
  const maxMembers = Math.max(...latest.map((row) => row.members || 0), 1);
  return compared
    .map((row) => {
      const populationImpact = clamp((row.members || 0) / maxMembers, 0.04, 1);
      const engagementGap = clamp((target - (row.rate || 0)) / target, 0, 1);
      const trendSeverity = Number.isFinite(row.deltaRate)
        ? row.deltaRate < 0
          ? clamp(Math.abs(row.deltaRate) / 0.12, 0.2, 1)
          : 0.18
        : row.lowParticipationFlag
          ? 0.5
          : 0.25;
      const probability = interventionProbability(row);
      const opportunityScore = populationImpact * engagementGap * trendSeverity * probability * 100;
      return {
        ...row,
        targetRate: target,
        populationImpact,
        engagementGap,
        trendSeverity,
        interventionProbability: probability,
        opportunityScore,
        estimatedLift: Math.max(Math.round((row.members || 0) * target - (row.participating || 0)), 0),
        archetype: classifyArchetype(row)
      };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function severity(score, fallback = "Medium") {
  if (score >= 24) return "Critical";
  if (score >= 12) return "High";
  if (score >= 5) return "Medium";
  return fallback;
}

function genderGapRecommendation(segment, label) {
  if (!Number.isFinite(segment?.maleRate) || !Number.isFinite(segment?.femaleRate)) return null;
  const gap = segment.femaleRate - segment.maleRate;
  if (Math.abs(gap) < 0.015) return null;
  const lowerGroup = gap > 0 ? `Men in ${label}` : `Women in ${label}`;
  return {
    issue: `${lowerGroup} are underrepresented`,
    issueType: "Demographic Gap",
    severity: Math.abs(gap) >= 0.04 ? "High" : "Medium",
    score: Math.abs(gap) * 220,
    trend: `${pct(segment.maleRate)} male participation; ${pct(segment.femaleRate)} female participation.`,
    condition: `${lowerGroup} trail by ${Math.abs(gap * 100).toFixed(1)} participation-rate points in the current SQL snapshot.`,
    actions: [
      "Increase purpose-driven activities",
      "Increase service opportunities",
      "Create recurring small-group experiences",
      "Improve direct leadership outreach"
    ],
    impact: "Closing half the observed gender gap would materially improve segment reach.",
    confidence: "Medium"
  };
}

function buildRecommendations({ latest, prior, ageSegments }) {
  const opportunities = scoreOpportunities(latest, prior);
  const recommendations = [];
  const top = opportunities[0];

  if (top) {
    recommendations.push({
      issue: `${top.unitName} has high opportunity and low reach`,
      issueType: top.isolationVsPerformance === "High isolation / Low participation" ? "Geography" : "Engagement",
      severity: severity(top.opportunityScore),
      score: top.opportunityScore,
      trend: trendSentence(top.rate, top.previous?.rate),
      condition: `${num(top.members)} adult singles, ${pct(top.rate)} participating, ${pct(top.targetRate)} opportunity benchmark.`,
      actions:
        top.archetype === "Geographic Isolation"
          ? ["Reduce travel burden", "Pilot micro-events", "Rotate locations", "Expand hybrid options"]
          : ["Review with stake leadership", "Improve direct invitations", "Create recurring smaller groups", "Assign newcomer follow-up"],
      impact: `${num(top.estimatedLift)} additional participating adults would move the unit to the benchmark.`,
      confidence: top.previous ? "High" : "Medium"
    });
  }

  const ysa = ageSegments.find((segment) => segment.id === "ysa");
  const mid = ageSegments.find((segment) => segment.id === "singleAdults");
  const older = ageSegments.find((segment) => segment.id === "singles46plus");
  if (ysa && mid && Number.isFinite(ysa.rate) && Number.isFinite(mid.rate) && ysa.rate - mid.rate > 0.02) {
    recommendations.push({
      issue: "YSA-to-mid-single transition is losing participation",
      issueType: "Retention",
      severity: ysa.rate - mid.rate > 0.06 ? "High" : "Medium",
      score: (ysa.rate - mid.rate) * 200,
      trend: `${ysa.shortLabel} participation is ${pct(ysa.rate)}; ${mid.shortLabel} is ${pct(mid.rate)}.`,
      condition: `${((ysa.rate - mid.rate) * 100).toFixed(1)} participation-rate gap between adjacent adult cohorts.`,
      actions: [
        "Connect transition-age adults to leadership within 14 days",
        "Create smaller recurring circles",
        "Pair new attendees with a known host",
        "Measure repeat attendance after the first event"
      ],
      impact: `Moving ${mid.shortLabel} halfway toward ${ysa.shortLabel} would add about ${num(Math.max(((ysa.rate + mid.rate) / 2) * mid.members - mid.participating, 0))} participating adults.`,
      confidence: "Medium"
    });
  }

  [genderGapRecommendation(mid, "Single Adults 36-45"), genderGapRecommendation(older, "Singles 46+")]
    .filter(Boolean)
    .forEach((item) => recommendations.push(item));

  const highDistanceLow = latest.filter((row) => row.isolationVsPerformance === "High isolation / Low participation");
  if (highDistanceLow.length) {
    const geo = summarize(highDistanceLow);
    const target = opportunityTarget(latest);
    recommendations.push({
      issue: "High-density distance friction is suppressing participation",
      issueType: "Geography",
      severity: highDistanceLow.length >= 8 ? "High" : "Medium",
      score: highDistanceLow.length * 2,
      trend: `${num(highDistanceLow.length)} units average ${pct(geo.rate)} participation.`,
      condition: "Units are classified as High isolation / Low participation in the SQL source.",
      actions: ["Increase local event frequency", "Reduce travel burden", "Pilot micro-events", "Improve local communications"],
      impact: `${num(Math.max(geo.members * target - geo.participating, 0))} additional participating adults would bring these units to benchmark.`,
      confidence: "Medium"
    });
  }

  const emerging = comparisonByUnit(latest, prior)
    .filter((row) => Number.isFinite(row.deltaRate) && row.deltaRate > 0.03)
    .sort((a, b) => b.deltaRate - a.deltaRate)[0];
  if (emerging) {
    recommendations.push({
      issue: `${emerging.unitName} is an emerging success model`,
      issueType: "Growth Opportunity",
      severity: "Low",
      score: emerging.deltaRate * 160,
      trend: trendSentence(emerging.rate, emerging.previous?.rate),
      condition: `${emerging.stakeOrDistrict}; ${num(emerging.participating)} participating adults now.`,
      actions: ["Document successful practices", "Share the success model", "Use leaders from this unit as practice coaches"],
      impact: "Creates a measurable model for similar units instead of a generic program push.",
      confidence: "High"
    });
  }

  return recommendations
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.score - a.score)
    .slice(0, 6)
    .map((item, index) => ({ ...item, priorityRank: index + 1 }));
}

function severityRank(value) {
  return { Critical: 4, High: 3, Medium: 2, Low: 1 }[value] || 0;
}

function buildDashboardModel(sourceDataset, filters = {}) {
  const periods = sourceDataset.metadata.periods || [];
  const latestPeriod = filters.period && filters.period !== ALL ? filters.period : sourceDataset.metadata.latestPeriod;
  const priorCandidates = periods.filter((period) => period.period !== latestPeriod);
  const priorPeriod = priorCandidates[priorCandidates.length - 1]?.period || sourceDataset.metadata.baselinePeriod;
  const latest = unitRowsForPeriod(sourceDataset.rows, latestPeriod, filters);
  const prior = unitRowsForPeriod(sourceDataset.rows, priorPeriod, filters);
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const ageSegments = ageDistribution(sourceDataset.rows, latestPeriod, filters);
  const opportunities = scoreOpportunities(latest, prior);
  const recommendations = buildRecommendations({ latest, prior, ageSegments });
  const movement = Number.isFinite(latestSummary.rate) && Number.isFinite(priorSummary.rate) ? latestSummary.rate - priorSummary.rate : null;
  const atRisk = latest.filter((row) => Number.isFinite(row.rate) && row.rate < 0.08);
  const opportunityPopulation = sumField(opportunities.filter((row) => row.engagementGap > 0.05), "members");
  const engagementCounts = latest.reduce(
    (counts, row) => {
      if (!Number.isFinite(row.rate)) return counts;
      if (row.rate >= 0.18) counts.active += 1;
      else if (row.rate >= 0.08) counts.recentlyInactive += 1;
      else counts.longInactive += 1;
      return counts;
    },
    { active: 0, recentlyInactive: 0, longInactive: 0 }
  );

  return {
    latestPeriod,
    priorPeriod,
    latest,
    prior,
    latestSummary,
    priorSummary,
    ageSegments,
    opportunities,
    recommendations,
    movement,
    coverage: coverage(latest, prior),
    atRiskPopulation: sumField(atRisk, "members"),
    opportunityPopulation,
    engagementCounts,
    councilSummary: aggregateBy(latest, "coordinatingCouncil").sort((a, b) => b.rate - a.rate),
    stakeSummary: aggregateBy(latest, "stakeOrDistrict").sort((a, b) => b.rate - a.rate),
    summaryText: executiveSummary(latestSummary, priorSummary, ageSegments, recommendations, opportunities)
  };
}

function executiveSummary(latestSummary, priorSummary, ageSegments, recommendations, opportunities) {
  const lowest = ageSegments.reduce((current, item) => (!current || item.rate < current.rate ? item : current), null);
  const topFiveLift = opportunities.slice(0, 5).reduce((sum, row) => sum + (row.estimatedLift || 0), 0);
  return `${trendSentence(latestSummary.rate, priorSummary.rate)} ${num(latestSummary.participating)} single adults are being reached out of ${num(latestSummary.members)}. ${lowest?.shortLabel || "The lowest segment"} is the most underreached measured cohort at ${pct(lowest?.rate)}. ${recommendations[0]?.issue || "No critical intervention"} is the highest current leadership focus. The top five opportunity units represent an estimated ${num(topFiveLift)} additional participating adults.`;
}

function trendSentence(latestRate, priorRate) {
  if (!Number.isFinite(latestRate) || !Number.isFinite(priorRate)) return "Trend is not available.";
  if (Math.abs(latestRate - priorRate) < 0.001) return `Participation held steady at ${pct(latestRate)}.`;
  const direction = latestRate > priorRate ? "increased" : "declined";
  return `Participation ${direction} from ${pct(priorRate)} to ${pct(latestRate)}.`;
}

function pct(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value)
    : "--";
}

function num(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value) : "--";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function unique(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function rateTone(rate) {
  if (!Number.isFinite(rate)) return "blue";
  if (rate >= 0.18) return "green";
  if (rate >= 0.08) return "amber";
  return "red";
}

function selected(value, current) {
  return value === current ? "selected" : "";
}

function option(value, label, current) {
  return `<option value="${escapeHtml(value)}" ${selected(value, current)}>${escapeHtml(label)}</option>`;
}

function setFilter(key, value) {
  state.filters = {
    ...state.filters,
    [key]: value,
    ...(key === "council" ? { stake: ALL } : {})
  };
  render();
}

function render() {
  if (!dataset) {
    app.innerHTML = `<main class="map-empty">Dashboard data did not load.</main>`;
    return;
  }

  const options = getOptions();
  const model = buildDashboardModel(dataset, state.filters);
  const centroidModel = buildDashboardModel(dataset, { ...state.filters, stake: ALL, unitQuery: "" });
  const councilMax = Math.max(...model.councilSummary.map((item) => item.rate || 0), 0.01);
  const stakeMax = Math.max(...model.stakeSummary.map((item) => item.rate || 0), 0.01);
  const selectedCouncil = state.filters.council === ALL ? "all" : state.filters.council;
  const body =
    state.activeTab === "executive"
      ? renderExecutiveView(model, councilMax, selectedCouncil, centroidModel.latest)
      : renderDrilldownView(model, options, stakeMax, selectedCouncil, centroidModel.latest);

  app.className = "";
  app.innerHTML = `
    <main class="dashboard-shell">
      <aside class="identity-rail">
        <div class="mark" aria-hidden="true">M</div>
        <div>
          <strong>Mid-Atlantic Singles Council</strong>
          <span>Executive decision platform</span>
        </div>
      </aside>

      <section class="dashboard-main">
        <header class="dashboard-header">
          <div>
            <h1>Mid-Atlantic Singles Council Executive Dashboard</h1>
            <p>
              ${escapeHtml(dataset.metadata.sourceSystem)} / ${escapeHtml(dataset.metadata.sourceServer)}.${escapeHtml(dataset.metadata.sourceDatabase)}.${escapeHtml(dataset.metadata.sourceSchema)}
              / ${num(dataset.metadata.rowCount)} adult source rows
            </p>
          </div>
          <a class="download-button" href="./data/masc-sql-source-rows.csv" download>
            CSV extract
          </a>
        </header>

        <nav class="mode-tabs" aria-label="Major dashboard views">
          <button class="${state.activeTab === "executive" ? "active" : ""}" data-tab="executive" type="button">
            Executive Council View
          </button>
          <button class="${state.activeTab === "drilldown" ? "active" : ""}" data-tab="drilldown" type="button">
            Stake / Ward Drilldown View
          </button>
        </nav>

        ${renderGlobalFilters(options)}
        ${body}

        <footer class="source-footer">
          Age rule: rows for ages 17 and younger are excluded. Runtime source: ${escapeHtml(dataset.metadata.runtimeSource || "Static SQL-derived export")}.
        </footer>
      </section>
    </main>
  `;
  bindControls();
}

function getOptions() {
  const councilRows =
    state.filters.council === ALL
      ? dataset.rows
      : dataset.rows.filter((row) => row.coordinatingCouncil === state.filters.council);
  return {
    councils: unique(dataset.rows, "coordinatingCouncil"),
    stakes: unique(councilRows, "stakeOrDistrict"),
    periods: dataset.metadata.periods || []
  };
}

function renderGlobalFilters(options) {
  return `
    <section class="global-filters" aria-label="Global filters">
      <label>
        <span>Age bucket</span>
        <select data-filter="ageSegment">
          ${option(ALL, "All adults 18+", state.filters.ageSegment)}
          ${AGE_SEGMENTS.map((segment) => option(segment.id, segment.shortLabel, state.filters.ageSegment)).join("")}
        </select>
      </label>
      <label>
        <span>Gender</span>
        <select data-filter="gender">
          ${option(ALL, "All available genders", state.filters.gender)}
          ${option("male", "Male counts", state.filters.gender)}
          ${option("female", "Female counts", state.filters.gender)}
        </select>
      </label>
      <label>
        <span>Period</span>
        <select data-filter="period">
          ${option(ALL, "Latest vs prior", state.filters.period)}
          ${options.periods.map((period) => option(period.period, period.period, state.filters.period)).join("")}
        </select>
      </label>
      <label>
        <span>Council</span>
        <select data-filter="council">
          ${option(ALL, "All councils", state.filters.council)}
          ${options.councils.map((council) => option(council, council, state.filters.council)).join("")}
        </select>
      </label>
    </section>
  `;
}

function lowestAgeSegment(model) {
  return model.ageSegments.reduce((current, segment) => {
    if (!Number.isFinite(segment.rate)) return current;
    return !current || segment.rate < current.rate ? segment : current;
  }, null);
}

function emergingSuccessUnits(model) {
  return comparisonByUnit(model.latest, model.prior)
    .filter((row) => Number.isFinite(row.deltaRate) && row.deltaRate > 0.03)
    .sort((a, b) => b.deltaRate - a.deltaRate);
}

function criticalAttentionUnits(model) {
  return model.opportunities
    .filter((row) => (Number.isFinite(row.rate) && row.rate < 0.08) || row.opportunityScore >= 12)
    .slice(0, 8);
}

function highOpportunityRows(model) {
  return model.opportunities.filter((row) => row.engagementGap > 0.05).slice(0, 12);
}

function formatRateDelta(value) {
  if (!Number.isFinite(value)) return "No prior comparison";
  const points = Math.abs(value * 100).toFixed(1);
  return `${value >= 0 ? "+" : "-"}${points} pts`;
}

function confidenceTone(confidence) {
  if (confidence === "High") return "green";
  if (confidence === "Medium") return "amber";
  return "blue";
}

function severityTone(severityValue) {
  if (severityValue === "Critical" || severityValue === "High") return "red";
  if (severityValue === "Medium") return "amber";
  return "green";
}

function statusBadge(label, tone = "blue") {
  return `<span class="status-badge badge-${tone}">${escapeHtml(label)}</span>`;
}

function iconSvg(name) {
  const icons = {
    users: `<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path><circle cx="9.5" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>`,
    trendUp: `<path d="m3 17 6-6 4 4 8-8"></path><path d="M14 7h7v7"></path>`,
    trendDown: `<path d="m3 7 6 6 4-4 8 8"></path><path d="M14 17h7v-7"></path>`,
    alert: `<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>`,
    target: `<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.5"></circle>`,
    compass: `<circle cx="12" cy="12" r="9"></circle><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"></path>`,
    map: `<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"></path><path d="M9 3v15"></path><path d="M15 6v15"></path>`,
    clock: `<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>`,
    repeat: `<path d="m17 1 4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="m7 23-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>`,
    sparkles: `<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"></path><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"></path>`,
    rocket: `<path d="M4.5 16.5c-1.3 1.3-1.5 3.6-1.5 3.6s2.3-.2 3.6-1.5c.7-.7.7-1.8 0-2.5-.6-.5-1.6-.4-2.1.4Z"></path><path d="M9 15 6 12c.6-1.7 1.6-3.3 3-4.7C12.4 3.9 17 3 21 3c0 4-.9 8.6-4.3 12-1.4 1.4-3 2.4-4.7 3l-3-3Z"></path><path d="M14 6h4v4"></path>`
  };
  return `
    <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${icons[name] || icons.compass}
    </svg>
  `;
}

function renderExecutiveSummary(model, context) {
  const topOpportunity = model.opportunities[0];
  const lowSegment = context.lowestSegment;
  const trendSentenceText = `${context.trendWord}: ${formatRateDelta(model.movement)} participation change vs ${model.priorPeriod}.`;
  const focusText = topOpportunity
    ? `${topOpportunity.unitName} is the highest measured leadership opportunity.`
    : "No high-risk unit is currently above the opportunity threshold.";
  const missText = lowSegment
    ? `${lowSegment.shortLabel} is the most underreached cohort at ${pct(lowSegment.rate)}.`
    : "No demographic cohort has enough data for a reach callout.";
  const actionText = model.recommendations[0]?.issue || "No critical intervention is currently flagged.";

  return `
    <section class="executive-brief">
      <div class="summary-main">
        <div class="summary-icon tone-${context.trendTone}">${iconSvg(context.trendTone === "green" ? "trendUp" : "trendDown")}</div>
        <div>
          <p class="summary-label">Executive summary</p>
          <h2>${escapeHtml(model.summaryText)}</h2>
        </div>
      </div>
      <div class="summary-insights">
        <div class="insight-chip">
          <span>${iconSvg("users")} Reach</span>
          <strong>${num(model.latestSummary.participating)} reached</strong>
        </div>
        <div class="insight-chip">
          <span>${iconSvg(context.trendTone === "green" ? "trendUp" : "trendDown")} Momentum</span>
          <strong>${escapeHtml(trendSentenceText)}</strong>
        </div>
        <div class="insight-chip">
          <span>${iconSvg("alert")} Missed group</span>
          <strong>${escapeHtml(missText)}</strong>
        </div>
        <div class="insight-chip">
          <span>${iconSvg("target")} Next focus</span>
          <strong>${escapeHtml(focusText)}</strong>
        </div>
      </div>
      <div class="summary-action">
        ${statusBadge(context.trendWord, context.trendTone)}
        <span>${iconSvg("compass")}${escapeHtml(actionText)}</span>
      </div>
    </section>
  `;
}

function renderExecutiveView(model, councilMax, selectedCouncil, centroidRows) {
  const participatingDelta = model.latestSummary.participating - model.priorSummary.participating;
  const momentumScore = Math.round(Math.min(Math.max(50 + (model.movement || 0) * 420 + participatingDelta / 220, 0), 100));
  const opportunityRate = model.opportunities[0]?.targetRate || model.latestSummary.rate;
  const lowestSegment = lowestAgeSegment(model);
  const emergingUnits = emergingSuccessUnits(model);
  const criticalUnits = criticalAttentionUnits(model);
  const highOpportunityUnits = highOpportunityRows(model);
  const trendTone = model.movement >= 0 ? "green" : "red";
  const trendWord = model.movement >= 0 ? "Improving" : "Declining";

  return `
    <section class="view-stack">
      ${renderExecutiveSummary(model, {
        participatingDelta,
        momentumScore,
        lowestSegment,
        emergingUnits,
        criticalUnits,
        highOpportunityUnits,
        trendTone,
        trendWord
      })}

      <section class="kpi-grid executive-kpis">
        ${renderKpi({
          label: "Singles Reached",
          value: num(model.latestSummary.participating),
          detail: `${num(participatingDelta)} change vs ${model.priorPeriod}`,
          interpretation: `Reached out of ${num(model.latestSummary.members)} measured adults.`,
          tone: "green",
          icon: "users",
          delta: participatingDelta,
          badge: participatingDelta >= 0 ? "Improving" : "Declining"
        })}
        ${renderKpi({
          label: "Participation Rate",
          value: pct(model.latestSummary.rate),
          detail: `${formatRateDelta(model.movement)} vs ${model.priorPeriod}`,
          interpretation: `Current adult reach across ${num(model.latestSummary.units)} units.`,
          tone: rateTone(model.latestSummary.rate),
          icon: model.movement >= 0 ? "trendUp" : "trendDown",
          delta: model.movement,
          badge: model.latestSummary.rate >= 0.18 ? "Healthy" : model.latestSummary.rate >= 0.08 ? "Watch" : "Under-engaged"
        })}
        ${renderKpi({
          label: "Momentum Score",
          value: `${momentumScore}/100`,
          detail: `${trendWord} region-wide trajectory`,
          interpretation: `${num(model.coverage.matched)} comparable units between periods.`,
          tone: momentumScore >= 65 ? "green" : momentumScore >= 45 ? "amber" : "red",
          icon: "rocket",
          delta: model.movement,
          badge: momentumScore >= 65 ? "Strong" : momentumScore >= 45 ? "Watch" : "Needs focus"
        })}
        ${renderKpi({
          label: "At-Risk Population",
          value: num(model.atRiskPopulation),
          detail: `${num(model.engagementCounts.longInactive)} long-inactive units`,
          interpretation: "Adults in units below the under-engaged threshold.",
          tone: model.atRiskPopulation ? "red" : "green",
          icon: "alert",
          badge: model.atRiskPopulation ? "Critical" : "Healthy"
        })}
        ${renderKpi({
          label: "Highest Opportunity Units",
          value: num(highOpportunityUnits.length),
          detail: `Below ${pct(opportunityRate)} opportunity benchmark`,
          interpretation: `${num(model.opportunityPopulation)} adults in below-benchmark units.`,
          tone: "purple",
          icon: "target",
          badge: "High opportunity"
        })}
        ${renderKpi({
          label: "Emerging Success Units",
          value: num(emergingUnits.length),
          detail: emergingUnits[0] ? `${emergingUnits[0].unitName}` : "No clear positive outliers",
          interpretation: "Units with measurable participation lift vs prior period.",
          tone: "gold",
          icon: "sparkles",
          badge: "Emerging success"
        })}
      </section>

      <section class="grid-two">
        <article class="panel">
          <div class="section-title">
            <h2>Who Is Being Reached?</h2>
            <p>Demographic reach, underrepresentation, and participation gaps.</p>
          </div>
          ${renderDemographicCards(model.ageSegments)}
        </article>
        <article class="panel">
          <div class="section-title">
            <h2>Time Effects And Momentum</h2>
            <p>Prior/current movement and engagement velocity.</p>
          </div>
          ${renderMomentumPanel(model, participatingDelta, momentumScore)}
        </article>
      </section>

      ${renderRecommendations("Leadership Action Center", "Prescriptive recommendation cards ranked by measurable SQL-derived conditions.", model.recommendations)}

      ${renderSignalPanels(model, criticalUnits, highOpportunityUnits, emergingUnits)}

      <section class="grid-two">
        <article class="panel">
          <div class="section-title">
            <h2>Units To Closest Stake Centroid</h2>
            <p>Latitude and longitude plotted on a real map; lines show nearest computed stake centroid.</p>
          </div>
          ${renderCouncilMap(model.latest, centroidRows, selectedCouncil)}
        </article>
        <article class="panel">
          <div class="section-title">
            <h2>Opportunity Prioritization Model</h2>
            <p>Population impact x engagement gap x trend severity x intervention probability.</p>
          </div>
          ${renderOpportunityTable(model.opportunities)}
        </article>
      </section>
    </section>
  `;
}

function renderDrilldownView(model, options, stakeMax, selectedCouncil, centroidRows) {
  const stakeRows = aggregateBy(model.latest, "stakeOrDistrict").sort((a, b) => b.rate - a.rate);

  return `
    <section class="view-stack">
      <section class="drilldown-filters">
        <label>
          <span>Stake / District</span>
          <select data-filter="stake">
            ${option(ALL, "All stakes / districts", state.filters.stake)}
            ${options.stakes.map((stake) => option(stake, stake, state.filters.stake)).join("")}
          </select>
        </label>
        <label>
          <span>Ward / Branch / Unit</span>
          <input data-filter="unitQuery" value="${escapeHtml(state.filters.unitQuery)}" placeholder="Search units" />
        </label>
      </section>

      <section class="kpi-grid compact">
        ${renderKpi("Local Singles Reached", num(model.latestSummary.participating), `${pct(model.latestSummary.rate)} participation`, rateTone(model.latestSummary.rate))}
        ${renderKpi("Local Opportunity", num(model.opportunityPopulation), "Adults in below-benchmark units", "purple")}
        ${renderKpi("Unit Archetype Watch", model.opportunities[0]?.archetype || "Stable Core", model.opportunities[0]?.unitName || "No high-risk unit", "amber")}
        ${renderKpi("Comparable Units", num(model.coverage.matched), `${num(model.coverage.newUnits)} new units`, "blue")}
      </section>

      ${renderRecommendations("Local Recommendation Cards", "Recomputed from the current council, stake, unit, age, gender, and period filters.", model.recommendations)}

      <section class="grid-two">
        <article class="panel">
          <div class="section-title">
            <h2>Stake / District Participation</h2>
            <p>Sorted by current participation rate.</p>
          </div>
          ${renderBarList(stakeRows, stakeMax)}
        </article>
        <article class="panel">
          <div class="section-title">
            <h2>Local Geography</h2>
            <p>Current filter mapped by coordinates with nearest-centroid relationships.</p>
          </div>
          ${renderCouncilMap(model.latest, centroidRows, selectedCouncil)}
        </article>
      </section>

      <section class="panel">
        <div class="section-title">
          <h2>Ward / Branch / Unit Action Queue</h2>
          <p>Sorted by opportunity score.</p>
        </div>
        ${renderOpportunityTable(model.opportunities)}
      </section>
    </section>
  `;
}

function renderKpi(configOrLabel, value, detail, tone) {
  const config =
    typeof configOrLabel === "object"
      ? configOrLabel
      : { label: configOrLabel, value, detail, tone, icon: "target", badge: tone === "red" ? "Watch" : "Current" };
  const delta = Number.isFinite(config.delta) ? config.delta : null;
  const trendClass = delta === null ? "neutral" : delta >= 0 ? "positive" : "negative";
  const trendText = delta === null ? "" : delta >= 0 ? "Up" : "Down";

  return `
    <article class="kpi-card tone-${config.tone}">
      <div class="kpi-topline">
        <span class="kpi-icon">${iconSvg(config.icon || "target")}</span>
        ${config.badge ? statusBadge(config.badge, config.tone) : ""}
      </div>
      <span class="kpi-label">${escapeHtml(config.label)}</span>
      <strong class="kpi-value">${escapeHtml(config.value)}</strong>
      <span class="kpi-detail">
        ${delta === null ? "" : `<i class="trend-mark ${trendClass}">${iconSvg(delta >= 0 ? "trendUp" : "trendDown")}${trendText}</i>`}
        ${escapeHtml(config.detail || "")}
      </span>
      ${config.interpretation ? `<p class="kpi-interpretation">${escapeHtml(config.interpretation)}</p>` : ""}
    </article>
  `;
}

function renderRecommendations(title, subtitle, recommendations) {
  return `
    <section class="panel action-center">
      <div class="section-title">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="recommendation-list">
        ${recommendations.length ? recommendations.map(renderRecommendation).join("") : `<p class="source-footer">No recommendations for this filter.</p>`}
      </div>
    </section>
  `;
}

function renderRecommendation(recommendation) {
  return `
    <article class="recommendation severity-${escapeHtml(recommendation.severity).toLowerCase()}">
      <div class="recommendation-rank">${num(recommendation.priorityRank)}</div>
      <div class="recommendation-body">
        <div class="recommendation-header">
          <div class="recommendation-title">
            <p class="eyebrow">${escapeHtml(recommendation.issueType)} / ${escapeHtml(recommendation.severity)}</p>
            <h3>${escapeHtml(recommendation.issue)}</h3>
          </div>
          ${statusBadge(recommendation.severity, severityTone(recommendation.severity))}
        </div>
        <div class="recommendation-grid">
          <div><span>Trend</span><strong>${escapeHtml(recommendation.trend)}</strong></div>
          <div><span>Impact</span><strong>${escapeHtml(recommendation.impact)}</strong></div>
          <div><span>Confidence</span><strong>${statusBadge(recommendation.confidence, confidenceTone(recommendation.confidence))}</strong></div>
        </div>
        <div class="action-list">
          ${recommendation.actions.map((action) => `<span>${escapeHtml(action)}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderDemographicCards(segments) {
  const maxRate = Math.max(...segments.map((segment) => segment.rate || 0), 0.01);
  const strongestGap = [...segments]
    .filter((segment) => Number.isFinite(segment.genderGap))
    .sort((a, b) => Math.abs(b.genderGap) - Math.abs(a.genderGap))[0];

  return `
    <div class="demographic-grid">
      ${segments.map((segment) => {
        const tone = rateTone(segment.rate);
        const width = Math.min(((segment.rate || 0) / maxRate) * 100, 100);
        const gap = Number.isFinite(segment.genderGap) ? segment.genderGap : 0;
        const underrepresented = gap > 0 ? "Men underrepresented" : gap < 0 ? "Women underrepresented" : "Balanced";
        return `
          <article class="demographic-card tone-${tone}">
            <div class="demographic-top">
              <span>${escapeHtml(segment.shortLabel)}</span>
              ${statusBadge(segment.rate >= 0.18 ? "Healthy" : segment.rate >= 0.08 ? "Watch" : "Under-engaged", tone)}
            </div>
            <strong>${pct(segment.rate)}</strong>
            <p>${num(segment.participating)} reached of ${num(segment.members)} measured adults.</p>
            <div class="heat-track"><i style="width: ${width}%"></i></div>
            <div class="gender-mini">
              <span>Male ${pct(segment.maleRate)}</span>
              <span>Female ${pct(segment.femaleRate)}</span>
            </div>
            <small>${escapeHtml(underrepresented)}</small>
          </article>
        `;
      }).join("")}
      ${strongestGap ? `
        <article class="demographic-callout">
          <span>${iconSvg("alert")} Underrepresented demographic</span>
          <strong>${escapeHtml(strongestGap.genderGap > 0 ? `Men in ${strongestGap.shortLabel}` : `Women in ${strongestGap.shortLabel}`)}</strong>
          <p>${Math.abs(strongestGap.genderGap * 100).toFixed(1)} participation-rate point gap in the current snapshot.</p>
        </article>
      ` : ""}
    </div>
  `;
}

function renderMomentumPanel(model, participatingDelta, momentumScore) {
  const priorRate = model.priorSummary.rate || 0;
  const latestRate = model.latestSummary.rate || 0;
  const movementTone = model.movement >= 0 ? "green" : "red";
  const newUnitsTone = model.coverage.newUnits > 0 ? "blue" : "green";

  return `
    <div class="momentum-grid">
      <article class="momentum-card tone-${movementTone}">
        <div>
          <span>${iconSvg(model.movement >= 0 ? "trendUp" : "trendDown")} Participation velocity</span>
          ${statusBadge(model.movement >= 0 ? "Improving" : "Declining", movementTone)}
        </div>
        <strong>${formatRateDelta(model.movement)}</strong>
        ${renderSparkline(priorRate, latestRate, movementTone)}
        <p>${pct(priorRate)} in ${escapeHtml(model.priorPeriod)} to ${pct(latestRate)} now.</p>
      </article>
      <article class="momentum-card tone-purple">
        <div>
          <span>${iconSvg("rocket")} Momentum score</span>
          ${statusBadge(momentumScore >= 65 ? "Strong" : momentumScore >= 45 ? "Watch" : "Needs focus", momentumScore >= 65 ? "green" : momentumScore >= 45 ? "amber" : "red")}
        </div>
        <strong>${momentumScore}/100</strong>
        <p>Combines participation movement, comparable coverage, and reached-adult delta.</p>
      </article>
      <article class="momentum-card tone-${newUnitsTone}">
        <div>
          <span>${iconSvg("repeat")} Comparable coverage</span>
          ${statusBadge(`${num(model.coverage.matched)} matched`, "blue")}
        </div>
        <strong>${num(participatingDelta)}</strong>
        <p>Reached-adult change with ${num(model.coverage.newUnits)} new units and ${num(model.coverage.priorOnly)} prior-only units.</p>
      </article>
      ${renderMovementRibbon(model)}
    </div>
  `;
}

function renderSparkline(priorRate, latestRate, tone) {
  const min = Math.min(priorRate, latestRate, 0);
  const max = Math.max(priorRate, latestRate, 0.01);
  const y = (value) => 42 - ((value - min) / Math.max(max - min, 0.01)) * 34;
  return `
    <svg class="sparkline" viewBox="0 0 120 48" role="img" aria-label="Prior to current participation trend">
      <path d="M8 40H112" class="spark-axis"></path>
      <path d="M12 ${y(priorRate)} C 42 ${y(priorRate)}, 78 ${y(latestRate)}, 108 ${y(latestRate)}" class="spark-line spark-${tone}"></path>
      <circle cx="12" cy="${y(priorRate)}" r="3"></circle>
      <circle cx="108" cy="${y(latestRate)}" r="4"></circle>
    </svg>
  `;
}

function renderSignalPanels(model, criticalUnits, highOpportunityUnits, emergingUnits) {
  return `
    <section class="signal-panels">
      ${renderSignalPanel({
        title: "Critical Attention Units",
        subtitle: "Lowest reach or highest severity",
        tone: "red",
        icon: "alert",
        rows: criticalUnits,
        empty: "No units are currently in critical attention.",
        metric: (row) => pct(row.rate),
        detail: (row) => `${num(row.members)} adults / score ${row.opportunityScore.toFixed(1)}`
      })}
      ${renderSignalPanel({
        title: "Highest Opportunity Units",
        subtitle: "Largest measurable intervention upside",
        tone: "purple",
        icon: "target",
        rows: highOpportunityUnits,
        empty: "No high-opportunity units for this filter.",
        metric: (row) => num(row.estimatedLift),
        detail: (row) => `${pct(row.rate)} reach / ${escapeHtml(row.archetype)}`
      })}
      ${renderSignalPanel({
        title: "Emerging Success Units",
        subtitle: "Positive movement worth learning from",
        tone: "green",
        icon: "sparkles",
        rows: emergingUnits.slice(0, 8),
        empty: "No emerging success units for this filter.",
        metric: (row) => formatRateDelta(row.deltaRate),
        detail: (row) => `${pct(row.previous?.rate)} to ${pct(row.rate)}`
      })}
    </section>
  `;
}

function renderSignalPanel({ title, subtitle, tone, icon, rows, empty, metric, detail }) {
  return `
    <article class="signal-panel signal-${tone}">
      <div class="signal-head">
        <span class="signal-icon">${iconSvg(icon)}</span>
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="signal-list">
        ${rows.length ? rows.slice(0, 5).map((row, index) => `
          <div class="signal-row">
            <span class="signal-rank">${index + 1}</span>
            <div>
              <strong>${escapeHtml(row.unitName)}</strong>
              <small>${escapeHtml(row.stakeOrDistrict)}</small>
            </div>
            <span class="signal-metric">${metric(row)}</span>
            <small>${detail(row)}</small>
          </div>
        `).join("") : `<p class="signal-empty">${escapeHtml(empty)}</p>`}
      </div>
    </article>
  `;
}

function renderDemographicMatrix(segments) {
  return `
    <div class="matrix">
      <div class="matrix-head">
        <span>Segment</span>
        <span>Members</span>
        <span>Reached</span>
        <span>Rate</span>
        <span>Male</span>
        <span>Female</span>
      </div>
      ${segments.map((segment) => `
        <div class="matrix-row">
          <span><strong>${escapeHtml(segment.shortLabel)}</strong><small>${escapeHtml(segment.meaning)}</small></span>
          <span>${num(segment.members)}</span>
          <span>${num(segment.participating)}</span>
          <span class="${segment.rate < 0.1 ? "danger-text" : ""}">${pct(segment.rate)}</span>
          <span>${pct(segment.maleRate)}</span>
          <span>${pct(segment.femaleRate)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMovementRibbon(model) {
  const items = [
    { label: "Active", value: model.engagementCounts.active, tone: "green" },
    { label: "Recently inactive", value: model.engagementCounts.recentlyInactive, tone: "amber" },
    { label: "Long inactive", value: model.engagementCounts.longInactive, tone: "red" }
  ];
  const total = Math.max(items.reduce((sum, item) => sum + item.value, 0), 1);
  return `
    <div class="movement-ribbon">
      ${items.map((item) => `
        <div class="movement-block tone-${item.tone}" style="flex-basis: ${(item.value / total) * 100}%">
          <strong>${num(item.value)}</strong>
          <span>${escapeHtml(item.label)} units</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderBarList(items, max) {
  return `
    <div class="bar-list">
      ${items.map((item) => {
        const value = item.rate || 0;
        const width = Math.min((value / Math.max(max, 0.01)) * 100, 100);
        return `
          <div class="bar-row">
            <div class="bar-meta">
              <span>${escapeHtml(item.name)}</span>
              <strong>${pct(value)}</strong>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderOpportunityTable(rows) {
  return `
    <div class="table-wrap">
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
          ${rows.slice(0, 10).map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${escapeHtml(row.unitName)}</strong><small>${escapeHtml(row.city)}, ${escapeHtml(row.state)}</small></td>
              <td>${escapeHtml(row.stakeOrDistrict)}</td>
              <td>${escapeHtml(row.archetype)}</td>
              <td>${pct(row.rate)}</td>
              <td>${row.opportunityScore.toFixed(1)}</td>
              <td>${num(row.estimatedLift)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

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
    if (tileRange(bounds, zoom).count <= MAX_TILE_COUNT) return zoom;
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
  return centroids.reduce((best, centroid) => {
    const distance = haversineMiles(row.cityLatitude, row.cityLongitude, centroid.lat, centroid.lon);
    return !best || distance < best.distance ? { centroid, distance } : best;
  }, null);
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

function renderCouncilMap(rows, centroidRows, selectedCouncil) {
  const points = rows.filter(hasMapCoordinates);

  if (!points.length) {
    return `<div class="map-empty">No mapped units have latitude and longitude for this filter.</div>`;
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
        active: selectedCouncil === ALL || row.coordinatingCouncil === selectedCouncil
      };
    })
    .filter((item) => item.nearest && item.centroid);
  const farthest = [...relationships].sort((a, b) => b.nearest.distance - a.nearest.distance)[0];
  const crossStakeCount = relationships.filter((item) => item.nearest.centroid.stake !== item.row.stakeOrDistrict).length;
  const labeledCentroids = centroids
    .slice(0, centroids.length <= 10 ? centroids.length : 10)
    .map((centroid) => ({ ...centroid, screen: viewport.toScreen(centroid.lat, centroid.lon), label: shortStakeName(centroid.stake) }));

  return `
    <figure class="map-figure">
      <svg
        class="council-map actual-map"
        viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}"
        role="img"
        aria-label="OpenStreetMap basemap showing unit points connected to their closest computed stake centroid"
      >
        <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" class="map-backdrop"></rect>
        ${viewport.tiles.map((tile) => `
          <image
            class="map-tile"
            href="${escapeHtml(tile.href)}"
            x="${tile.x}"
            y="${tile.y}"
            width="${tile.size}"
            height="${tile.size}"
            preserveAspectRatio="none"
          ></image>
        `).join("")}
        <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" class="map-softener"></rect>

        ${relationships.map((item) => `
          <line
            class="unit-centroid-link"
            x1="${item.unit.x}"
            y1="${item.unit.y}"
            x2="${item.centroid.x}"
            y2="${item.centroid.y}"
            opacity="${item.active ? 0.34 : 0.08}"
          >
            <title>${escapeHtml(`${item.row.unitName} to ${item.nearest.centroid.stake}: ${item.nearest.distance.toFixed(1)} mi`)}</title>
          </line>
        `).join("")}

        ${centroids.map((centroid) => {
          const screen = viewport.toScreen(centroid.lat, centroid.lon);
          return `
            <g class="centroid" transform="translate(${screen.x} ${screen.y})">
              <rect class="centroid-marker" x="-7" y="-7" width="14" height="14" transform="rotate(45)"></rect>
              <circle class="centroid-core" r="3"></circle>
              <title>${escapeHtml(`${centroid.stake} computed centroid: ${num(centroid.units)} units, ${num(centroid.members)} singles, ${pct(centroid.rate)}`)}</title>
            </g>
          `;
        }).join("")}

        ${relationships.map((item) => `
          <g opacity="${item.active ? 0.95 : 0.18}">
            <circle
              class="unit-dot"
              cx="${item.unit.x}"
              cy="${item.unit.y}"
              r="${unitRadius(item.row)}"
              fill="${rateColor(item.row.rate)}"
            ></circle>
            <title>${escapeHtml(`${item.row.unitName}: ${pct(item.row.rate)} (${num(item.row.members)} singles). Nearest centroid: ${item.nearest.centroid.stake}, ${item.nearest.distance.toFixed(1)} mi.`)}</title>
          </g>
        `).join("")}

        ${labeledCentroids.map((centroid) => {
          const labelWidth = Math.min(Math.max(centroid.label.length * 5.8 + 14, 56), 160);
          const labelX = clamp(centroid.screen.x + 12, 8, MAP_WIDTH - labelWidth - 8);
          const labelY = clamp(centroid.screen.y - 22, 10, MAP_HEIGHT - 26);
          return `
            <g class="centroid-label">
              <rect x="${labelX}" y="${labelY}" width="${labelWidth}" height="19" rx="5"></rect>
              <text x="${labelX + 7}" y="${labelY + 13}">${escapeHtml(centroid.label)}</text>
            </g>
          `;
        }).join("")}
      </svg>
      <div class="map-legend" aria-label="Map legend">
        <span><i class="legend-line"></i> unit to closest centroid</span>
        <span><i class="legend-centroid"></i> stake centroid</span>
        <span><i class="legend-dot good"></i> 18%+ participation</span>
        <span><i class="legend-dot watch"></i> 8-18%</span>
        <span><i class="legend-dot risk"></i> under 8%</span>
      </div>
      <div class="map-summary">
        <span><strong>${num(points.length)}</strong> mapped units</span>
        <span><strong>${num(centroids.length)}</strong> computed stake centroids</span>
        <span><strong>${num(crossStakeCount)}</strong> nearest to another stake centroid</span>
        ${farthest ? `<span>Farthest nearest: <strong>${escapeHtml(farthest.row.unitName)}</strong> ${farthest.nearest.distance.toFixed(1)} mi</span>` : ""}
      </div>
      <figcaption class="map-attribution">
        Map tiles: (c) OpenStreetMap contributors. Centroids are member-weighted from the broader period and council context.
      </figcaption>
    </figure>
  `;
}

function bindControls() {
  app.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      render();
    });
  });

  app.querySelectorAll("[data-filter]").forEach((control) => {
    const eventName = control.tagName === "INPUT" ? "input" : "change";
    control.addEventListener(eventName, () => setFilter(control.dataset.filter, control.value));
  });
}

render();
