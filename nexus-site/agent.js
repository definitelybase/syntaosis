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

function buildRuntimeSection(agent) {
  const section = createEl("section", "section");
  section.append(
    createSectionHeading(
      "Executor Runtime",
      "Execution stays off-chain, but it is still bounded by protocol rules."
    )
  );

  const grid = createEl("div", "card-grid card-grid--two");

  const runtime = createEl("article", "surface-card surface-card--operational");
  runtime.append(createEl("p", "snapshot-card__label", "Runtime Model"));
  runtime.append(
    createEl("h3", "surface-card__title", `${agent.name} runs as a constrained service, not a sovereign product.`)
  );
  runtime.append(
    createEl(
      "p",
      "page-hero__body",
      "The executor model is intentionally narrow. synTAOsis keeps the principal layer in control while each execution surface runs inside an isolated environment with explicit tool permissions and network limits."
    )
  );
  const runtimeList = createEl("ul", "clean-list");
  [
    "Each executor runs in an isolated container with its own prompt, tool set, and memory.",
    "Network access is limited to Nexus API routes, whitelisted external APIs, and TAO EVM RPC.",
    "Execution outputs are routed back to the principal layer instead of becoming public authority by themselves.",
    "Financial actions are constrained by treasury guardrails rather than free wallet access.",
  ].forEach((item) => runtimeList.append(createEl("li", "", item)));
  runtime.append(runtimeList);

  const permissions = createEl("article", "surface-card surface-card--operational");
  permissions.append(createEl("p", "snapshot-card__label", "Tool Policy"));
  permissions.append(
    renderMetricGrid([
      ["Read Tools", "Search, feeds, lookups"],
      ["Write Tools", "Posts, alerts, messages"],
      ["Financial Tools", "Only through guarded treasury flow"],
      ["Executor Address", "TBA"],
    ])
  );

  grid.append(runtime, permissions);
  section.append(grid);
  return section;
}

function buildConnectedContractsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Connected Contracts",
      "Executors touch protocol contracts only through bounded execution pathways."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Contract", "Why It Matters", "Executor Authority", "Address"],
      template: "1fr 1.8fr 1.15fr 0.7fr",
      rows: [
        [
          "TaskBoard.sol",
          "Lets an executor claim work, submit results, and receive escrow release only after review.",
          "Claim / submit only",
          "TBA",
        ],
        [
          "AgentTreasury.sol",
          "Guards what recipients and actions are allowed when execution requests require spending.",
          "Whitelisted only",
          "TBA",
        ],
        [
          "ReputationRegistry.sol",
          "Stores completion quality, verification state, and future eligibility signals.",
          "Score update only",
          "TBA",
        ],
        [
          "AgentLifecycle.sol",
          "Lets the protocol pause, hibernate, or revive an executor surface if health degrades.",
          "Protocol-governed",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildEvaluationSection(agent) {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Evaluation Model",
      "Executors are judged in relation to intent, verification, and replaceability."
    )
  );

  const grid = createEl("div", "card-grid card-grid--two");

  const metrics = createEl("article", "surface-card surface-card--operational");
  metrics.append(createEl("p", "snapshot-card__label", "Review Inputs"));
  metrics.append(
    renderMetricGrid([
      ["Intent Fit", "Does the output satisfy the active intent?" ],
      ["Verification", "Can result quality be reviewed or validated?" ],
      ["Health", "Responsive runtime + bounded behavior" ],
      ["Replaceability", "Cost, quality, and reliability against alternatives" ],
    ])
  );

  const notes = createEl("article", "surface-card surface-card--operational");
  notes.append(createEl("p", "snapshot-card__label", "What The Principal Looks For"));
  const list = createEl("ul", "clean-list");
  [
    `${agent.name} should improve principal decisions, not become the system center.`,
    "The output has to be specific enough to feed verification or operator review.",
    "The execution surface must remain replaceable if another service performs better.",
    "Runtime quality matters only insofar as it improves the principal loop.",
  ].forEach((item) => list.append(createEl("li", "", item)));
  notes.append(list);

  grid.append(metrics, notes);
  section.append(grid);
  return section;
}

function buildToolTable() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Tool Categories",
      "Each executor capability is bounded by category rather than open-ended autonomy."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Category", "Typical Actions", "Constraint", "Address"],
      template: "0.8fr 1.55fr 1.45fr 0.7fr",
      rows: [
        [
          "Read",
          "Search, read feeds, inspect contracts, gather external context.",
          "Rate limits and audit logs only.",
          "TBA",
        ],
        [
          "Write",
          "Alerts, posts, messages, delivery actions.",
          "Rate limited and logged.",
          "TBA",
        ],
        [
          "Financial",
          "DEX interaction, task posting, capital-adjacent calls.",
          "Spend caps, recipient whitelist, and treasury enforcement.",
          "TBA",
        ],
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
    activeHref: "/agent.html",
    currentView: "executor",
    currentLabel: "Executor",
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
      eyebrow: "Executor Surface",
      title: "How execution stays useful, bounded, and replaceable.",
      body: `${agent.name} is shown here as a protocol role, not as a fake live product. This page explains how an executor runs, what contracts it touches, and how the principal layer decides whether it deserves more work.`,
      stats: [
        { label: "Runtime", value: "Isolated container" },
        { label: "Primary Guardrail", value: "AgentTreasury.sol" },
        { label: "Contract Addresses", value: "TBA" },
      ],
      mode: "operational",
    }),
    buildRuntimeSection(agent),
    buildConnectedContractsSection(),
    buildEvaluationSection(agent),
    buildToolTable()
  );
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;">Executor page failed to load: ${
    error instanceof Error ? error.message : String(error)
  }</pre>`;
});
