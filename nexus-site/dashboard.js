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

function buildCapitalFlowSection() {
  const section = createEl("section", "section");
  section.append(
    createSectionHeading(
      "Capital Lifecycle",
      "How value moves through the protocol without pretending balances are already live."
    )
  );

  const card = createEl("article", "surface-card surface-card--capital");
  card.append(createEl("p", "snapshot-card__label", "Operating Model"));
  card.append(
    createEl(
      "h3",
      "surface-card__title",
      "TAO EVM is the settlement layer. Metering, runtime execution, and review stay off-chain until settlement."
    )
  );
  card.append(
    createEl(
      "p",
      "page-hero__body",
      "The public site should describe the actual capital model instead of inventing balances. synTAOsis treats TAO EVM as the economic and coordination layer, while runtime execution and verification remain off-chain until the protocol can publish truthful state."
    )
  );

  const list = createEl("ul", "clean-list");
  [
    "Capital enters through a TAO EVM-controlled balance or deposit contract.",
    "synTAOsis Core defines intent, budget ceiling, and verification target before any execution is funded.",
    "Execution requests route through escrow or bounded treasury logic rather than arbitrary wallet transfers.",
    "Usage, review, and verification can be metered off-chain with signed logs before settlement.",
    "Settlement and lifecycle events are anchored back to TAO EVM once the protocol is ready to publish them honestly.",
  ].forEach((item) => list.append(createEl("li", "", item)));
  card.append(list);

  section.append(card);
  return section;
}

function buildContractsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Capital Contracts",
      "The core financial surface is small: treasury control, escrow, lifecycle, and future tokenization."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Contract", "Role", "Deployment Status", "Address"],
      template: "1fr 1.95fr 0.9fr 0.7fr",
      rows: [
        [
          "AgentTreasury.sol",
          "Enforces recipient whitelists, spend caps, and bounded value movement for execution-related calls.",
          "Planned core contract",
          "TBA",
        ],
        [
          "TaskBoard.sol",
          "Holds escrow for intent execution and releases funds only after a verified outcome or explicit approval.",
          "Planned core contract",
          "TBA",
        ],
        [
          "CreatorVesting.sol",
          "Handles creator unlocks and performance-gated vesting for future launch surfaces.",
          "Planned per-surface contract",
          "TBA",
        ],
        [
          "AgentLifecycle.sol",
          "Controls hibernation, revival, and graceful shutdown when a surface stops generating trustworthy activity.",
          "Planned shared contract",
          "TBA",
        ],
        [
          "BondingCurve.sol",
          "Future tokenization logic for controlled surface launches, not a default public primitive.",
          "Future / optional",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildGuardrailsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Guardrails",
      "Capital control matters more than surface hype."
    )
  );

  const grid = createEl("div", "card-grid card-grid--two");

  const metrics = createEl("article", "surface-card surface-card--operational");
  metrics.append(createEl("p", "snapshot-card__label", "Hard Controls"));
  metrics.append(
    renderMetricGrid([
      ["Per-Tick Spend Cap", "5% max (planned)" ],
      ["Daily Spend Cap", "20% max (planned)" ],
      ["Allowed Recipients", "Escrow, fee collector, vesting, approved routes" ],
      ["Emergency Freeze", "Multisig / operator controlled" ],
    ])
  );

  const notes = createEl("article", "surface-card surface-card--operational");
  notes.append(createEl("p", "snapshot-card__label", "Why This Matters"));
  const list = createEl("ul", "clean-list");
  [
    "The protocol should block arbitrary transfers rather than trust executor prompts.",
    "Large treasury movement should be explainable through intent, escrow, and review.",
    "Lifecycle rules should define what happens when a surface stops performing.",
    "Public capital screens should go live only when explorer-verifiable addresses exist.",
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
      "Address Map",
      "Addresses stay as TBA until deployment, but the contract map should already be explicit."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Surface", "Planned Address", "Explorer", "Notes"],
      template: "1fr 0.85fr 0.8fr 1.6fr",
      rows: [
        ["AgentTreasury.sol", "TBA", "TBA", "Primary capital control contract."],
        ["TaskBoard.sol", "TBA", "TBA", "Intent escrow and payout release."],
        ["CreatorVesting.sol", "TBA", "TBA", "Creator unlocks and gates."],
        ["AgentLifecycle.sol", "TBA", "TBA", "Pause / revive / sunset logic."],
        ["BondingCurve.sol", "TBA", "TBA", "Future tokenized launch path only."],
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
    activeHref: "/dashboard.html",
    currentView: "treasury",
    currentLabel: "Treasury",
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
      eyebrow: "Capital Model",
      title: "How capital enters the protocol and becomes controlled execution.",
      body: "This page explains the capital architecture instead of showing fake balances. TAO EVM is the settlement layer, the principal defines intent first, and treasury movement is supposed to remain bounded by explicit contracts and verification rules.",
      stats: [
        { label: "Settlement Layer", value: "TAO EVM" },
        { label: "Primary Contract", value: "AgentTreasury.sol" },
        { label: "Contract Addresses", value: "TBA" },
      ],
      mode: "operational",
    }),
    buildCapitalFlowSection(),
    buildContractsSection(),
    buildGuardrailsSection(),
    buildAddressSection()
  );
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;">Capital model page failed to load: ${
    error instanceof Error ? error.message : String(error)
  }</pre>`;
});
