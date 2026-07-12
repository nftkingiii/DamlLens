import { createFileRoute } from "@tanstack/react-router";
import { Copy, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader, StatusBadge } from "@/components/lens-shell";
import { compactId, formatDate, useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/contracts")({ component: ContractsPage });

function ContractsPage() {
  const { analysis } = useLens();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
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
