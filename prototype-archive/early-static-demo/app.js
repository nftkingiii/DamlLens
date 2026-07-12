const workflow = {
  id: "INV-2048",
  title: "Tokenized invoice financing",
  parties: [
    { name: "Atlas Supplier", role: "Supplier / signatory", permissions: ["Creates invoice", "Requests financing", "Observes buyer payment"], canAct: false },
    { name: "Northstar Buyer", role: "Buyer / next actor", permissions: ["Accepted invoice", "Observed funding", "Must mark payment"], canAct: true },
    { name: "Canton Capital", role: "Financier / signatory", permissions: ["Funds invoice", "Flags overdue", "Observes settlement"], canAct: false }
  ],
  events: [
    { id: "evt-1", step: 1, type: "Contract created", choice: "Create Invoice", template: "Invoice", controller: "Atlas Supplier", visibility: "Supplier, Buyer", result: "Invoice active", state: "Created", summary: "Supplier created invoice INV-2048 for a shipment due on 2026-07-15.", stopped: false },
    { id: "evt-2", step: 2, type: "Choice exercised", choice: "AcceptInvoice", template: "Invoice -> AcceptedInvoice", controller: "Northstar Buyer", visibility: "Supplier, Buyer", result: "Invoice archived; AcceptedInvoice active", state: "Accepted", summary: "Buyer accepted the invoice, making both supplier and buyer signatories on the accepted workflow state.", stopped: false },
    { id: "evt-3", step: 3, type: "Choice exercised", choice: "RequestFinancing", template: "AcceptedInvoice -> FinancingRequest", controller: "Atlas Supplier", visibility: "Supplier, Buyer, Financier", result: "AcceptedInvoice archived; FinancingRequest active", state: "Financing requested", summary: "Supplier requested financing from Canton Capital. The financier becomes an observer until it decides whether to fund.", stopped: false },
    { id: "evt-4", step: 4, type: "Choice exercised", choice: "FundInvoice", template: "FinancingRequest -> FundedInvoice", controller: "Canton Capital", visibility: "Supplier, Buyer, Financier", result: "FinancingRequest archived; FundedInvoice active", state: "Funded", summary: "Financier funded the invoice. The workflow now waits for the buyer to mark payment before final settlement.", stopped: false },
    { id: "evt-5", step: 5, type: "Choice exercised", choice: "FlagOverdue", template: "FundedInvoice -> OverdueInvoice", controller: "Canton Capital", visibility: "Supplier, Buyer, Financier", result: "OverdueInvoice active", state: "Stopped", summary: "Financier flagged the funded invoice because buyer payment has not been received. The next meaningful action belongs to the buyer.", stopped: true }
  ],
  contracts: [
    { template: "Invoice", id: "#0:0", status: "archived", party: "Atlas Supplier", note: "Archived by AcceptInvoice" },
    { template: "AcceptedInvoice", id: "#1:0", status: "archived", party: "Atlas + Northstar", note: "Archived by RequestFinancing" },
    { template: "FinancingRequest", id: "#2:0", status: "archived", party: "Atlas Supplier", note: "Archived by FundInvoice" },
    { template: "FundedInvoice", id: "#3:0", status: "archived", party: "Atlas + Canton Capital", note: "Archived by FlagOverdue" },
    { template: "OverdueInvoice", id: "#4:0", status: "active", party: "Canton Capital", note: "Buyer payment missing" }
  ]
};

const $ = (selector) => document.querySelector(selector);

if ($("#timeline")) {
  const state = { selectedEventId: "evt-5", filter: "all" };
  const timelineEl = $("#timeline");
  const partyMapEl = $("#partyMap");
  const contractListEl = $("#contractList");
  const toastEl = $("#toast");

  function selectedEvent() {
    return workflow.events.find((event) => event.id === state.selectedEventId) || workflow.events[0];
  }

  function renderTimeline() {
    timelineEl.innerHTML = workflow.events.map((event) => {
      const isActive = event.id === state.selectedEventId;
      const classes = ["timeline-event"];
      if (isActive) classes.push("active");
      if (event.stopped) classes.push("stopped");
      return `
        <li>
          <button class="${classes.join(" ")}" type="button" data-event-id="${event.id}" aria-pressed="${isActive}">
            <span class="event-index">${event.step}</span>
            <span class="event-body"><strong>${event.choice}</strong><span>${event.summary}</span></span>
            <span class="event-state">${event.state}</span>
          </button>
        </li>`;
    }).join("");

    timelineEl.querySelectorAll("[data-event-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedEventId = button.dataset.eventId;
        renderAll();
        showToast("Event selected");
      });
    });
  }

  function renderDetail() {
    const event = selectedEvent();
    $("#detailType").textContent = event.type;
    $("#detailChoice").textContent = event.choice;
    $("#detailSummary").textContent = event.summary;
    $("#detailTemplate").textContent = event.template;
    $("#detailController").textContent = event.controller;
    $("#detailResult").textContent = event.result;
    $("#detailVisibility").textContent = event.visibility;
    $("#currentState").textContent = event.stopped ? "Stopped" : event.state;
  }

  function renderParties() {
    partyMapEl.innerHTML = workflow.parties.map((party) => {
      const permissionTags = party.permissions.map((permission) => `<span>${permission}</span>`).join("");
      const canActTag = party.canAct ? `<span class="can-act">Can act next</span>` : "";
      return `<section class="party-card ${party.canAct ? "next" : ""}"><header><strong>${party.name}</strong><span class="party-role">${party.role}</span></header><div class="permission-tags">${canActTag}${permissionTags}</div></section>`;
    }).join("");
  }

  function renderContracts() {
    const contracts = workflow.contracts.filter((contract) => state.filter === "all" || contract.status === state.filter);
    contractListEl.innerHTML = contracts.map((contract) => `<article class="contract-row"><div><strong>${contract.template}</strong><span>${contract.id} - ${contract.note}</span></div><span class="contract-party">${contract.party}</span><span class="contract-status ${contract.status}">${contract.status}</span></article>`).join("");
  }

  function runDiagnosis() {
    state.selectedEventId = "evt-5";
    renderAll();
    $("#diagnosis").innerHTML = `<span class="diagnosis-dot"></span><p><strong>Diagnosis:</strong> the workflow stopped after <strong>FlagOverdue</strong>. The funded invoice was archived into <strong>OverdueInvoice</strong>. Buyer payment is missing, so <strong>Northstar Buyer</strong> is the next party expected to act by marking payment.</p>`;
    showToast("Diagnosis completed: stopped state and next actor found");
  }

  function resetDemo() {
    state.selectedEventId = "evt-1";
    state.filter = "all";
    document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === "all"));
    $("#diagnosis").innerHTML = `<span class="diagnosis-dot"></span><p>Select events to inspect state, authority, and visibility.</p>`;
    renderAll();
    showToast("Demo reset to workflow start");
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toastEl.classList.remove("visible"), 2300);
  }

  function bindFilters() {
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
        renderContracts();
        showToast(`Showing ${state.filter} contracts`);
      });
    });
  }

  function renderAll() {
    renderTimeline();
    renderDetail();
    renderParties();
    renderContracts();
  }

  $("#runDiagnosis")?.addEventListener("click", runDiagnosis);
  $("#resetDemo")?.addEventListener("click", resetDemo);
  bindFilters();
  renderAll();
}
