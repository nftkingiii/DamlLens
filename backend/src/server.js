import http from "node:http";
import { config, resolveRuntimeConfig } from "./config.js";
import { CantonClient, field, value } from "./canton/client.js";
import { analyzeActiveContracts, analyzeUpdates } from "./analysis/workflowAnalyzer.js";
import { HttpError, getBearerToken, readJson, requireFields, sendJson } from "./http.js";

const routes = new Map();

route("GET", "/health", async () => ({
  ok: true,
  service: "damllens-backend",
  time: new Date().toISOString()
}));

route("GET", "/api/config", async () => ({
  grpcApi: config.grpcApi,
  jsonApi: config.jsonApi,
  partyId: config.partyId,
  packageId: config.packageId,
  workflowId: config.workflowId,
  liveDemoUpdateIds: config.liveInvoiceUpdateIds
}));

route("POST", "/api/connect/validate", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const user = await client.getUser();
  return {
    ok: true,
    user: user.user,
    resolvedPartyId: user.user?.primary_party || runtime.partyId,
    grpcApi: runtime.grpcApi,
    jsonApi: runtime.jsonApi
  };
});

route("POST", "/api/contracts/active", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const templateId = body.template
    ? {
        packageId: body.template.packageId || runtime.packageId,
        moduleName: body.template.moduleName,
        entityName: body.template.entityName
      }
    : undefined;
  const contracts = await client.getActiveContracts({ partyId: runtime.partyId, templateId });
  return {
    raw: contracts,
    analysis: analyzeActiveContracts(contracts)
  };
});

route("POST", "/api/updates/get", async ({ req, body }) => {
  requireFields(body, ["updateId"]);
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const update = await client.getUpdateById(body.updateId, runtime.partyId);
  return {
    raw: update,
    analysis: analyzeUpdates(update)
  };
});

route("POST", "/api/analyze/updates", async ({ req, body }) => {
  requireFields(body, ["updateIds"]);
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const updates = [];
  for (const updateId of body.updateIds) updates.push(await client.getUpdateById(updateId, runtime.partyId));
  return {
    updates: updates.map((update) => update.transaction?.update_id).filter(Boolean),
    analysis: analyzeUpdates(updates)
  };
});

route("POST", "/api/demo/live-invoice", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const updateIds = body.updateIds || Object.values(config.liveInvoiceUpdateIds);
  const updates = [];
  for (const updateId of updateIds) updates.push(await client.getUpdateById(updateId, runtime.partyId));
  return {
    demo: "invoice-financing-devnet",
    updateIds,
    analysis: analyzeUpdates(updates)
  };
});

route("POST", "/api/workflows/invoice/start", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const sessionClient = new CantonClient(runtime);
  const user = await sessionClient.getUser();
  const party = user.user?.primary_party;
  if (!party) throw new HttpError(403, "The connected ledger user does not have a primary party");

  const client = new CantonClient({ ...runtime, partyId: party });
  const mode = body.mode === "shared" ? "shared" : "personal";
  const buyer = mode === "shared" ? body.buyerPartyId : party;
  if (mode === "shared" && !buyer) {
    throw new HttpError(400, "buyerPartyId is required for a shared workflow");
  }
  if (mode === "shared" && !buyer.includes("::")) {
    throw new HttpError(400, "buyerPartyId must be a complete Canton party id");
  }

  const commonFields = [
    field("supplier", value("party", party)),
    field("buyer", value("party", buyer)),
    field("amount", value("numeric", body.amount || "125000.00")),
    field("currency", value("text", body.currency || "USD")),
    field("dueDate", value("date", body.dueDate || daysFromUnixEpoch(30))),
    field("description", value("text", body.description || "DamlLens DevNet sample invoice"))
  ];

  const createResult = await client.submitCreate({
    moduleName: "DamlLens.InvoiceFinance",
    entityName: "Invoice",
    commandIdPrefix: mode === "shared" ? "create-shared-invoice" : "create-personal-invoice",
    fields: commonFields
  });
  const updateIds = [requireUpdateId(createResult)];

  if (mode === "personal") {
    let contract = await createdContractForUpdate(client, updateIds.at(-1), party);
    const transitions = [
      { template: "Invoice", choice: "AcceptInvoice", fields: [] },
      {
        template: "AcceptedInvoice",
        choice: "RequestFinancing",
        fields: [field("financier", value("party", party))]
      },
      { template: "FinancingRequest", choice: "FundInvoice", fields: [] },
      { template: "FundedInvoice", choice: "FlagOverdue", fields: [] }
    ];

    for (const transition of transitions) {
      const result = await client.submitExercise({
        moduleName: "DamlLens.InvoiceFinance",
        entityName: transition.template,
        contractId: contract.contractId,
        choice: transition.choice,
        fields: transition.fields,
        commandIdPrefix: transition.choice.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      });
      const updateId = requireUpdateId(result);
      updateIds.push(updateId);
      contract = await createdContractForUpdate(client, updateId, party);
    }
  }

  const updates = [];
  for (const updateId of updateIds) updates.push(await client.getUpdateById(updateId, party));
  return {
    mode,
    partyId: party,
    buyerPartyId: buyer,
    updateIds,
    nextAction:
      mode === "shared"
        ? "The buyer must connect with their own Canton party and exercise AcceptInvoice."
        : "The personal sample reached OverdueInvoice and is ready to inspect.",
    analysis: analyzeUpdates(updates)
  };
});

