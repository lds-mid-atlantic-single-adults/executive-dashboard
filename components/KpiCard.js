import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function KpiCard({ label, value, detail, tone = "blue", delta }) {
  const Icon = Number.isFinite(delta) ? (delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus) : null;
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-detail">
        {Icon ? <Icon size={16} aria-hidden="true" /> : null}
        <span>{detail}</span>
      </div>
    </article>
  );
}
