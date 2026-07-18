import test from "node:test";
import assert from "node:assert/strict";
import { analyzeUpdates } from "../src/analysis/workflowAnalyzer.js";

test("interprets an overdue invoice and preserves evidence ids", () => {
  const update = {
    transaction: {
      update_id: "update-overdue-123456789",
      command_id: "flag-overdue-1",
      workflow_id: "invoice-test",
      effective_at: "2026-07-18T12:00:00Z",
      events: [
        {
          created: {
            offset: "42",
            contract_id: "contract-overdue-123",
            template_id: { entity_name: "OverdueInvoice" },
            create_arguments: {
              fields: [
                { label: "status", value: { text: "Buyer payment missing" } },
                { label: "financier", value: { party: "finance::abcdef123456" } },
              ],
            },
            signatories: ["finance::abcdef123456"],
            witness_parties: ["finance::abcdef123456"],
            created_at: "2026-07-18T12:00:00Z",
          },
        },
      ],
    },
  };

  const result = analyzeUpdates(update);
  assert.equal(result.summary.health, "critical");
  assert.equal(result.currentState?.template, "OverdueInvoice");
  assert.equal(result.alerts[0].evidence.updateId, "update-overdue-123456789");
  assert.equal(result.alerts[0].evidence.commandId, "flag-overdue-1");
});
