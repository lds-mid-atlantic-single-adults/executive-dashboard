import { AlertTriangle, CheckCircle2, MapPinned, Target, TrendingDown, TrendingUp } from "lucide-react";

const ICONS = {
  Geography: MapPinned,
  Engagement: Target,
  Retention: TrendingDown,
  "Demographic Gap": AlertTriangle,
  "Growth Opportunity": TrendingUp
};

export default function RecommendationCard({ recommendation }) {
  const Icon = ICONS[recommendation.issueType] || CheckCircle2;
  return (
    <article className={`recommendation severity-${recommendation.severity.toLowerCase()}`}>
      <div className="recommendation-rank">#{recommendation.priorityRank}</div>
      <div className="recommendation-body">
        <div className="recommendation-header">
          <Icon size={22} aria-hidden="true" />
          <div>
            <p className="eyebrow">{recommendation.issueType} / {recommendation.severity}</p>
            <h3>{recommendation.issue}</h3>
          </div>
        </div>
        <div className="recommendation-grid">
          <div>
            <span>Measured condition</span>
            <strong>{recommendation.condition}</strong>
          </div>
          <div>
            <span>Trend</span>
            <strong>{recommendation.trend}</strong>
          </div>
          <div>
            <span>Estimated impact</span>
            <strong>{recommendation.impact}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{recommendation.confidence}</strong>
          </div>
        </div>
        <div className="action-list">
          {recommendation.actions.map((action) => (
            <span key={action}>{action}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
