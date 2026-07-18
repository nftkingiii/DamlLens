import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, BellRing, CircleCheck, TriangleAlert } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "@/components/lens-shell";
import { compactId, useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/alerts")({ component: AlertsPage });

function AlertsPage() {
  const { analysis } = useLens();
  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Alerts"
        title="The states that need attention."
        description="Risk signals are tied directly to the contract and ledger event that produced them."
        actions={<StatusBadge status={`${analysis.alerts.length} open`} />}
      />
      <section className="alerts-layout">
        <div className="alert-list">
          {analysis.alerts.map((alert, index) => (
            <article
              className={`panel alert-card ${alert.severity}`}
              key={`${alert.title}-${index}`}
            >
              <div className="alert-icon">
                {alert.severity === "critical" ? (
                  <AlertCircle />
                ) : alert.severity === "warning" ? (
                  <TriangleAlert />
                ) : (
                  <BellRing />
                )}
              </div>
              <div className="alert-copy">
                <div>
                  <StatusBadge status={alert.severity} />
                  <span className="alert-template">{alert.template || "Workflow"}</span>
                </div>
                <h2>{alert.title}</h2>
                <p>{alert.description}</p>
                <div className="recommended">
                  <CircleCheck />
                  <span>
                    <small>Recommended action</small>
                    <strong>{alert.recommendedAction}</strong>
                  </span>
                </div>
                <footer>
                  <div className="alert-evidence-ids">
                    <code>
                      contract {compactId(alert.evidence?.contractId || alert.contractId, 10)}
                    </code>
                    {alert.evidence?.updateId && (
                      <code>update {compactId(alert.evidence.updateId, 10)}</code>
                    )}
                  </div>
                  <Link to="/app/timeline" className="text-link">
                    Open evidence <ArrowRight />
                  </Link>
                </footer>
              </div>
            </article>
          ))}
          {!analysis.alerts.length && (
            <EmptyState
              title="No active alerts"
              body="DamlLens did not find a risky active workflow state."
            />
          )}
        </div>
        <aside className="panel alert-summary">
          <span className="eyebrow">Risk summary</span>
          <strong className="risk-number">
            {analysis.alerts.filter((item) => item.severity === "critical").length}
          </strong>
          <h2>critical conditions</h2>
          <p>Derived from active Daml templates and their transition history.</p>
          <div className="risk-key">
            <span>
              <i className="critical" />
              Critical
            </span>
            <span>
              <i className="warning" />
              Warning
            </span>
            <span>
              <i className="info" />
              Information
            </span>
          </div>
        </aside>
      </section>
    </div>
  );
}
