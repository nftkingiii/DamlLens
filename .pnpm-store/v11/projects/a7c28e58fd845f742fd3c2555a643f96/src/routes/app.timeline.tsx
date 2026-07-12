import { createFileRoute } from "@tanstack/react-router";
import { Archive, Check, CircleDot, Copy, FilePlus2 } from "lucide-react";
import { useState } from "react";
import { PageHeader, Pager, StatusBadge } from "@/components/lens-shell";
import { compactId, formatDate, useLens } from "@/lib/lens";

export const Route = createFileRoute("/app/timeline")({ component: TimelinePage });

function TimelinePage() {
  const { analysis } = useLens();
  const [index, setIndex] = useState(Math.max(0, analysis.timeline.length - 1));
  const event = analysis.timeline[index];

  return (
    <div className="app-page">
      <PageHeader
        eyebrow="Timeline"
        title="Every state change, in order."
        description="Follow creates and archives as one business workflow instead of decoding isolated ledger events."
        actions={<StatusBadge status={`${analysis.timeline.length} events`} />}
      />
      <section className="timeline-stage panel">
        <div className="timeline-rail" aria-label="Workflow event progress">
          {analysis.timeline.map((item, itemIndex) => (
            <button
              key={item.id}
              className={`rail-step ${itemIndex === index ? "active" : ""} ${itemIndex < index ? "passed" : ""}`}
              onClick={() => setIndex(itemIndex)}
              aria-label={`Open ${item.label}`}
            >
              <span>
                {itemIndex < index ? (
                  <Check />
                ) : item.kind === "created" ? (
                  <FilePlus2 />
                ) : (
                  <Archive />
                )}
              </span>
              <small>{item.template}</small>
            </button>
          ))}
        </div>
        {event ? (
          <div className="event-focus">
            <div className="event-main">
              <div className="event-number">{String(index + 1).padStart(2, "0")}</div>
              <StatusBadge status={event.kind} />
              <h2>{event.label}</h2>
              <p>{event.explanation}</p>
              <div className="event-meta">
                <span>
                  <CircleDot />
                  {formatDate(event.at)}
                </span>
                <span>Offset {event.offset || "preview"}</span>
              </div>
            </div>
            <div className="event-evidence">
              <span className="eyebrow">Ledger evidence</span>
              <Evidence label="Contract ID" value={compactId(event.contractId, 12)} />
              <Evidence label="Update ID" value={compactId(event.updateId, 12)} />
              <Evidence label="Command" value={event.commandId || "Not available in preview"} />
              <Evidence label="Witnesses" value={String(event.witnessParties.length)} />
            </div>
          </div>
        ) : (
          <div className="empty-state">No timeline events found.</div>
        )}
        <Pager
          index={index}
          count={analysis.timeline.length}
          previous={() => setIndex((value) => Math.max(0, value - 1))}
          next={() => setIndex((value) => Math.min(analysis.timeline.length - 1, value + 1))}
        />
      </section>
    </div>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div className="evidence-row">
      <span>{label}</span>
      <code>{value}</code>
      <button
        className="icon-button tiny"
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        onClick={() => navigator.clipboard?.writeText(value)}
      >
        <Copy />
      </button>
    </div>
  );
}
