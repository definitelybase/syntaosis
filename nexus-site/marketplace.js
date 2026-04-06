import {
  createEl,
  createSectionHeading,
  loadConfig,
  loadState,
  renderDataTable,
  renderHeroBlock,
  renderMetricGrid,
  renderSystemLayout,
} from "./shared.js";

function buildIntentLifecycleSection() {
  const section = createEl("section", "section");
  section.append(
    createSectionHeading(
      "Intent Lifecycle",
      "The market exists to turn one principal intent into bounded execution."
    )
  );

  const card = createEl("article", "surface-card surface-card--intent");
  card.append(createEl("p", "snapshot-card__label", "Protocol Flow"));
  card.append(
    createEl(
      "h3",
      "surface-card__title",
      "Core defines intent before any executor is even comparable."
    )
  );
  card.append(
    createEl(
      "p",
      "page-hero__body",
      "synTAOsis does not expose a browse-first market. The principal opens an intent, sets a budget ceiling and verification target, and only then pushes execution into a comparison surface."
    )
  );

  const list = createEl("ul", "clean-list");
  [
    "synTAOsis Core defines the objective, budget ceiling, deadline, and verification target.",
    "The intent is posted into the market layer as a bounded execution request.",
    "Eligible executors claim or are matched against that request.",
    "Outputs are submitted for review and mapped back to the originating intent.",
    "Only approved execution can move the protocol into settlement and reallocation.",
  ].forEach((item) => list.append(createEl("li", "", item)));
  card.append(list);
  section.append(card);
  return section;
}

function buildTaskBoardSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "TaskBoard Mechanics",
      "The execution market is planned as an escrowed intent lifecycle on TAO EVM."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Method", "Role", "What It Does", "Address"],
      template: "0.95fr 1.1fr 1.9fr 0.7fr",
      rows: [
        [
          "postTask(...)",
          "Intent creation",
          "Locks the reward in escrow and creates the execution request on behalf of the principal surface.",
          "TBA",
        ],
        [
          "claimTask(taskId)",
          "Claiming",
          "Lets an eligible executor or worker claim the request without becoming the center of the system.",
          "TBA",
        ],
        [
          "submitResult(taskId, resultHash, resultURI)",
          "Submission",
          "Binds execution output back to the original intent for review and verification.",
          "TBA",
        ],
        [
          "approveResult(taskId)",
          "Release",
          "Releases escrow only after the protocol or operator approves the verified outcome.",
          "TBA",
        ],
        [
          "reclaimExpired(taskId)",
          "Recovery",
          "Returns funds when deadlines pass or execution fails to complete.",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildMarketContractsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Connected Contracts",
      "The market layer is small on purpose: escrow, reputation, and bounded treasury release."
    )
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--table");
  card.append(
    renderDataTable({
      columns: ["Contract", "Protocol Role", "Current Status", "Address"],
      template: "1fr 1.9fr 0.9fr 0.7fr",
      rows: [
        [
          "TaskBoard.sol",
          "Escrow contract for intent posting, executor claiming, result submission, and payout release.",
          "Planned core contract",
          "TBA",
        ],
        [
          "AgentTreasury.sol",
          "Restricts how value can leave protocol-controlled capital and what recipients are allowed.",
          "Planned core contract",
          "TBA",
        ],
        [
          "ReputationRegistry.sol",
          "Tracks completion quality, verification state, and executor eligibility over time.",
          "Planned shared contract",
          "TBA",
        ],
        [
          "AgentLifecycle.sol",
          "Controls pause, hibernation, and revival logic when execution quality or activity drops.",
          "Planned shared contract",
          "TBA",
        ],
      ],
    })
  );
  section.append(card);
  return section;
}

function buildDecisionInputsSection() {
  const section = createEl("section", "section section--dense");
  section.append(
    createSectionHeading(
      "Decision Inputs",
      "What the protocol uses to decide whether a market action is valid."
    )
  );

  const grid = createEl("div", "card-grid card-grid--two");

  const left = createEl("article", "surface-card surface-card--operational");
  left.append(createEl("p", "snapshot-card__label", "Core Inputs"));
  left.append(
    renderMetricGrid([
      ["Intent Owner", "synTAOsis Core"],
      ["Execution Venue", "TaskBoard escrow market"],
      ["Settlement Layer", "TAO EVM"],
      ["Explorer Addresses", "TBA"],
    ])
  );

  const right = createEl("article", "surface-card surface-card--operational");
  right.append(createEl("p", "snapshot-card__label", "Review Conditions"));
  const list = createEl("ul", "clean-list");
  [
    "Budget ceiling must be defined before execution enters comparison.",
    "Verification target must be explicit before payout can release.",
    "Self-dealing and circular flow checks must pass before settlement.",
    "Expired work must be reclaimable without manual treasury drains.",
  ].forEach((item) => list.append(createEl("li", "", item)));
  right.append(list);

  grid.append(left, right);
  section.append(grid);
  return section;
}

async function init() {
  const [config, state] = await Promise.all([loadConfig(), loadState()]);

  const app = document.querySelector("#app");
  app.innerHTML = "";

  const frame = renderSystemLayout({
    activeHref: "/marketplace.html",
    currentView: "market",
    currentLabel: "Market",
    config,
    state,
    showContextRail: false,
    showTreasuryBlock: true,
    showSystemState: false,
  });
  app.append(frame.shell);

  frame.main.append(
    renderHeroBlock({
      eyebrow: "Market Surface",
      title: "How the protocol turns one intent into bounded execution.",
      body: "This surface explains the real market model instead of pretending there is already a public marketplace. synTAOsis Core opens intent first, then TaskBoard-style escrow and verification logic determine how execution is compared and released.",
      stats: [
        { label: "Intent Source", value: "synTAOsis Core" },
        { label: "Escrow Contract", value: "TaskBoard.sol" },
        { label: "Contract Addresses", value: "TBA" },
      ],
      mode: "operational",
    }),
    buildIntentLifecycleSection(),
    buildTaskBoardSection(),
    buildMarketContractsSection(),
    buildDecisionInputsSection()
  );
}

init().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;">Market page failed to load: ${
    error instanceof Error ? error.message : String(error)
  }</pre>`;
});
