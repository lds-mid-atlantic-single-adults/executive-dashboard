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

export const AGE_SEGMENTS = [
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

export function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeDataset(payload) {
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

export function ageGroupRank(ageGroup) {
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

export function ageSegmentForGroup(ageGroup) {
  const rank = ageGroupRank(ageGroup);
  return AGE_SEGMENTS.find((segment) => rank >= segment.minRank && rank <= segment.maxRank) || null;
}

export function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const groupKey = typeof key === "function" ? key(item) : item[key];
    if (!groupKey) return groups;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
    return groups;
  }, new Map());
}

export function sumField(items, field) {
  const values = items.map((item) => item[field]).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : 0;
}

export function summarize(items) {
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

export function summarizeGender(items) {
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

export function rowIncludedByFilters(row, filters = {}) {
  const rank = ageGroupRank(row.ageGroup);
  if (row.sourceGrain === "age_group" && rank < 18) return false;
  if (filters.ageSegment && filters.ageSegment !== "all") {
    const segment = AGE_SEGMENTS.find((item) => item.id === filters.ageSegment);
    if (row.sourceGrain === "age_group" && segment && (rank < segment.minRank || rank > segment.maxRank)) {
      return false;
    }
  }
  if (filters.period && filters.period !== "all" && row.period !== filters.period) return false;
  if (filters.council && filters.council !== "all" && row.coordinatingCouncil !== filters.council) return false;
  if (filters.stake && filters.stake !== "all" && row.stakeOrDistrict !== filters.stake) return false;
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

export function unitRowsForPeriod(rows, period, filters = {}) {
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

export function aggregateBy(items, key) {
  return [...groupBy(items, key)].map(([name, groupRows]) => ({ name, rows: groupRows, ...summarize(groupRows) }));
}

export function ageDistribution(rows, period, filters = {}) {
  const ageRows = rows.filter(
    (row) => row.period === period && row.sourceGrain === "age_group" && rowIncludedByFilters(row, { ...filters, ageSegment: "all" })
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

export function comparisonByUnit(latest, prior) {
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

export function coverage(latest, prior) {
  const latestKeys = new Set(latest.map((row) => row.unitJoinKey));
  const priorKeys = new Set(prior.map((row) => row.unitJoinKey));
  return {
    matched: [...latestKeys].filter((key) => priorKeys.has(key)).length,
    newUnits: [...latestKeys].filter((key) => !priorKeys.has(key)).length,
    priorOnly: [...priorKeys].filter((key) => !latestKeys.has(key)).length
  };
}

export function opportunityTarget(items) {
  const rates = items.map((item) => item.rate).filter(Number.isFinite).sort((a, b) => a - b);
  if (!rates.length) return 0.12;
  const index = Math.floor(rates.length * 0.75);
  return Math.max(rates[index] || 0.12, summarize(items).rate || 0.12, 0.12);
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

function interventionProbability(row) {
  if (row.isolationVsPerformance === "Low isolation / Low participation") return 0.9;
  if (row.isolationVsPerformance === "High isolation / Low participation") return 0.72;
  if (row.lowParticipationFlag) return 0.62;
  if (row.isolationVsPerformance === "High isolation / High participation") return 0.42;
  return 0.34;
}

export function classifyArchetype(row) {
  if (Number.isFinite(row.deltaRate) && row.deltaRate < -0.04) return "Declining Legacy";
  if (Number.isFinite(row.deltaRate) && row.deltaRate > 0.04) return "Emerging Momentum";
  if (row.isolationVsPerformance === "High isolation / Low participation") return "Geographic Isolation";
  if (row.isolationVsPerformance === "Low isolation / Low participation") return "Growth Opportunity";
  if (row.isolationVsPerformance === "High isolation / High participation") return "Fragile Success";
  return "Stable Core";
}

export function scoreOpportunities(latest, prior) {
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

export function buildRecommendations({ latest, prior, ageSegments }) {
  const opportunities = scoreOpportunities(latest, prior);
  const latestSummary = summarize(latest);
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

export function buildDashboardModel(dataset, filters = {}) {
  const periods = dataset.metadata.periods || [];
  const latestPeriod = filters.period && filters.period !== "all" ? filters.period : dataset.metadata.latestPeriod;
  const priorPeriod = periods.filter((period) => period.period !== latestPeriod).at(-1)?.period || dataset.metadata.baselinePeriod;
  const latest = unitRowsForPeriod(dataset.rows, latestPeriod, filters);
  const prior = unitRowsForPeriod(dataset.rows, priorPeriod, filters);
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const ageSegments = ageDistribution(dataset.rows, latestPeriod, filters);
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
  const topOpportunity = opportunities[0];
  const topFiveLift = opportunities.slice(0, 5).reduce((sum, row) => sum + (row.estimatedLift || 0), 0);
  return `${trendSentence(latestSummary.rate, priorSummary.rate)} ${num(latestSummary.participating)} single adults are being reached out of ${num(latestSummary.members)}. ${lowest?.shortLabel || "The lowest segment"} is the most underreached measured cohort at ${pct(lowest?.rate)}. ${recommendations[0]?.issue || "No critical intervention"} is the highest current leadership focus. The top five opportunity units represent an estimated ${num(topFiveLift)} additional participating adults.`;
}

export function trendSentence(latestRate, priorRate) {
  if (!Number.isFinite(latestRate) || !Number.isFinite(priorRate)) return "Trend is not available.";
  if (Math.abs(latestRate - priorRate) < 0.001) return `Participation held steady at ${pct(latestRate)}.`;
  const direction = latestRate > priorRate ? "increased" : "declined";
  return `Participation ${direction} from ${pct(priorRate)} to ${pct(latestRate)}.`;
}

export function pct(value) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value)
    : "--";
}

export function num(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value) : "--";
}
