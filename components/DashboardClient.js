"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Download, Filter, Landmark, MapPinned, Search, Users } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import RecommendationCard from "@/components/RecommendationCard";
import { BarList, CouncilMap, DemographicMatrix, MovementRibbon, OpportunityTable } from "@/components/Charts";
import { AGE_SEGMENTS, aggregateBy, buildDashboardModel, num, pct } from "@/lib/analytics";

const ALL = "all";

function unique(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function rateTone(rate) {
  if (!Number.isFinite(rate)) return "blue";
  if (rate >= 0.18) return "green";
  if (rate >= 0.08) return "amber";
  return "red";
}

export default function DashboardClient({ dataset }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [activeTab, setActiveTab] = useState("executive");
  const [filters, setFilters] = useState({
    ageSegment: ALL,
    gender: ALL,
    period: ALL,
    council: ALL,
    stake: ALL,
    unitQuery: ""
  });

  const options = useMemo(() => {
    const councilRows =
      filters.council === ALL
        ? dataset.rows
        : dataset.rows.filter((row) => row.coordinatingCouncil === filters.council);
    return {
      councils: unique(dataset.rows, "coordinatingCouncil"),
      stakes: unique(councilRows, "stakeOrDistrict"),
      periods: dataset.metadata.periods || []
    };
  }, [dataset.rows, dataset.metadata.periods, filters.council]);

  const model = useMemo(() => buildDashboardModel(dataset, filters), [dataset, filters]);
  const councilMax = Math.max(...model.councilSummary.map((item) => item.rate || 0), 0.01);
  const stakeMax = Math.max(...model.stakeSummary.map((item) => item.rate || 0), 0.01);
  const selectedCouncil = filters.council === ALL ? "all" : filters.council;

  function setFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "council" ? { stake: ALL } : {})
    }));
  }

  return (
    <main className="dashboard-shell">
      <aside className="identity-rail">
        <div className="mark"><Landmark size={24} /></div>
        <div>
          <strong>Mid-Atlantic Singles Council</strong>
          <span>Executive decision platform</span>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Mid-Atlantic Singles Council Executive Dashboard</h1>
            <p>
              {dataset.metadata.sourceSystem} · {dataset.metadata.sourceServer}.{dataset.metadata.sourceDatabase}.
              {dataset.metadata.sourceSchema} · {num(dataset.metadata.rowCount)} adult source rows
            </p>
          </div>
          <a className="download-button" href={`${basePath}/data/masc-sql-source-rows.csv`} download>
            <Download size={17} />
            CSV extract
          </a>
        </header>

        <nav className="mode-tabs" aria-label="Major dashboard views">
          <button className={activeTab === "executive" ? "active" : ""} onClick={() => setActiveTab("executive")} type="button">
            <Landmark size={18} />
            Executive Council View
          </button>
          <button className={activeTab === "drilldown" ? "active" : ""} onClick={() => setActiveTab("drilldown")} type="button">
            <Users size={18} />
            Stake / Ward Drilldown View
          </button>
        </nav>

        <GlobalFilters filters={filters} options={options} onChange={setFilter} />

        {activeTab === "executive" ? (
          <ExecutiveView model={model} councilMax={councilMax} selectedCouncil={selectedCouncil} />
        ) : (
          <DrilldownView model={model} filters={filters} options={options} onChange={setFilter} stakeMax={stakeMax} selectedCouncil={selectedCouncil} />
        )}

        <footer className="source-footer">
          Age rule: rows for ages 17 and younger are excluded. Runtime source: {dataset.metadata.runtimeSource || "Static SQL-derived export"}.
        </footer>
      </section>
    </main>
  );
}

