const STATUS_BY_TEMPLATE = {
  Invoice: "created",
  AcceptedInvoice: "accepted",
  FinancingRequest: "awaiting_financing",
  FundedInvoice: "funded",
  OverdueInvoice: "overdue",
  PaymentReceived: "paid",
  SettledInvoice: "settled",
  CethCollateralLock: "collateral_locked",
  LoanTerms: "terms_proposed",
  RiskReview: "risk_reviewed",
  FundingApproval: "funding_approved",
  RepaymentObligation: "repayment_unresolved",
  CollateralRelease: "collateral_release",
  CollateralActionRequired: "collateral_action_required"
};

const RISKY_TEMPLATES = new Set(["OverdueInvoice", "CollateralActionRequired", "RepaymentObligation"]);

export function analyzeUpdates(updateResponses) {
  const updates = Array.isArray(updateResponses) ? updateResponses : [updateResponses];
  const events = updates.flatMap(extractEvents).sort((a, b) => Number(a.offset || 0) - Number(b.offset || 0));
  const contracts = buildContractStates(events);
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const archivedContracts = contracts.filter((contract) => contract.status === "archived");
  const latestActive = activeContracts.at(-1) || contracts.at(-1) || null;
  const alerts = buildAlerts(activeContracts, events);

  return {
    source: "Canton DevNet Ledger API",
    workflowId: updates.find((update) => update?.transaction?.workflow_id)?.transaction?.workflow_id || "unknown-workflow",
    summary: summarize(latestActive, alerts, activeContracts, archivedContracts),
    metrics: {
      activeContracts: activeContracts.length,
      archivedContracts: archivedContracts.length,
      totalEvents: events.length,
      alerts: alerts.length
    },
    currentState: latestActive,
    timeline: events.map(toTimelineItem),
    contracts,
    parties: extractParties(events),
    alerts
  };
}

export function analyzeActiveContracts(activeContractsResponse) {
  const contracts = normalizeActiveContracts(activeContractsResponse);
  const events = contracts.map((contract, index) => ({
    kind: "created",
    index,
    offset: contract.offset || String(index),
    updateId: contract.updateId || null,
    commandId: null,
    workflowId: null,
    contractId: contract.contractId,
    template: contract.template,
    templateId: contract.templateId,
    fields: contract.fields,
    witnessParties: contract.witnessParties || [],
    signatories: contract.signatories || [],
    createdAt: contract.createdAt || null
  }));
  return analyzeUpdates([{ transaction: { workflow_id: "active-contracts", events: events.map((event) => ({ created: denormalizeCreated(event) })) } }]);
}

function extractEvents(update) {
  const transaction = update?.transaction;
  if (!transaction?.events) return [];
  return transaction.events.flatMap((event, index) => {
    if (event.created) return [normalizeCreated(event.created, transaction, index)];
    if (event.archived) return [normalizeArchived(event.archived, transaction, index)];
    return [];
  });
}

function normalizeCreated(created, transaction, index) {
  return {
    kind: "created",
    index,
    offset: created.offset,
    updateId: transaction.update_id,
    commandId: transaction.command_id,
    workflowId: transaction.workflow_id,
    contractId: created.contract_id,
    template: created.template_id?.entity_name,
    templateId: created.template_id,
    fields: recordFieldsToObject(created.create_arguments?.fields || []),
    witnessParties: created.witness_parties || [],
    signatories: created.signatories || [],
    createdAt: created.created_at || transaction.effective_at
  };
}

function normalizeArchived(archived, transaction, index) {
  return {
    kind: "archived",
    index,
    offset: archived.offset,
    updateId: transaction.update_id,
    commandId: transaction.command_id,
    workflowId: transaction.workflow_id,
    contractId: archived.contract_id,
    template: archived.template_id?.entity_name,
    templateId: archived.template_id,
    fields: {},
    witnessParties: archived.witness_parties || [],
    signatories: [],
    createdAt: transaction.effective_at
  };
}

