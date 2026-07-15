import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  Eye,
  KeyRound,
  ListRestart,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Radio,
  ShieldCheck,
  Users,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/analyze")({ component: AnalyzePage });

function AnalyzePage() {
  const navigate = useNavigate();
  const {
    analysis,
    config,
    setConfig,
    connection,
    auth,
    backend,
    busy,
    error,
    validate,
    login,
    disconnect,
    loadDemo,
    loadContracts,
    createInvoiceWorkflow,
    analyzeUpdateIds,
  } = useLens();
  const [updateIds, setUpdateIds] = useState("");
  const [buyerPartyId, setBuyerPartyId] = useState("");
  const critical = analysis.summary.health === "critical";
  const update = (key: keyof typeof config) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setConfig((current) => ({ ...current, [key]: event.target.value }));

  async function finish(task: () => Promise<void>) {
    try {
      await task();
      await navigate({ to: "/app" });
    } catch {
      // The shared context presents the actionable API error inline.
    }
  }

  const ids = updateIds
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="New analysis"
        title="Give DamlLens a workflow to read."
        description="Connect a participant, load visible contracts, or analyze known ledger updates. DamlLens will move you to Overview when the interpretation is ready."
        actions={<StatusBadge status={connection} />}
      />

      <section className="analyze-grid">
        <div className="panel connection-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Connection</span>
              <h2>Canton participant</h2>
            </div>
            <StatusBadge status={connection} />
          </div>
          {!config.bearerToken ? (
            <div className="auth-connect-state">
              <div className="auth-connect-icon">
                <ShieldCheck />
              </div>
              <div>
                <span className="eyebrow">Noders secure login</span>
                <h3>Connect without handling tokens.</h3>
                <p>
                  Sign in on the provider's page. DamlLens never receives your password and
                  automatically detects your Canton party after authorization.
                </p>
              </div>
              <button
                className="button primary auth-connect-button"
                onClick={login}
                disabled={!!busy}
              >
                <LogIn />
                Connect to Canton
              </button>
              <div className="auth-assurances" aria-label="Connection assurances">
                <span>
                  <CheckCircle2 /> Provider-hosted login
                </span>
                <span>
                  <CheckCircle2 /> User-scoped ledger access
                </span>
                <span>
                  <CheckCircle2 /> No password stored
                </span>
              </div>
            </div>
          ) : (
            <div className="connected-session">
              <div className="connected-session-main">
                <span className="connection-dot connected" />
                <div>
                  <span className="eyebrow">Authenticated session</span>
                  <h3>
                    {auth === "authenticated" ? "Connected through Noders" : "Developer session"}
                  </h3>
                  <p className="mono-value">{config.partyId}</p>
                </div>
                <button className="button ghost compact" onClick={disconnect}>
                  <LogOut /> Disconnect
                </button>
              </div>
              <div className="session-actions">
                <button
                  className="button secondary"
                  onClick={validate}
                  disabled={backend !== "online" || !!busy}
                >
                  {busy === "Validating participant" ? <Loader2 className="spin" /> : <Radio />}
                  Validate access
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="inline-error">
              <AlertCircle />
              {error}
            </div>
          )}
          {backend === "offline" && (
            <div className="inline-error">
              <AlertCircle />
              DamlLens backend is offline. Start the local backend or configure
              VITE_DAMLLENS_API_URL.
            </div>
          )}
          <details className="developer-connection">
            <summary>Developer connection</summary>
            <div className="connection-metadata">
              <div>
                <span>Environment</span>
                <strong>HackCanton DevNet</strong>
              </div>
              <div>
                <span>Workflow</span>
                <strong>{config.workflowId}</strong>
              </div>
              <div className="full">
                <span>Participant</span>
                <code>{config.grpcApi}</code>
              </div>
            </div>
            {!config.bearerToken && (
              <div className="manual-token-row">
                <label className="field">
                  <span>Manual bearer token</span>
                  <div className="input-icon">
                    <KeyRound />
                    <input
                      type="password"
                      value={config.bearerToken}
                      onChange={update("bearerToken")}
                      placeholder="Development fallback"
                      autoComplete="off"
                    />
                  </div>
                </label>
                <button
                  className="button secondary"
                  onClick={validate}
                  disabled={backend !== "online" || !config.bearerToken || !!busy}
                >
                  Validate token
                </button>
              </div>
            )}
          </details>
        </div>

        <aside className="analysis-options">
          <div className="panel path-picker">
            <div className="path-picker-heading">
              <span className="eyebrow">Choose a path</span>
              <h2>What would you like to inspect?</h2>
              <p>Every option uses only ledger data visible to your connected Canton party.</p>
              {busy && (
                <div className="path-progress" role="status" aria-live="polite">
                  <Loader2 className="spin" /> {busy}
                </div>
              )}
            </div>

            <button
              className="workflow-path recommended"
              onClick={() => finish(() => createInvoiceWorkflow("personal"))}
              disabled={backend !== "online" || !config.bearerToken || !!busy}
            >
              <span className="path-icon">
                <Play />
              </span>
              <span>
                <span className="path-meta">Recommended · writes to DevNet</span>
                <strong>Create my sample workflow</strong>
                <small>
                  Run a fresh five-state invoice path owned by your party, then interpret it.
                </small>
              </span>
              <ArrowRight />
            </button>

            <button
              className="workflow-path"
              onClick={() => finish(loadContracts)}
              disabled={backend !== "online" || !config.bearerToken || !!busy}
            >
              <span className="path-icon">
                <Eye />
              </span>
              <span>
                <span className="path-meta">Read only</span>
                <strong>Discover visible contracts</strong>
                <small>Inspect active contracts already visible to your Canton party.</small>
              </span>
              <ArrowRight />
            </button>

            <div className="workflow-path shared-path">
              <span className="path-icon">
                <Users />
              </span>
              <span>
                <span className="path-meta">Multi-party · writes to DevNet</span>
                <strong>Start a shared workflow</strong>
                <small>Create an Invoice for another party. They must connect to accept it.</small>
                <label className="party-input">
                  <span>Buyer party ID</span>
                  <input
                    value={buyerPartyId}
                    onChange={(event) => setBuyerPartyId(event.target.value)}
                    placeholder="party::namespace"
                    autoComplete="off"
                  />
                </label>
                <button
                  className="button secondary"
                  onClick={() => finish(() => createInvoiceWorkflow("shared", buyerPartyId.trim()))}
                  disabled={
                    backend !== "online" || !config.bearerToken || !buyerPartyId.trim() || !!busy
                  }
                >
                  Start shared workflow <ArrowRight />
                </button>
              </span>
            </div>

            <button
              className="workflow-path"
              onClick={() => finish(loadDemo)}
              disabled={backend !== "online" || !config.bearerToken || !!busy}
            >
              <span className="path-icon">
                <Database />
              </span>
              <span>
                <span className="path-meta">Curated · original demo party only</span>
                <strong>Open the verified walkthrough</strong>
                <small>
                  Load the known invoice sequence when your party has permission to see it.
                </small>
              </span>
              <ArrowRight />
            </button>
          </div>

          <div className="panel input-option update-option">
            <ListRestart />
            <span className="eyebrow">Bring existing evidence</span>
            <h2>Analyze update IDs</h2>
            <p>Use update IDs from a workflow your connected party can see.</p>
            <textarea
              value={updateIds}
              onChange={(event) => setUpdateIds(event.target.value)}
              placeholder="One update ID per line"
              aria-label="Ledger update IDs"
            />
            <button
              className="button secondary"
              onClick={() => finish(() => analyzeUpdateIds(ids))}
              disabled={backend !== "online" || !config.bearerToken || !ids.length || !!busy}
            >
              Analyze updates <ArrowRight />
            </button>
          </div>
        </aside>
      </section>

      <section className={`panel analyze-result-preview ${critical ? "critical" : ""}`}>
        <Sparkles />
        <div>
          <span className="eyebrow">What DamlLens will produce</span>
          <h2>One interpretation across every evidence view</h2>
          <p>
            What happened, where the workflow is now, who can act, what looks risky, and the raw
            ledger evidence behind each conclusion.
          </p>
        </div>
        <div className="result-list">
          <span>
            <CheckCircle2 />
            Overview
          </span>
          <span>
            <CheckCircle2 />
            Timeline
          </span>
          <span>
            <CheckCircle2 />
            Authority
          </span>
          <span>
            <CheckCircle2 />
            Alerts
          </span>
        </div>
      </section>
    </div>
  );
}
