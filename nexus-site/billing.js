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

function buildProtocolLoopSection() {
  const section = createEl("section", "section");
  section.append(
    createSectionHeading(
      "Commitment Loop",
      "This is where intent, execution, settlement, and verification connect."
    )
  );

  const card = createEl("article", "surface-card surface-card--intent");
  card.append(createEl("p", "snapshot-card__label", "Loop"));
  card.append(
    createEl(
      "h3",
      "surface-card__title",
      "Capital becomes protocol state only when every step is legible."
    )
  );
  card.append(
    createEl(
      "p",
      "page-hero__body",
      "synTAOsis should not represent commitment as a casual button click. The protocol loop starts with a principal decision, moves through bounded execution, and only becomes a truthful public accounting surface once review and settlement are anchored back to chain."
    )
  );

  const list = createEl("ul", "clean-list");
  [
    "Core defines the active intent and the condition under which execution is allowed.",
    "Execution is matched through escrow or bounded treasury release rather than arbitrary wallet transfer.",
    "Outputs return with verification metadata, operator review, or automated validation.",
    "Settlement is written back to TAO EVM on a schedule or as an aggregate event.",
    "The next allocation only becomes valid after the verified outcome updates the system state.",
  ].forEach((item) => list.append(createEl("li", "", item)));
  card.append(list);

  section.append(card);
  return section;
}

function buildCapitalContractsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Capital Contracts",
      "The commitment surface is a contract map, not a mock dashboard."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Contract", "What It Governs", "Visibility", "Address"],
      template: "1fr 1.95fr 0.85fr 0.7fr",
      rows: [
        [
          "TaskBoard.sol",
          "Intent escrow, claiming, result submission, approval, reclaim, and payout release.",
          "Public once deployed",
          "TBA",
        ],
        [
          "AgentTreasury.sol",
          "Treasury outflows, recipient whitelist, spend caps, and protocol-level financial guardrails.",
          "Public once deployed",
          "TBA",
        ],
        [
          "CreatorVesting.sol",
          "Creator unlocks and performance-gated release for future tokenized surfaces.",
          "Public once deployed",
          "TBA",
        ],
        [
          "AgentLifecycle.sol",
          "Hibernation, shutdown, revival, and graceful unwind when activity disappears.",
          "Public once deployed",
          "TBA",
        ],
        [
          "BondingCurve.sol",
          "Future token launch path, intentionally not default at public launch.",
          "Future / optional",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildTruthModelSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Source Of Truth",
      "The protocol separates fast metering from onchain settlement without pretending both are the same thing."
    )
  );

  const grid = createEl("div", "card-grid card-grid--two");

  const metrics = createEl("article", "surface-card surface-card--operational");
  metrics.append(createEl("p", "snapshot-card__label", "Trust Layers"));
  metrics.append(
    renderMetricGrid([
      ["Metering", "Off-chain signed logs"],
      ["Settlement", "TAO EVM events"],
      ["Verification", "Operator + validator review"],
      ["Explorer Addresses", "TBA"],
    ])
  );

  const notes = createEl("article", "surface-card surface-card--operational");
  notes.append(createEl("p", "snapshot-card__label", "Why This Split Exists"));
  const list = createEl("ul", "clean-list");
  [
    "Per-request settlement is too expensive and too slow to be the only truth source.",
    "Off-chain metering creates usable product latency, but only if logs are signed and reviewable.",
    "Onchain settlement remains the economic anchor for final visibility and auditing.",
    "The public site should describe that split clearly instead of simulating a fake ledger.",
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
      "Address Plan",
      "Addresses are intentionally marked TBA until the contracts are deployed."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Surface", "Planned Address", "Explorer", "Notes"],
      template: "1fr 0.85fr 0.8fr 1.6fr",
      rows: [
        ["TaskBoard.sol", "TBA", "TBA", "Intent escrow and release."],
        ["AgentTreasury.sol", "TBA", "TBA", "Guarded treasury controller."],
        ["CreatorVesting.sol", "TBA", "TBA", "Creator unlocks."],
        ["AgentLifecycle.sol", "TBA", "TBA", "Lifecycle state machine."],
        ["BondingCurve.sol", "TBA", "TBA", "Future token path only."],
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
    activeHref: "/billing.html",
    currentView: "capital",
    currentLabel: "Capital",
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
      eyebrow: "Capital Surface",
      title: "How commitment, settlement, and verification actually connect.",
      body: "This page describes the real capital loop instead of showing fake dispatches or made-up balances. The protocol should only expose public accounting once the commitment flow is backed by deployed contracts and explorer-visible addresses.",
      stats: [
        { label: "Metering Layer", value: "Off-chain signed logs" },
        { label: "Settlement Layer", value: "TAO EVM" },
        { label: "Contract Addresses", value: "TBA" },
      ],
      mode: "operational",
    }),
    buildProtocolLoopSection(),
    buildCapitalContractsSection(),
    buildTruthModelSection(),
    buildAddressSection()
  );
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;">Capital page failed to load: ${
    error instanceof Error ? error.message : String(error)
  }</pre>`;
});