function denormalizeCreated(event) {
  return {
    offset: event.offset,
    contract_id: event.contractId,
    template_id: event.templateId,
    create_arguments: { fields: objectToRecordFields(event.fields) },
    witness_parties: event.witnessParties,
    signatories: event.signatories,
    created_at: event.createdAt
  };
}

function buildContractStates(events) {
  const byId = new Map();
  for (const event of events) {
    if (event.kind === "created") {
      byId.set(event.contractId, {
        contractId: event.contractId,
        template: event.template,
        templateId: event.templateId,
        status: "active",
        businessState: STATUS_BY_TEMPLATE[event.template] || "active",
        fields: event.fields,
        signatories: event.signatories,
        witnessParties: event.witnessParties,
        createdAt: event.createdAt,
        lastOffset: event.offset,
        lastUpdateId: event.updateId,
        risk: RISKY_TEMPLATES.has(event.template) ? "warning" : "normal"
      });
    }

    if (event.kind === "archived") {
      const existing = byId.get(event.contractId) || {
        contractId: event.contractId,
        template: event.template,
        templateId: event.templateId,
        fields: {},
        signatories: [],
        witnessParties: event.witnessParties,
        createdAt: null
      };
      byId.set(event.contractId, {
        ...existing,
        status: "archived",
        businessState: "archived",
        lastOffset: event.offset,
        lastUpdateId: event.updateId,
        risk: "none"
      });
    }
  }
  return [...byId.values()];
}

function buildAlerts(activeContracts, events) {
  const alerts = [];
  for (const contract of activeContracts) {
    if (contract.template === "OverdueInvoice") {
      alerts.push({
        severity: "critical",
        title: "Buyer payment missing",
        contractId: contract.contractId,
        template: contract.template,
        description: "The workflow reached OverdueInvoice after FundInvoice was archived through FlagOverdue.",
        recommendedAction: "Review buyer payment status and resolve the overdue invoice path."
      });
    }
    if (contract.template === "CollateralActionRequired") {
      alerts.push({
        severity: "critical",
        title: "Collateral action required",
        contractId: contract.contractId,
        template: contract.template,
        description: contract.fields.reason || "Repayment is unresolved and collateral action is required.",
        recommendedAction: "Have the lender or custody party resolve the collateral state."
      });
    }
    if (contract.template === "RepaymentObligation") {
      alerts.push({
        severity: "warning",
        title: "Repayment unresolved",
        contractId: contract.contractId,
        template: contract.template,
        description: contract.fields.status || "Repayment confirmation is missing.",
        recommendedAction: "Ask the borrower to confirm repayment or escalate collateral handling."
      });
    }
  }

  if (!alerts.length && events.length) {
    alerts.push({
      severity: "info",
      title: "Workflow activity loaded",
      description: "DamlLens parsed ledger events and found no active risk template.",
      recommendedAction: "Open the timeline to inspect created and archived contracts."
    });
  }
  return alerts;
}

function summarize(latestActive, alerts, activeContracts, archivedContracts) {
  if (!latestActive) {
    return {
      health: "empty",
      title: "No visible workflow state found",
      plainEnglish: "DamlLens did not find active contracts for this party and filter.",
      nextStep: "Load a workflow, broaden filters, or create a sample workflow."
    };
  }

  if (latestActive.template === "OverdueInvoice") {
    return {
      health: "critical",
      title: "Invoice financing workflow is overdue",
      plainEnglish: "The invoice was accepted, financing was requested and funded, then the funded invoice was archived into an OverdueInvoice because buyer payment is missing.",
      nextStep: "Resolve the missing buyer payment or review the overdue invoice handling path."
    };
  }

  if (latestActive.template === "CollateralActionRequired") {
    return {
      health: "critical",
      title: "cETH collateral workflow needs action",
      plainEnglish: "Repayment remains unresolved and the workflow escalated into a collateral action state.",
      nextStep: "Have the lender or custody party decide the collateral action."
    };
  }

  return {
    health: alerts.some((alert) => alert.severity === "critical") ? "critical" : "ok",
    title: `${latestActive.template} is active`,
    plainEnglish: `DamlLens found ${activeContracts.length} active contract(s) and ${archivedContracts.length} archived contract(s). The current visible state is ${latestActive.template}.`,
    nextStep: "Inspect timeline and party permissions for the next exercisable choice."
  };
}

