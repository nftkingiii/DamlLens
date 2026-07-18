export const WORKFLOW_MODEL = {
  packageName: "damllens-workflows",
  moduleName: "DamlLens.InvoiceFinance",
  description: "A multi-party invoice financing workflow for suppliers, buyers, and financiers.",
  templates: [
    template("Invoice", "Invoice proposed", ["supplier"], ["buyer"], [
      choice("AcceptInvoice", ["buyer"], "AcceptedInvoice"),
      choice("DisputeInvoice", ["buyer"], "DisputedInvoice", [argument("reason", "text", true)]),
    ]),
    template("AcceptedInvoice", "Invoice accepted", ["supplier", "buyer"], [], [
      choice("RequestFinancing", ["supplier"], "FinancingRequest", [
        argument("financier", "party", true),
      ]),
    ]),
    template("FinancingRequest", "Awaiting financier approval", ["supplier"], ["buyer", "financier"], [
      choice("FundInvoice", ["financier"], "FundedInvoice"),
      choice("RejectFinancing", ["financier"], "RejectedFinancing", [
        argument("reason", "text", true),
      ]),
    ]),
    template("FundedInvoice", "Awaiting buyer payment", ["supplier", "financier"], ["buyer"], [
      choice("MarkBuyerPaid", ["buyer"], "PaymentReceived"),
      choice("FlagOverdue", ["financier"], "OverdueInvoice"),
    ]),
    template("PaymentReceived", "Buyer payment received", ["buyer"], ["supplier", "financier"], [
      choice("SettleFinancing", ["supplier", "financier"], "SettledInvoice", [], true),
    ]),
    template("SettledInvoice", "Financing settled", ["supplier", "financier"], ["buyer"]),
    template("DisputedInvoice", "Invoice disputed", ["buyer"], ["supplier"]),
    template("RejectedFinancing", "Financing rejected", ["financier"], ["supplier", "buyer"]),
    template("OverdueInvoice", "Buyer payment missing", ["financier"], ["supplier", "buyer"]),
  ],
};

export function findTemplate(name) {
  return WORKFLOW_MODEL.templates.find((item) => item.name === name);
}

export function findChoice(templateName, choiceName) {
  return findTemplate(templateName)?.choices.find((item) => item.name === choiceName);
}

export function availableActions(contracts, partyId) {
  if (!partyId) return [];
  return contracts.flatMap((contract) => {
    if (contract.status !== "active") return [];
    const model = findTemplate(contract.template);
    if (!model) return [];
    return model.choices
      .filter((item) => !item.requiresMultipleParties)
      .filter((item) => item.controllers.every((role) => contract.fields?.[role] === partyId))
      .map((item) => ({
        id: `${contract.contractId}:${item.name}`,
        contractId: contract.contractId,
        template: contract.template,
        choice: item.name,
        controllers: item.controllers,
        arguments: item.arguments,
        creates: item.creates,
        explanation: `${item.controllers.join(" and ")} can exercise ${item.name}, moving the workflow to ${item.creates}.`,
      }));
  });
}

function template(name, businessState, signatories, observers, choices = []) {
  return { name, businessState, signatories, observers, choices };
}

function choice(name, controllers, creates, args = [], requiresMultipleParties = false) {
  return { name, controllers, creates, arguments: args, requiresMultipleParties };
}

function argument(name, type, required) {
  return { name, type, required };
}
