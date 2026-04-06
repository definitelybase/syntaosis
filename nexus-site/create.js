import {
  createEl,
  createSectionHeading,
  findAgent,
  getAgentIdFromLocation,
  loadConfig,
  loadState,
  renderDataTable,
  renderHeroBlock,
  renderMetricGrid,
  renderSystemLayout,
  setAgentInLocation,
} from "./shared.js";

function buildSchemaSection(agent) {
  const section = createEl("section", "section");
  section.append(
    createSectionHeading(
      "Registry Schema",
      "Registry is where execution metadata becomes legible before any surface receives protocol value."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Field", "Meaning", "Current Value", "Address"],
      template: "0.95fr 1.8fr 1.05fr 0.7fr",
      rows: [
        [
          "Surface Name",
          "Human-readable execution identity used by the principal and operators.",
          agent.name,
          "TBA",
        ],
        [
          "Execution Role",
          "The narrow problem this surface is allowed to solve for the principal loop.",
          agent.tagline,
          "TBA",
        ],
        [
          "Output Format",
          "What kind of structured payload or artifact the principal should expect back.",
          agent.sampleOutput.format,
          "TBA",
        ],
        [
          "Permission Scope",
          "Tool and recipient constraints that keep execution bounded and replaceable.",
          "Registry-controlled",
          "TBA",
        ],
        [
          "Verification Mode",
          "How the system decides whether this surface produced a usable verified outcome.",
          agent.dashboard?.verification ?? "Review-defined",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildRegistryContractsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Registry Contracts",
      "The registry is connected to lifecycle, reputation, and future surface deployment."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Contract", "Registry Function", "Planned Status", "Address"],
      template: "1fr 1.85fr 0.9fr 0.7fr",
      rows: [
        [
          "ReputationRegistry.sol",
          "Stores quality signals, flags, and trust state used to decide whether a surface stays eligible.",
          "Planned shared contract",
          "TBA",
        ],
        [
          "AgentLifecycle.sol",
          "Tracks whether a surface is active, paused, hibernated, or sunset.",
          "Planned shared contract",
          "TBA",
        ],
        [
          "AgentTokenFactory.sol",
          "Future deploy path for tokenized surfaces when launch conditions are met.",
          "Future / optional",
          "TBA",
        ],
        [
          "CreatorVesting.sol",
          "Links registry identity to creator unlock logic where tokenized surfaces are enabled.",
          "Future / optional",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildAdmissionSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Admission Rules",
      "Registry breadth matters less than clarity of role and verification."
    )
  );

  const grid = createEl("div", "card-grid card-grid--two");

  const metrics = createEl("article", "surface-card surface-card--operational");
  metrics.append(createEl("p", "snapshot-card__label", "Registry Priorities"));
  metrics.append(
    renderMetricGrid([
      ["Primary Goal", "Legibility before scale" ],
      ["Runtime Identity", "Executor stays secondary" ],
      ["Explorer Addresses", "TBA" ],
      ["Token Surface", "Optional later" ],
    ])
  );

  const notes = createEl("article", "surface-card surface-card--operational");
  notes.append(createEl("p", "snapshot-card__label", "What Must Be Explicit"));
  const list = createEl("ul", "clean-list");
  [
    "What the surface actually does for the principal loop.",
    "What output shape it returns and how that output gets reviewed.",
    "What tools and financial actions it is permitted to use.",
    "What lifecycle state the protocol will assign if quality drops.",
  ].forEach((item) => list.append(createEl("li", "", item)));
  notes.append(list);

  grid.append(metrics, notes);
  section.append(grid);
  return section;
}

function buildAddressSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Registry Address Map",
      "Registry-linked contracts keep `TBA` until deployment, but the architecture should already be explicit."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Contract", "Planned Address", "Explorer", "Notes"],
      template: "1fr 0.85fr 0.8fr 1.6fr",
      rows: [
        ["ReputationRegistry.sol", "TBA", "TBA", "Quality and flag registry."],
        ["AgentLifecycle.sol", "TBA", "TBA", "State and lifecycle transitions."],
        ["AgentTokenFactory.sol", "TBA", "TBA", "Future surface deployment factory."],
        ["CreatorVesting.sol", "TBA", "TBA", "Optional creator unlock logic."],
      ],
    })
  );
  section.append(card);
  return section;
}

async function init() {
  const [config, state] = await Promise.all([loadConfig(), loadState()]);
  const agentId = getAgentIdFromLocation(config, config.agents?.[0]?.id);
  const agent = findAgent(config, agentId);
  setAgentInLocation(agent.id);

  const app = document.querySelector("#app");
  app.innerHTML = "";

  const frame = renderSystemLayout({
    activeHref: "/create.html",
    currentView: "registry",
    currentLabel: "Registry",
    config,
    state,
    agent,
    agentId: agent.id,
    showContextRail: false,
    showTreasuryBlock: true,
    showSystemState: false,
  });
  app.append(frame.shell);

  frame.main.append(
    renderHeroBlock({
      eyebrow: "Registry Surface",
      title: "What enters the registry before any execution surface receives protocol value.",
      body: "This page explains the registry model instead of hiding behind a placeholder. Registry should define what a surface does, what tools it can use, how it is verified, and what contracts will eventually anchor that identity onchain.",
      stats: [
        { label: "Registry Scope", value: "Metadata + permissions" },
        { label: "Lifecycle Contract", value: "AgentLifecycle.sol" },
        { label: "Contract Addresses", value: "TBA" },
      ],
      mode: "operational",
    }),
    buildSchemaSection(agent),
    buildRegistryContractsSection(),
    buildAdmissionSection(),
    buildAddressSection()
  );
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;">Registry page failed to load: ${
    error instanceof Error ? error.message : String(error)
  }</pre>`;
});