function GlobalFilters({ filters, options, onChange }) {
  return (
    <section className="global-filters" aria-label="Global filters">
      <label>
        <span><Filter size={14} /> Age bucket</span>
        <select value={filters.ageSegment} onChange={(event) => onChange("ageSegment", event.target.value)}>
          <option value={ALL}>All adults 18+</option>
          {AGE_SEGMENTS.map((segment) => (
            <option key={segment.id} value={segment.id}>{segment.shortLabel}</option>
          ))}
        </select>
      </label>
      <label>
        <span><Users size={14} /> Gender</span>
        <select value={filters.gender} onChange={(event) => onChange("gender", event.target.value)}>
          <option value={ALL}>All available genders</option>
          <option value="male">Male counts</option>
          <option value="female">Female counts</option>
        </select>
      </label>
      <label>
        <span><CalendarDays size={14} /> Period</span>
        <select value={filters.period} onChange={(event) => onChange("period", event.target.value)}>
          <option value={ALL}>Latest vs prior</option>
          {options.periods.map((period) => (
            <option key={period.period} value={period.period}>{period.period}</option>
          ))}
        </select>
      </label>
      <label>
        <span><MapPinned size={14} /> Council</span>
        <select value={filters.council} onChange={(event) => onChange("council", event.target.value)}>
          <option value={ALL}>All councils</option>
          {options.councils.map((council) => (
            <option key={council} value={council}>{council}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

function ExecutiveView({ model, councilMax, selectedCouncil }) {
  const participatingDelta = model.latestSummary.participating - model.priorSummary.participating;
  const momentumScore = Math.round(Math.min(Math.max(50 + (model.movement || 0) * 420 + participatingDelta / 220, 0), 100));
  const opportunityRate = model.opportunities[0]?.targetRate || model.latestSummary.rate;

  return (
    <section className="view-stack">
      <section className="executive-brief">
        <h2>{model.summaryText}</h2>
      </section>

      <section className="kpi-grid">
        <KpiCard label="Singles Reached" value={num(model.latestSummary.participating)} detail={`${num(participatingDelta)} change vs ${model.priorPeriod}`} tone="green" delta={participatingDelta} />
        <KpiCard label="Participation Rate" value={pct(model.latestSummary.rate)} detail={`Current adult reach across ${num(model.latestSummary.units)} units`} tone={rateTone(model.latestSummary.rate)} delta={model.movement} />
        <KpiCard label="Momentum Score" value={`${momentumScore}/100`} detail={model.movement >= 0 ? "Growing or stable momentum" : "Negative momentum"} tone={momentumScore >= 65 ? "green" : momentumScore >= 45 ? "amber" : "red"} delta={model.movement} />
        <KpiCard label="Engagement Trend" value={model.movement >= 0 ? "Growing" : "Shrinking"} detail={`${num(model.coverage.matched)} comparable units`} tone={model.movement >= 0 ? "green" : "red"} delta={model.movement} />
        <KpiCard label="At-Risk Population" value={num(model.atRiskPopulation)} detail={`${num(model.engagementCounts.longInactive)} long-inactive units`} tone={model.atRiskPopulation ? "red" : "green"} />
        <KpiCard label="Opportunity Population" value={num(model.opportunityPopulation)} detail={`Below ${pct(opportunityRate)} opportunity benchmark`} tone="purple" />
      </section>

      <section className="panel action-center">
        <div className="section-title">
          <h2>Leadership Action Center</h2>
          <p>Prescriptive recommendations generated from measurable SQL-derived conditions.</p>
        </div>
        <div className="recommendation-list">
          {model.recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.priorityRank} recommendation={recommendation} />
          ))}
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="section-title">
            <h2>Who Is Being Reached?</h2>
            <p>Age and gender participation distribution.</p>
          </div>
          <DemographicMatrix segments={model.ageSegments} />
        </article>
        <article className="panel">
          <div className="section-title">
            <h2>State Of The Ecosystem</h2>
            <p>Active, recently inactive, and long inactive unit distribution.</p>
          </div>
          <MovementRibbon model={model} />
          <BarList items={model.councilSummary} max={councilMax} />
        </article>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="section-title">
            <h2>Geography And High-Density Gaps</h2>
            <p>Bubble size is adult population; color is participation health.</p>
          </div>
          <CouncilMap rows={model.latest} selectedCouncil={selectedCouncil} />
        </article>
        <article className="panel">
          <div className="section-title">
            <h2>Opportunity Prioritization Model</h2>
            <p>Population impact x engagement gap x trend severity x intervention probability.</p>
          </div>
          <OpportunityTable rows={model.opportunities} />
        </article>
      </section>
    </section>
  );
}

function DrilldownView({ model, filters, options, onChange, stakeMax, selectedCouncil }) {
  const stakeRows = aggregateBy(model.latest, "stakeOrDistrict").sort((a, b) => b.rate - a.rate);

  return (
    <section className="view-stack">
      <section className="drilldown-filters">
        <label>
          <span>Stake / District</span>
          <select value={filters.stake} onChange={(event) => onChange("stake", event.target.value)}>
            <option value={ALL}>All stakes / districts</option>
            {options.stakes.map((stake) => (
              <option key={stake} value={stake}>{stake}</option>
            ))}
          </select>
        </label>
        <label>
          <span><Search size={14} /> Ward / Branch / Unit</span>
          <input value={filters.unitQuery} onChange={(event) => onChange("unitQuery", event.target.value)} placeholder="Search units" />
        </label>
      </section>

      <section className="kpi-grid compact">
        <KpiCard label="Local Singles Reached" value={num(model.latestSummary.participating)} detail={`${pct(model.latestSummary.rate)} participation`} tone={rateTone(model.latestSummary.rate)} />
        <KpiCard label="Local Opportunity" value={num(model.opportunityPopulation)} detail="Adults in below-benchmark units" tone="purple" />
        <KpiCard label="Unit Archetype Watch" value={model.opportunities[0]?.archetype || "Stable Core"} detail={model.opportunities[0]?.unitName || "No high-risk unit"} tone="amber" />
        <KpiCard label="Comparable Units" value={num(model.coverage.matched)} detail={`${num(model.coverage.newUnits)} new units`} tone="blue" />
      </section>

      <section className="panel action-center">
        <div className="section-title">
          <h2>Local Recommendation Cards</h2>
          <p>Recomputed from the current council, stake, unit, age, gender, and period filters.</p>
        </div>
        <div className="recommendation-list">
          {model.recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.priorityRank} recommendation={recommendation} />
          ))}
        </div>
      </section>

      <section className="grid-two">
        <article className="panel">
          <div className="section-title">
            <h2>Stake / District Participation</h2>
            <p>Sorted by current participation rate.</p>
          </div>
          <BarList items={stakeRows} max={stakeMax} />
        </article>
        <article className="panel">
          <div className="section-title">
            <h2>Local Geography</h2>
            <p>Current filter mapped to unit geography.</p>
          </div>
          <CouncilMap rows={model.latest} selectedCouncil={selectedCouncil} />
        </article>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Ward / Branch / Unit Action Queue</h2>
          <p>Sorted by opportunity score.</p>
        </div>
        <OpportunityTable rows={model.opportunities} />
      </section>
    </section>
  );
}