route("POST", "/api/workflows/invoice/create", async ({ req, body }) => {
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const party = runtime.partyId;
  const result = await client.submitCreate({
    moduleName: "DamlLens.InvoiceFinance",
    entityName: "Invoice",
    commandIdPrefix: "create-invoice",
    fields: [
      field("supplier", value("party", body.supplier || party)),
      field("buyer", value("party", body.buyer || party)),
      field("amount", value("numeric", body.amount || "125000.00")),
      field("currency", value("text", body.currency || "USD")),
      field("dueDate", value("date", body.dueDate || 20649)),
      field("description", value("text", body.description || "Tokenized invoice for shipment INV-2048"))
    ]
  });
  return result;
});

route("POST", "/api/workflows/invoice/exercise", async ({ req, body }) => {
  requireFields(body, ["template", "contractId", "choice"]);
  const runtime = runtimeFromRequest(req, body);
  const client = new CantonClient(runtime);
  const fields = Object.entries(body.choiceFields || {}).map(([label, raw]) => {
    if (typeof raw === "object" && raw?.type) return field(label, value(raw.type, raw.value));
    return field(label, value(typeof raw === "number" ? "numeric" : "text", raw));
  });
  return client.submitExercise({
    moduleName: "DamlLens.InvoiceFinance",
    entityName: body.template,
    contractId: body.contractId,
    choice: body.choice,
    fields,
    commandIdPrefix: body.choice.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
  });
});

function route(method, path, handler) {
  routes.set(`${method} ${path}`, handler);
}

function runtimeFromRequest(req, body) {
  return resolveRuntimeConfig({
    grpcApi: body.grpcApi,
    jsonApi: body.jsonApi,
    partyId: body.partyId,
    packageId: body.packageId,
    workflowId: body.workflowId,
    bearerToken: getBearerToken(req, body)
  });
}

function requireUpdateId(result) {
  const updateId = result?.update_id || result?.updateId;
  if (!updateId) throw new HttpError(502, "Canton accepted the command but returned no update id", result);
  return updateId;
}

async function createdContractForUpdate(client, updateId, partyId) {
  const update = await client.getUpdateById(updateId, partyId);
  const created = update?.transaction?.events?.find((event) => event.created)?.created;
  const contractId = created?.contract_id || created?.contractId;
  if (!contractId) throw new HttpError(502, "No created contract was found in the submitted update", { updateId });
  return { contractId, update };
}

function daysFromUnixEpoch(daysAhead = 0) {
  return Math.floor(Date.now() / 86_400_000) + daysAhead;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const handler = routes.get(`${req.method} ${url.pathname}`);
    if (!handler) throw new HttpError(404, "Route not found", { method: req.method, path: url.pathname });

    const body = req.method === "GET" ? {} : await readJson(req);
    const result = await handler({ req, res, body, url });
    sendJson(res, 200, result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    console.error("Request failed", {
      method: req.method,
      path: req.url,
      status,
      message: error.message,
      details: error.details
    });
    sendJson(res, status, {
      error: error.message || "Internal server error",
      details: error.details,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`DamlLens backend listening on http://${config.host}:${config.port}`);
});
