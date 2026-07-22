import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Copy, Loader2, Play, RefreshCw, Search, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { compactId, formatDate, useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/contracts")({ component: ContractsPage });

function ContractsPage() {
  const {
    analysis,
    actions,
    exerciseAction,
    loadContracts,
    liveDiscovery,
    setLiveDiscovery,
    lastDiscoveredAt,
    connection,
    busy,
  } = useLens();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [actionValues, setActionValues] = useState<Record<string, Record<string, string>>>({});
  const contracts = useMemo(
    () =>
      analysis.contracts.filter(
        (contract) =>
          (status === "all" || contract.status === status) &&
          `${contract.template} ${contract.contractId}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [analysis.contracts, query, status],
  );
  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Contracts"
        title="The workflow's contract inventory."
        description="Inspect active and archived contracts without searching raw responses or indexer tables."
        actions={<StatusBadge status={`${contracts.length} shown`} />}
      />
      <section className="panel action-inbox">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Action inbox</span>
            <h2>Choices your party can authorize</h2>
            <p>
              DamlLens derives these actions from the active contract, its controller roles, and
              your connected Canton party.
            </p>
          </div>
          <div className="inbox-controls">
            <label className="live-toggle">
              <input
                type="checkbox"
                checked={liveDiscovery}
                onChange={(event) => setLiveDiscovery(event.target.checked)}
              />
              <span>Live discovery</span>
            </label>
            <button
              className="icon-button"
              onClick={() => loadContracts()}
              disabled={connection !== "connected" || !!busy}
              aria-label="Refresh visible contracts"
              title="Refresh visible contracts"
            >
              <RefreshCw className={busy ? "spin" : ""} />
            </button>
          </div>
        </div>
        {lastDiscoveredAt && (
          <p className="discovery-time">Last checked {formatDate(lastDiscoveredAt)}</p>
        )}
        <div className="action-list">
          {actions.map((action) => {
            const values = actionValues[action.id] || {};
            const ready = action.arguments.every(
              (argument) => !argument.required || values[argument.name]?.trim(),
            );
            return (
              <article className="action-card" key={action.id}>
                <div className="action-card-icon">
                  <Zap />
                </div>
                <div className="action-card-copy">
                  <span className="eyebrow">{action.template}</span>
                  <h3>{action.choice}</h3>
                  <p>{action.explanation}</p>
                  {action.arguments.map((argument) => (
                    <label className="action-field" key={argument.name}>
                      <span>
                        {argument.name} · {argument.type}
                      </span>
                      {argument.type === "bool" ? (
                        <select
                          value={values[argument.name] || ""}
                          onChange={(event) =>
                            setActionValues((current) => ({
                              ...current,
                              [action.id]: { ...values, [argument.name]: event.target.value },
                            }))
                          }
                        >
                          <option value="">Select</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : (
                        <input
                          type={
                            argument.type === "date"
                              ? "date"
                              : argument.type === "numeric" || argument.type === "int64"
                                ? "number"
                                : "text"
                          }
                          step={argument.type === "numeric" ? "any" : undefined}
                          value={values[argument.name] || ""}
                          onChange={(event) =>
                            setActionValues((current) => ({
                              ...current,
                              [action.id]: { ...values, [argument.name]: event.target.value },
                            }))
                          }
                          placeholder={
                            argument.type === "party"
                              ? "party::namespace"
                              : `Enter ${argument.name}`
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
                <button
                  className="button primary compact"
                  disabled={!ready || !!busy}
                  onClick={() => exerciseAction(action, values)}
                >
                  {busy === `Authorizing ${action.choice}` ? (
                    <Loader2 className="spin" />
                  ) : (
                    <Play />
                  )}
                  Authorize <ArrowRight />
                </button>
              </article>
            );
          })}
          {!actions.length && (
            <div className="inbox-empty">
              <strong>No choices currently require this party.</strong>
              <span>
                Refresh visible contracts or wait for another participant to advance the workflow.
              </span>
            </div>
          )}
        </div>
      </section>
      <section className="panel contracts-panel">
        <div className="table-tools">
          <label className="search-box">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search template or contract ID"
            />
          </label>
          <div className="segmented">
            <button className={status === "all" ? "active" : ""} onClick={() => setStatus("all")}>
              All
            </button>
            <button
              className={status === "active" ? "active" : ""}
              onClick={() => setStatus("active")}
            >
              Active
            </button>
            <button
              className={status === "archived" ? "active" : ""}
              onClick={() => setStatus("archived")}
            >
              Archived
            </button>
          </div>
        </div>
        <div className="contract-table" role="table">
          <div className="contract-row table-head" role="row">
            <span>Template</span>
            <span>State</span>
            <span>Contract ID</span>
            <span>Created</span>
            <span>Visibility</span>
            <span />
          </div>
          {contracts.map((contract) => (
            <div className="contract-row" role="row" key={contract.contractId}>
              <span>
                <strong>{contract.template}</strong>
                <small>{contract.businessState.replaceAll("_", " ")}</small>
              </span>
              <StatusBadge status={contract.status} />
              <code>{compactId(contract.contractId, 10)}</code>
              <span>{formatDate(contract.createdAt)}</span>
              <span>
                {contract.witnessParties.length} witness / {contract.signatories.length} signatory
              </span>
              <button
                className="icon-button tiny"
                onClick={() => navigator.clipboard?.writeText(contract.contractId)}
                aria-label="Copy contract ID"
                title="Copy contract ID"
              >
                <Copy />
              </button>
            </div>
          ))}
          {!contracts.length && (
            <div className="table-empty">No contracts match these filters.</div>
          )}
        </div>
      </section>
    </div>
  );
}
