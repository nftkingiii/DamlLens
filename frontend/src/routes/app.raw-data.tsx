import { createFileRoute } from "@tanstack/react-router";
import {
  Braces,
  Check,
  Copy,
  Database,
  Download,
  FileJson,
  FolderOpen,
  Save,
  Share2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/raw-data")({ component: RawDataPage });

type EvidenceView = "analysis" | "timeline" | "contracts" | "parties";

function RawDataPage() {
  const {
    analysis,
    config,
    savedAnalyses,
    saveCurrentAnalysis,
    openSavedAnalysis,
    deleteSavedAnalysis,
  } = useLens();
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

  function downloadReport() {
    const report = [
      `# DamlLens Workflow Report`,
      ``,
      `Workflow: ${analysis.workflowId}`,
      `Source: ${analysis.source}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `## Interpretation`,
      analysis.summary.title,
      ``,
      analysis.summary.plainEnglish,
      ``,
      `Next step: ${analysis.summary.nextStep}`,
      ``,
      `## Metrics`,
      `- Active contracts: ${analysis.metrics.activeContracts}`,
      `- Archived contracts: ${analysis.metrics.archivedContracts}`,
      `- Ledger events: ${analysis.metrics.totalEvents}`,
      `- Alerts: ${analysis.metrics.alerts}`,
      ``,
      `## Timeline`,
      ...analysis.timeline.map(
        (item) => `- ${item.label}: ${item.explanation} (${item.updateId || "preview"})`,
      ),
      ``,
      `## Raw normalized evidence`,
      "```json",
      JSON.stringify(analysis, null, 2),
      "```",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${analysis.workflowId || "damllens-workflow"}-report.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function shareReport() {
    const text = `${analysis.summary.title}\n\n${analysis.summary.plainEnglish}\n\nNext: ${analysis.summary.nextStep}`;
    if (navigator.share) {
      await navigator.share({ title: `DamlLens · ${analysis.workflowId}`, text });
      return;
    }
    await navigator.clipboard?.writeText(text);
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
            <div className="raw-actions">
              <button className="button secondary compact" onClick={() => saveCurrentAnalysis()}>
                <Save /> Save snapshot
              </button>
              <button className="button secondary compact" onClick={downloadReport}>
                <Download /> Export report
              </button>
              <button className="button secondary compact" onClick={shareReport}>
                <Share2 /> Share summary
              </button>
              <button className="button secondary compact" onClick={copyJson}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
          </header>
          <pre>{json}</pre>
        </div>
      </section>
      <section className="panel saved-analysis-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Saved locally</span>
            <h2>Analysis snapshots</h2>
          </div>
          <StatusBadge status={`${savedAnalyses.length} saved`} />
        </div>
        <div className="saved-analysis-list">
          {savedAnalyses.map((saved) => (
            <article key={saved.id}>
              <FolderOpen />
              <div>
                <strong>{saved.name}</strong>
                <small>{new Date(saved.savedAt).toLocaleString()}</small>
              </div>
              <button
                className="button secondary compact"
                onClick={() => openSavedAnalysis(saved.id)}
              >
                Open
              </button>
              <button
                className="icon-button tiny"
                onClick={() => deleteSavedAnalysis(saved.id)}
                aria-label={`Delete ${saved.name}`}
                title="Delete snapshot"
              >
                <Trash2 />
              </button>
            </article>
          ))}
          {!savedAnalyses.length && (
            <p className="table-empty">No snapshots saved on this device.</p>
          )}
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
