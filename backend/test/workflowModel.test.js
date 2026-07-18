import test from "node:test";
import assert from "node:assert/strict";
import { availableActions, findChoice } from "../src/analysis/workflowModel.js";

const PARTY_A = "party-a::abcdef123456";
const PARTY_B = "party-b::abcdef123456";

test("only exposes choices controlled by the connected party", () => {
  const contracts = [
    {
      contractId: "contract-1",
      template: "Invoice",
      status: "active",
      fields: { supplier: PARTY_A, buyer: PARTY_B },
    },
  ];

  assert.deepEqual(
    availableActions(contracts, PARTY_A).map((item) => item.choice),
    [],
  );
  assert.deepEqual(
    availableActions(contracts, PARTY_B).map((item) => item.choice),
    ["AcceptInvoice", "DisputeInvoice"],
  );
});

test("describes typed choice arguments", () => {
  assert.deepEqual(findChoice("AcceptedInvoice", "RequestFinancing")?.arguments, [
    { name: "financier", type: "party", required: true },
  ]);
});
