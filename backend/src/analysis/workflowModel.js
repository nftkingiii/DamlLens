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

const SUPPORTED_ACTION_TYPES = new Set(["party", "text", "numeric", "date", "bool", "int64"]);

export function findTemplate(name, model = WORKFLOW_MODEL, moduleName = undefined) {
  return model?.templates?.find(
    (item) => item.name === name && (!moduleName || !item.moduleName || item.moduleName === moduleName),
  );
}

export function findChoice(templateName, choiceName, model = WORKFLOW_MODEL, moduleName = undefined) {
  return findTemplate(templateName, model, moduleName)?.choices.find((item) => item.name === choiceName);
}

export function availableActions(contracts, partyId, modelResolver = () => WORKFLOW_MODEL) {
  if (!partyId) return [];
  return contracts.flatMap((contract) => {
    if (contract.status !== "active") return [];
    const packageId = contract.templateId?.package_id || contract.templateId?.packageId;
    const moduleName = contract.templateId?.module_name || contract.templateId?.moduleName;
    const workflowModel = modelResolver(packageId) || WORKFLOW_MODEL;
    const templateModel = findTemplate(contract.template, workflowModel, moduleName);
    if (!templateModel) return [];
    return templateModel.choices
      .filter((item) => !item.requiresMultipleParties)
      .filter((item) => !item.controllerConfidence || item.controllerConfidence === "static")
      .filter((item) => item.arguments.every((argument) => SUPPORTED_ACTION_TYPES.has(argument.type)))
      .filter((item) => item.controllers.every((role) => contract.fields?.[role] === partyId))
      .map((item) => ({
        id: `${contract.contractId}:${item.name}`,
        contractId: contract.contractId,
        template: contract.template,
        choice: item.name,
        packageId,
        moduleName: templateModel.moduleName || workflowModel.moduleName,
        controllers: item.controllers,
        arguments: item.arguments,
        creates: item.creates,
        explanation: `${item.controllers.join(" and ")} can exercise ${item.name}${item.creates ? `, moving the workflow to ${item.creates}` : ""}.`,
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
