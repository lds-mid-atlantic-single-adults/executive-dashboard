const payload = window.MASC_DASHBOARD_DATA;
const meta = payload.metadata;
const sourceRows = payload.rows.map((row) => ({
  ...row,
  members: Number.isFinite(row.members) ? row.members : null,
  participating: Number.isFinite(row.participating) ? row.participating : null,
  males: Number.isFinite(row.males) ? row.males : null,
  females: Number.isFinite(row.females) ? row.females : null,
  participatingMales: Number.isFinite(row.participatingMales) ? row.participatingMales : null,
  participatingFemales: Number.isFinite(row.participatingFemales) ? row.participatingFemales : null,
}));

const baselinePeriod = meta.baselinePeriod;
const latestPeriod = meta.latestPeriod;
const state = {
  activeTab: "executive",
  ageScope: meta.defaultAgeScope || "26plus",
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
  const pp = value * 100;
  return `${pp > 0 ? "+" : ""}${pp.toFixed(1)} pp`;
}

function formatGenderGap(value) {
  if (!Number.isFinite(value)) return "--";
  const pp = Math.abs(value * 100).toFixed(1);
  if (Math.abs(value) < 0.0001) return "Even";
  return value > 0 ? `F +${pp} pp` : `M +${pp} pp`;
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

function rowIncludedByAge(row) {
  if (row.sourceGrain !== "age_group") return true;
  const rank = ageGroupRank(row.ageGroup);
  if (state.ageScope === "all") return true;
  if (state.ageScope === "18plus") return rank >= 18;
  return rank >= 26;
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
  return sourceRows.filter((row) => row.period === latestPeriod && row.sourceGrain === "age_group");
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

function segmentSummary(label, items) {
  return {
    label,
    ...summarizeSourceRows(items),
  };
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

function ageScopeInfo() {
  return meta.ageScopes.find((scope) => scope.id === state.ageScope) || meta.ageScopes[0];
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
      "Members",
      formatNumber(latestSummary.members),
      `${latestPeriod}; ${formatNumber(latestSummary.units)} units`,
      {
        value: latestSummary.members - baselineSummary.members,
        label: `${formatDeltaNumber(latestSummary.members - baselineSummary.members)} vs ${baselinePeriod}`,
      }
    ),
    kpiCard(
      "Participating",
      formatNumber(latestSummary.participating),
      `${formatPercent(latestSummary.rate)} aggregate participation`,
      {
        value: latestSummary.participating - baselineSummary.participating,
        label: `${formatDeltaNumber(latestSummary.participating - baselineSummary.participating)} participating`,
      }
    ),
    kpiCard(
      "Participation Rate",
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
      "Matched Units",
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
        <rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="18" rx="4" fill="#e6edf3"></rect>
        <rect x="${labelWidth}" y="${y}" width="${membersWidth}" height="18" rx="4" fill="#b8cbd6"></rect>
        <rect x="${labelWidth}" y="${y}" width="${partWidth}" height="18" rx="4" fill="#168a8f"></rect>
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
  const chartWidth = width - labelWidth - 96;
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
        item.color || (absolute ? (item.value >= 0 ? "#168a8f" : "#b84a4a") : options.color || "#168a8f");
      const label = compactLabel(item.name, options.maxLabelLength || 30);
      return `
        <text class="bar-label" x="0" y="${y + 14}">${escapeHtml(label)}</text>
        <rect x="${labelWidth}" y="${y}" width="${chartWidth}" height="16" rx="4" fill="#edf2f6"></rect>
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
        <rect x="${x + 6}" y="${originY - baseHeight}" width="38" height="${baseHeight}" rx="5" fill="#b8cbd6"></rect>
        <rect x="${x + 52}" y="${originY - latestHeight}" width="38" height="${latestHeight}" rx="5" fill="#168a8f"></rect>
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
        <td class="text">${escapeHtml(row.priority)}</td>
        <td class="text">${escapeHtml(row.signal)}</td>
        <td class="text">${escapeHtml(row.response)}</td>
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

function renderExecutive() {
  const latest = currentRows();
  const prior = priorRows();
  const latestSummary = summarize(latest);
  const priorSummary = summarize(prior);
  const ageRows = latestAgeSourceRows();
  const ageData = ageGenderData(ageRows);
  const age36to45 = ageData.find((item) => item.ageGroup === "36-45");
  const age26to55 = segmentSummary(
    "Ages 26-55",
    ageRows.filter((row) => ageGroupRank(row.ageGroup) >= 26 && ageGroupRank(row.ageGroup) <= 46)
  );
  const age18to45 = segmentSummary(
    "Ages 18-45",
    ageRows.filter((row) => ageGroupRank(row.ageGroup) >= 18 && ageGroupRank(row.ageGroup) <= 36)
  );
  const age46Plus = segmentSummary(
    "Ages 46+",
    ageRows.filter((row) => ageGroupRank(row.ageGroup) >= 46)
  );
  const constrained = latest.filter(
    (row) => row.isolationVsPerformance === "High isolation / Low participation"
  );
  const constrainedSummary = summarize(constrained);
  const councilLatest = aggregate(latest, "coordinatingCouncil").sort((a, b) => b.rate - a.rate);
  const leadingCouncil = councilLatest[0];
  const trailingCouncil = councilLatest[councilLatest.length - 1];
  const rateDelta =
    Number.isFinite(latestSummary.rate) && Number.isFinite(priorSummary.rate)
      ? latestSummary.rate - priorSummary.rate
      : null;

  $("#executiveKpis").innerHTML = [
    kpiCard(
      "Corridor Rate",
      formatPercent(latestSummary.rate),
      `${formatNumber(latestSummary.participating)} of ${formatNumber(latestSummary.members)} participating`,
      {
        value: rateDelta,
        label: `${formatDeltaPct(rateDelta)} vs ${baselinePeriod}`,
      }
    ),
    kpiCard(
      "Midlife Trough",
      formatPercent(age36to45?.rate),
      `Ages 36-45; ${formatNumber(age36to45?.members)} members`,
      null
    ),
    kpiCard(
      "46+ Gender Gap",
      formatGenderGap(age46Plus.genderGap),
      "Female minus male participation rate",
      {
        value: age46Plus.genderGap,
        label: `${formatPercent(age46Plus.femaleRate)} female; ${formatPercent(age46Plus.maleRate)} male`,
      }
    ),
    kpiCard(
      "Constrained Units",
      formatNumber(constrainedSummary.units),
      `${formatPercent(constrainedSummary.rate)} participation; ${formatNumber(constrainedSummary.members)} members`,
      null
    ),
  ].join("");

  $("#executiveNarrative").innerHTML = [
    storyCard(
      "State Of Singles",
      `${formatNumber(latestSummary.units)} units across ${formatNumber(
        latestSummary.stakes
      )} stakes or districts are represented in the current ${ageScopeInfo().label}.`,
      `${latestPeriod} source snapshot`
    ),
    storyCard(
      "What Senior Leaders Should See",
      `${leadingCouncil?.name} leads at ${formatPercent(
        leadingCouncil?.rate
      )}; ${trailingCouncil?.name} trails at ${formatPercent(
        trailingCouncil?.rate
      )}. The ${age36to45?.ageGroup || "36-45"} band is the clearest participation trough.`,
      "Uneven outcomes, structured constraints"
    ),
    storyCard(
      "Where Action Should Focus",
      `Treat ${formatPercent(age18to45.rate)} participation among ages 18-45, ${formatGenderGap(
        age46Plus.genderGap
      )} among ages 46+, and ${formatNumber(
        constrainedSummary.units
      )} high-isolation / low-participation units as the shared operating problem.`,
      "Age, gender, and geography together"
    ),
  ].join("");

  renderExecutivePriorityRows([
    {
      priority: "Midlife re-engagement",
      signal: `Ages 26-55 are at ${formatPercent(age26to55.rate)} participation.`,
      response: "Make 26-55, especially 36-45, the core re-engagement metric.",
    },
    {
      priority: "Male reinforcement",
      signal: `Ages 46+ show ${formatGenderGap(age46Plus.genderGap)}.`,
      response: "Design midlife and older outreach with a specific male retention lens.",
    },
    {
      priority: "Metro and distance friction",
      signal: `${formatNumber(constrainedSummary.units)} units sit in high-isolation / low-participation conditions.`,
      response: "Use smaller local clusters, rotated locations, and lower-friction touchpoints.",
    },
    {
      priority: "Replicate strengths",
      signal: `${formatNumber(
        latest.filter((row) => row.isolationVsPerformance === "Low isolation / High participation").length
      )} units combine low isolation with high participation.`,
      response: "Document what works and pair stronger units with nearby units that need help.",
    },
  ]);

  renderExecutiveSegmentRows([
    {
      ...segmentSummary(
        "18-25",
        ageRows.filter((row) => row.ageGroup === "18-25")
      ),
      meaning: "Young adult handoff and early retention.",
    },
    {
      ...segmentSummary(
        "26-35",
        ageRows.filter((row) => row.ageGroup === "26-35")
      ),
      meaning: "Transition drop-off begins.",
    },
    {
      ...segmentSummary(
        "36-45",
        ageRows.filter((row) => row.ageGroup === "36-45")
      ),
      meaning: "Deepest midlife trough.",
    },
    {
      ...age46Plus,
      meaning: "Male re-engagement becomes more important.",
    },
    {
      ...segmentSummary(
        "66+",
        ageRows.filter((row) => ageGroupRank(row.ageGroup) >= 66)
      ),
      meaning: "Late-life participation recovery.",
    },
  ]);

  $("#executiveCouncilSubtitle").textContent = `${latestPeriod}; ${ageScopeInfo().label}`;
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
      color: "#c9962c",
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

function renderDemographics() {
  const ageRows = latestAgeSourceRows();
  const ageData = ageGenderData(ageRows);
  const adultAgeData = ageData.filter((item) => item.rank >= 18);
  const lowestAdult = adultAgeData.reduce(
    (lowest, item) => (!lowest || item.rate < lowest.rate ? item : lowest),
    null
  );
  const age26to55 = segmentSummary(
    "Ages 26-55",
    ageRows.filter((row) => ageGroupRank(row.ageGroup) >= 26 && ageGroupRank(row.ageGroup) <= 46)
  );
  const age46Plus = segmentSummary(
    "Ages 46+",
    ageRows.filter((row) => ageGroupRank(row.ageGroup) >= 46)
  );
  const maxAgeRate = Math.max(...ageData.map((item) => item.rate), 0.01);
  const maxGap = Math.max(...ageData.map((item) => Math.abs(item.genderGap || 0)), 0.01);

  $("#demographicKpis").innerHTML = [
    kpiCard(
      "Lowest Adult Band",
      formatPercent(lowestAdult?.rate),
      `${lowestAdult?.ageGroup || "--"}; ${formatNumber(lowestAdult?.members)} members`,
      null
    ),
    kpiCard(
      "26-55 Participation",
      formatPercent(age26to55.rate),
      `${formatNumber(age26to55.participating)} of ${formatNumber(age26to55.members)} participating`,
      null
    ),
    kpiCard(
      "46+ Male Rate",
      formatPercent(age46Plus.maleRate),
      `${formatGenderGap(age46Plus.genderGap)} versus female rate`,
      null
    ),
    kpiCard(
      "Age Groups",
      formatNumber(ageData.length),
      `${latestPeriod}; source age bands`,
      null
    ),
  ].join("");

  $("#ageCurveSubtitle").textContent = `${latestPeriod}; all available source age groups`;
  renderHorizontalBars(
    $("#ageCurveChart"),
    ageData.map((item) => ({
      name: item.ageGroup,
      value: item.rate,
      color: item.rank >= 26 && item.rank <= 46 ? "#c9962c" : "#168a8f",
    })),
    {
      label: "Age participation curve",
      formatter: formatPercent,
      maxValue: maxAgeRate,
      width: 760,
      labelWidth: 90,
      maxLabelLength: 12,
    }
  );
  renderHorizontalBars(
    $("#genderGapChart"),
    ageData.map((item) => ({ name: item.ageGroup, value: item.genderGap })),
    {
      label: "Gender gap by age",
      formatter: formatGenderGap,
      absolute: true,
      maxValue: maxGap,
      width: 520,
      labelWidth: 90,
      maxLabelLength: 12,
    }
  );
  renderAgeGenderRows(ageData);
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

  $("#distanceTierSubtitle").textContent = `${latestPeriod}; ${ageScopeInfo().label}`;
  renderHorizontalBars(
    $("#distanceTierChart"),
    distanceData.map((item) => ({
      name: item.name,
      value: item.rate,
      color: distanceTierRank(item.name) >= 3 ? "#c9962c" : "#168a8f",
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

  $("#timeCouncilSubtitle").textContent = `${baselinePeriod} to ${latestPeriod}; ${ageScopeInfo().label}`;
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
      width: 760,
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
      width: 520,
      labelWidth: 218,
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
      "Selected Situation",
      `${formatNumber(latestSummary.members)} members, ${formatNumber(
        latestSummary.participating
      )} participating, ${formatPercent(latestSummary.rate)} current rate.`,
      `${formatDeltaPct(rateDelta)} versus matched prior units`
    ),
    storyCard(
      "Where To Look First",
      `${formatNumber(lowRateUnits.length)} units are below 12% participation; ${formatNumber(
        constrainedUnits.length
      )} are high-isolation / low-participation.`,
      "Local action queue"
    ),
    storyCard(
      "Internal Benchmark",
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
  const ageData = ageGenderData(filteredAgeRows);
  $("#filteredAgeSubtitle").textContent = `${latestPeriod}; ${ageScopeInfo().label}`;
  renderHorizontalBars(
    $("#filteredAgeChart"),
    ageData.map((item) => ({
      name: item.ageGroup,
      value: item.rate,
      color: item.rank >= 26 && item.rank <= 46 ? "#c9962c" : "#168a8f",
    })),
    {
      label: "Filtered age participation pattern",
      formatter: formatPercent,
      maxValue: Math.max(...ageData.map((item) => item.rate), 0.01),
      width: 520,
      labelWidth: 90,
      maxLabelLength: 12,
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

  setKpis($("#overviewKpis"), latestSummary, priorSummary, coverage);
  $("#latestScaleSubtitle").textContent = `${latestPeriod}; ${ageScopeInfo().label}`;
  $("#periodComparisonSubtitle").textContent = `${baselinePeriod} to ${latestPeriod}; ${ageScopeInfo().label}`;
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
      color: "#c9962c",
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
    width: 520,
    labelWidth: 218,
    maxLabelLength: 25,
  });
  renderFilteredAgePattern();
  renderUnitDetail(latest);
}

function renderSource() {
  const scope = ageScopeInfo();
  $("#ageScopeNote").textContent = scope.description;
  $("#freshness").textContent = `${meta.sourceSystem}: ${meta.sourceServer}.${meta.sourceDatabase}.${meta.sourceSchema}. ${formatNumber(meta.rowCount)} source rows across ${baselinePeriod} and ${latestPeriod}.`;
  $("#sourceNote").textContent = `${meta.methodology} ${meta.caveat} Story tabs mirror the April 2026 executive summary and Q1 presentation themes; displayed metrics are recomputed from the local SQL extract.`;
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
  $("#ageScopeFilter").innerHTML = meta.ageScopes
    .map((scope) => `<option value="${escapeHtml(scope.id)}">${escapeHtml(scope.label)}</option>`)
    .join("");
  $("#ageScopeFilter").value = state.ageScope;

  populateSelect(
    $("#councilFilter"),
    uniqueValues(currentRows(), "coordinatingCouncil"),
    "All councils",
    state.council
  );
  refreshStakeOptions();

  $("#ageScopeFilter").addEventListener("change", (event) => {
    state.ageScope = event.target.value;
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

wireTabs();
wireFilters();
wireDownload();
render();
