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
  activeTab: "overview",
  ageScope: meta.defaultAgeScope || "26plus",
  council: "All councils",
  stake: "All stakes / districts",
  query: "",
  sort: "membersDesc",
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

function valueClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0001) return "";
  return value > 0 ? " positive" : " negative";
}

function rateClass(rate) {
  return Number.isFinite(rate) && rate < 0.12 ? " low" : "";
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

function aggregate(items, key) {
  return [...groupBy(items, key)].map(([name, groupRows]) => ({
    name,
    key: name,
    rows: groupRows,
    ...summarize(groupRows),
  }));
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
  renderUnitDetail(latest);
}

function renderSource() {
  const scope = ageScopeInfo();
  $("#ageScopeNote").textContent = scope.description;
  $("#freshness").textContent = `${meta.sourceSystem}: ${meta.sourceServer}.${meta.sourceDatabase}.${meta.sourceSchema}. ${formatNumber(meta.rowCount)} source rows across ${baselinePeriod} and ${latestPeriod}.`;
  $("#sourceNote").textContent = `${meta.methodology} ${meta.caveat}`;
}

function render() {
  renderOverview();
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
