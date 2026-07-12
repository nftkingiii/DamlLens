import { createFileRoute } from "@tanstack/react-router";
import { Braces, Check, Copy, Database, FileJson, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/raw-data")({ component: RawDataPage });

type EvidenceView = "analysis" | "timeline" | "contracts" | "parties";

function RawDataPage() {
  const { analysis, config } = useLens();
  const [view, setView] = useState<EvidenceView>("analysis");
  const [copied, setCopied] = useState(false);

  const data = useMemo(() => {
    if (view === "timeline") return analysis.timeline;
    if (view === "contracts") return analysis.contracts;
    if (view === "parties") return analysis.parties;
    return analysis;
  }, [analysis, view]);

  const json = JSON.stringify(data, null, 2);

  async function copyJson() {
    await navigator.clipboard?.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Raw data"
        title="Trust the interpretation. Inspect the evidence."
        description="Review the normalized contract, event, and party data used by every DamlLens explanation."
        actions={
          <StatusBadge
            status={analysis.source.includes("Illustrative") ? "Preview data" : "Ledger data"}
          />
        }
      />

      <section className="raw-layout">
        <aside className="panel raw-sidebar">
          <span className="eyebrow">Evidence views</span>
          <RawViewButton
            active={view === "analysis"}
            icon={Braces}
            label="Full analysis"
            onClick={() => setView("analysis")}
          />
          <RawViewButton
            active={view === "timeline"}
            icon={FileJson}
            label="Timeline events"
            onClick={() => setView("timeline")}
          />
          <RawViewButton
            active={view === "contracts"}
            icon={Database}
            label="Contracts"
            onClick={() => setView("contracts")}
          />
          <RawViewButton
            active={view === "parties"}
            icon={ShieldCheck}
            label="Parties & roles"
            onClick={() => setView("parties")}
          />

          <div className="raw-context">
            <span>Workflow</span>
            <strong>{analysis.workflowId}</strong>
            <span>Package</span>
            <code>{config.packageId}</code>
            <span>Source</span>
            <strong>{analysis.source}</strong>
          </div>
        </aside>

        <div className="panel raw-viewer">
          <header>
            <div>
              <span className="eyebrow">Normalized JSON</span>
              <h2>{viewLabel(view)}</h2>
            </div>
            <button className="button secondary compact" onClick={copyJson}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy JSON"}
            </button>
          </header>
          <pre>{json}</pre>
        </div>
      </section>
    </div>
  );
}

function RawViewButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Braces;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`raw-view-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon />
      <span>{label}</span>
    </button>
  );
}

function viewLabel(view: EvidenceView) {
  return {
    analysis: "Complete workflow analysis",
    timeline: "Created and archived events",
    contracts: "Active and archived contract state",
    parties: "Observed parties and authority roles",
  }[view];
}