function toTimelineItem(event) {
  return {
    id: `${event.updateId || "event"}-${event.index}`,
    kind: event.kind,
    label: event.kind === "created" ? `${event.template} created` : `${event.template} archived`,
    template: event.template,
    contractId: event.contractId,
    updateId: event.updateId,
    commandId: event.commandId,
    offset: event.offset,
    at: event.createdAt,
    fields: event.fields,
    signatories: event.signatories,
    witnessParties: event.witnessParties,
    explanation: explainEvent(event)
  };
}

function explainEvent(event) {
  if (event.kind === "archived") return `${event.template} was archived as the workflow moved to the next state.`;
  if (event.template === "OverdueInvoice") return "The workflow is now overdue because buyer payment is missing.";
  if (event.template === "FinancingRequest") return "The supplier requested financing and made the request visible to the financier.";
  if (event.template === "FundedInvoice") return "The financier funded the invoice, creating the state that waits for buyer payment or overdue handling.";
  if (event.template === "AcceptedInvoice") return "The buyer accepted the invoice, allowing financing to be requested.";
  return `${event.template} became active.`;
}

function extractParties(events) {
  const parties = new Map();
  for (const event of events) {
    for (const party of event.signatories || []) addParty(parties, party, "signatory", event.template);
    for (const party of event.witnessParties || []) addParty(parties, party, "witness", event.template);
    for (const [label, value] of Object.entries(event.fields || {})) {
      if (typeof value === "string" && value.includes("::")) addParty(parties, value, label, event.template);
    }
  }
  return [...parties.entries()].map(([party, meta]) => ({ party, roles: [...meta.roles], templates: [...meta.templates] }));
}

function addParty(parties, party, role, template) {
  if (!party) return;
  if (!parties.has(party)) parties.set(party, { roles: new Set(), templates: new Set() });
  parties.get(party).roles.add(role);
  if (template) parties.get(party).templates.add(template);
}

function recordFieldsToObject(fields) {
  const object = {};
  for (const field of fields) object[field.label] = unwrapValue(field.value);
  return object;
}

function objectToRecordFields(object) {
  return Object.entries(object || {}).map(([label, primitive]) => ({ label, value: wrapPrimitive(primitive) }));
}

function unwrapValue(value = {}) {
  if ("party" in value) return value.party;
  if ("text" in value) return value.text;
  if ("numeric" in value) return value.numeric;
  if ("date" in value) return value.date;
  if ("bool" in value) return value.bool;
  if ("int64" in value) return value.int64;
  if ("contractId" in value) return value.contractId;
  if ("contract_id" in value) return value.contract_id;
  if ("record" in value) return recordFieldsToObject(value.record.fields || []);
  return value;
}

function wrapPrimitive(primitive) {
  if (typeof primitive === "boolean") return { bool: primitive };
  if (typeof primitive === "number") return Number.isInteger(primitive) ? { int64: String(primitive) } : { numeric: String(primitive) };
  if (typeof primitive === "string" && primitive.includes("::")) return { party: primitive };
  return { text: String(primitive) };
}

function normalizeActiveContracts(response) {
  const array = Array.isArray(response) ? response : response?.activeContracts || response?.contractEntry || response?.results || [];
  return array.map((entry) => {
    const created = entry.createdEvent || entry.created || entry;
    return {
      offset: created.offset,
      contractId: created.contract_id || created.contractId,
      template: created.template_id?.entity_name || created.templateId?.entityName,
      templateId: created.template_id || created.templateId,
      fields: recordFieldsToObject(created.create_arguments?.fields || created.createArguments?.fields || []),
      witnessParties: created.witness_parties || created.witnessParties || [],
      signatories: created.signatories || [],
      createdAt: created.created_at || created.createdAt
    };
  });
}
