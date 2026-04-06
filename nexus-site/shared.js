const NAV_ITEMS = [
  { href: "/index.html", label: "Core", group: "command", dominant: true },
  { href: "/dashboard.html", label: "Treasury", group: "views" },
  { href: "/marketplace.html", label: "Market", group: "views" },
  { href: "/agent.html", label: "Executor", group: "views" },
  { href: "/billing.html", label: "Capital", group: "views" },
  { href: "/create.html", label: "Registry", group: "utility" },
];

export function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (typeof text === "string") el.textContent = text;
  return el;
}

export async function loadConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) throw new Error("Failed to load config");
  return response.json();
}

export async function loadState() {
  const response = await fetch("/api/state");
  if (!response.ok) throw new Error("Failed to load state");
  return response.json();
}

export async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.payload = data;
    throw error;
  }
  return data;
}

export function getPrincipal(config) {
  return config?.principal ?? null;
}

export function getTreasuryState(state) {
  return (
    state?.principal?.treasury ??
    state?.treasury ??
    state?.buyer ?? {
      balance: 0,
      creditBalance: 0,
      capitalEvents: [],
      transactions: [],
    }
  );
}

export function getCapitalEvents(state) {
  const treasury = getTreasuryState(state);
  return treasury.capitalEvents ?? treasury.transactions ?? [];
}

export function getExecutorState(state, agentId) {
  return (
    state?.executorsByAgent?.[agentId] ??
    state?.creatorByAgent?.[agentId] ??
    null
  );
}

export function getMarketState(state, config = null) {
  const principal = config ? getPrincipal(config) : null;
  return {
    offers: state?.market?.offers ?? principal?.offers ?? [],
    dispatches: state?.market?.dispatches ?? state?.principal?.dispatches ?? [],
  };
}

export function formatTao(value) {
  return `${Number(value).toFixed(3)} TAO`;
}

export function parseTaoAmount(value) {
  const match = String(value).match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

export function formatDelta(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "+";
  return `${sign}${formatTao(Math.abs(amount))}`;
}

export function buildPageHref(href, agentId) {
  const url = new URL(href, window.location.origin);
  if (agentId && url.pathname !== "/index.html") {
    url.searchParams.set("agent", agentId);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function findAgent(config, agentId) {
  const agents = config?.agents ?? [];
  return agents.find((agent) => agent.id === agentId) ?? agents[0] ?? null;
}

export function getAgentIdFromLocation(config, fallbackId) {
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("agent");
  const agent = findAgent(config, requested || fallbackId);
  return agent?.id ?? null;
}

export function setAgentInLocation(agentId) {
  const url = new URL(window.location.href);
  url.searchParams.set("agent", agentId);
  window.history.replaceState({}, "", url);
}

export function getSystemSnapshot(config, state, agent = null) {
  const principal = getPrincipal(config) ?? {};
  const principalState = state?.principal ?? {};
  const treasury = getTreasuryState(state);
  const market = getMarketState(state, config);
  const capital = state?.capital ?? {
    ledger: [],
    recentAllocations: [],
    verifiedOutcomes: [],
  };
  const capitalEvents = getCapitalEvents(state);
  const activeIntent =
    principalState.activeIntent ??
    market.offers.find((offer) => !["closed", "completed"].includes(String(offer?.status || "").toLowerCase())) ??
    market.offers[0] ??
    null;
  const lastDispatch = principalState.lastDispatch ?? market.dispatches?.[0] ?? null;
  const lastCapitalEvent = capital.ledger?.[0] ?? capitalEvents[0] ?? null;
  const availableCapital = Number(
    treasury.availableCapital ?? treasury.balance ?? treasury.creditBalance ?? 0
  );
  const totalCapital = Number(
    treasury.totalCapital ??
      treasury.fundedTotal ??
      (treasury.allocatedTotal ?? 0) + availableCapital
  );
  const lastAllocationDelta = Number(
    treasury.lastAllocationDelta ?? lastCapitalEvent?.amount ?? 0
  );
  const reserveFloor = Number(treasury.reserveFloor ?? 0);
  const capitalAtRisk = Number(treasury.capitalAtRisk ?? 0);
  const verifiedOutcomes =
    capital.verifiedOutcomes ?? principalState.verifiedOutcomes ?? [];
  const recentAllocations =
    capital.recentAllocations ?? principalState.recentAllocations ?? [];
  const status =
    principalState.status ??
    principal?.status ??
    (lastDispatch ? "Verifying" : activeIntent ? "Allocating" : "Idle");

  return {
    principal,
    principalState,
    treasury,
    market,
    capital,
    agent,
    activeIntent,
    lastDispatch,
    lastCapitalEvent,
    totalCapital,
    availableCapital,
    lastAllocationDelta,
    reserveFloor,
    capitalAtRisk,
    verifiedOutcomes,
    recentAllocations,
    verification:
      activeIntent?.verificationTarget ??
      verifiedOutcomes[0]?.expectedOutcome ??
      lastDispatch?.summary ??
      principal?.treasury?.verification ??
      "Capital under active orchestration",
    status,
  };
}

function renderNavGroup(items, activeHref, agentId) {
  if (!items.length) {
    return null;
  }
  const group = createEl("div", "topbar__nav-group");
  items.forEach((item) => {
    const classes = ["topbar__link"];
    if (item.href === activeHref) classes.push("topbar__link--active");
    if (item.dominant) classes.push("topbar__link--core");
    if (item.group === "utility") classes.push("topbar__link--utility");
    const link = createEl("a", classes.join(" "), item.label);
    link.href = buildPageHref(item.href, agentId);
    group.append(link);
  });
  return group;
}

function buildTreasuryBlock(snapshot) {
  const block = createEl("div", "treasury-block");
  block.append(createEl("p", "treasury-block__label", "Public Build"));

  const metrics = createEl("div", "treasury-block__metrics");
  [
    ["State", "In build"],
    ["Public View", "Core only"],
    ["Focus", "How it works"],
  ].forEach(([label, value]) => {
    const metric = createEl("div", "treasury-block__metric");
    metric.append(createEl("span", "treasury-block__metric-label", label));
    metric.append(createEl("strong", "treasury-block__metric-value", value));
    metrics.append(metric);
  });

  block.append(metrics);
  return block;
}

export function renderTopbar({
  activeHref,
  agentId = null,
  brandLabel = "synTAOsis",
  config = null,
  state = null,
  showTreasuryBlock = true,
}) {
  const snapshot =
    config && state ? getSystemSnapshot(config, state) : null;
  const header = createEl("header", "topbar");
  const brand = createEl("a", "brand-mark");
  brand.href = "/index.html";
  brand.append(createEl("span", "brand-mark__dot"), createEl("span", "", brandLabel));

  const nav = createEl("nav", "topbar__nav");
  [
    NAV_ITEMS.filter((item) => item.group === "command"),
    NAV_ITEMS.filter((item) => item.group === "views"),
    NAV_ITEMS.filter((item) => item.group === "utility"),
  ]
    .map((items) => renderNavGroup(items, activeHref, agentId))
    .filter(Boolean)
    .forEach((group) => nav.append(group));

  const meta = createEl("div", "topbar__meta");
  meta.append(createEl("span", "topbar__pill", "In Build"));
  if (snapshot && showTreasuryBlock) {
    meta.append(buildTreasuryBlock(snapshot));
  }

  header.append(brand, nav, meta);
  return header;
}

export function renderSystemBreadcrumb(currentLabel, snapshot) {
  const wrap = createEl("div", "system-breadcrumb");
  const activeIntent = snapshot.activeIntent?.title ?? "No active intent";
  wrap.append(
    createEl("span", "system-breadcrumb__item system-breadcrumb__item--strong", snapshot.principal?.name ?? "synTAOsis Core"),
    createEl("span", "system-breadcrumb__divider", "/"),
    createEl("span", "system-breadcrumb__item", activeIntent),
    createEl("span", "system-breadcrumb__divider", "/"),
    createEl("span", "system-breadcrumb__item", currentLabel)
  );
  return wrap;
}

export function renderStateRibbon(snapshot) {
  const section = createEl("section", "state-ribbon");
  const cards = [
    ["What It Is", "One principal intelligence"],
    ["What Is Public", "Core explanation only"],
    [
      "Why It Starts Here",
      "The control layer comes before execution surfaces",
    ],
    ["What Stays Internal", "Execution, commitment, and registry flows"],
  ];

  cards.forEach(([label, value]) => {
    const card = createEl("article", "state-ribbon__card");
    card.append(createEl("p", "state-ribbon__label", label));
    card.append(createEl("h3", "state-ribbon__value", value));
    section.append(card);
  });

  return section;
}

export function renderContextRail(snapshot, currentView) {
  const rail = createEl("aside", "context-rail");
  rail.append(createEl("p", "context-rail__eyebrow", "System Context"));
  rail.append(createEl("h3", "context-rail__title", snapshot.principal?.name ?? "synTAOsis Core"));

  const cards = [
    {
      label: "Public View",
      value: "Core explanation only",
      detail:
        "The site explains the principal model instead of pretending balances, commitments, or market activity are already live.",
    },
    {
      label: "System Shape",
      value: "Principal first",
      detail:
        "One central intelligence defines intent, evaluates downstream execution, and keeps secondary surfaces replaceable.",
    },
    {
      label: "What Stays Internal",
      value: "Execution and commitment surfaces",
      detail:
        "Market comparison, registry controls, and commitment flows stay private until they reflect real product behavior.",
    },
  ];

  if (currentView === "executor" && snapshot.agent) {
    cards.push({
      label: "Execution Surface",
      value: `${snapshot.agent.name} stays secondary`,
      detail: "Executors are evaluated in relation to Core, not presented as standalone products.",
    });
  }

  cards.forEach((item) => {
    const card = createEl("article", "context-rail__card");
    card.append(createEl("p", "context-rail__label", item.label));
    card.append(createEl("h4", "context-rail__value", item.value));
    card.append(createEl("p", "context-rail__detail", item.detail));
    rail.append(card);
  });

  return rail;
}

export function renderSystemLayout({
  activeHref,
  currentView,
  currentLabel,
  config,
  state,
  agent = null,
  agentId = null,
  showContextRail = false,
  showTreasuryBlock = true,
  showSystemState = true,
}) {
  const snapshot = getSystemSnapshot(config, state, agent);
  const shell = createEl("div", `system-shell system-shell--${currentView}`);
  const body = createEl(
    "div",
    showContextRail ? "system-body system-body--with-rail" : "system-body"
  );
  const main = createEl("div", `system-main system-main--${currentView}`);

  shell.append(
    renderTopbar({
      activeHref,
      agentId,
      brandLabel: config?.product?.name ?? "synTAOsis",
      config,
      state,
      showTreasuryBlock,
    })
  );

  if (showSystemState) {
    shell.append(
      renderSystemBreadcrumb(currentLabel, snapshot),
      renderStateRibbon(snapshot)
    );
  }

  if (showContextRail) {
    body.append(renderContextRail(snapshot, currentView));
  }
  body.append(main);
  shell.append(body);

  return { shell, main, snapshot };
}


export function renderHeroBlock({
  eyebrow,
  title,
  body,
  actions = [],
  stats = [],
  mode = "operational",
}) {
  const section = createEl("section", `page-hero page-hero--${mode}`);
  const copy = createEl("div", `page-hero__copy page-hero__copy--${mode}`);
  copy.append(createEl("p", "eyebrow", eyebrow));
  const h1 = createEl("h1", "page-hero__title", title);
  copy.append(h1);
  copy.append(createEl("p", "page-hero__body", body));

  if (actions.length) {
    const actionRow = createEl("div", "hero__actions");
    actions.forEach((action) => {
      const link = createEl(
        action.tag || "a",
        action.primary ? "button button--primary" : "button button--ghost",
        action.label
      );
      if (action.href) link.href = action.href;
      if (action.onClick) link.addEventListener("click", action.onClick);
      if (action.tag === "button") link.type = "button";
      actionRow.append(link);
    });
    copy.append(actionRow);
  }

  if (stats.length) {
    const statGrid = createEl("dl", "hero__stats");
    stats.forEach((item) => {
      const wrapper = document.createElement("div");
      wrapper.append(createEl("dt", "", item.label), createEl("dd", "", item.value));
      statGrid.append(wrapper);
    });
    copy.append(statGrid);
  }

  section.append(copy);
  return section;
}

export function renderPrelaunchGate({
  surfaceLabel,
  title,
  body,
  bullets = [],
}) {
  const section = createEl("section", "section");
  section.append(
    renderHeroBlock({
      eyebrow: surfaceLabel,
      title,
      body,
      actions: [
        { label: "Return to Core", href: "/index.html", primary: true },
        { label: "View Launch Scope", href: "/index.html#scope", primary: false },
      ],
      stats: [
        { label: "State", value: "In build" },
        { label: "Public View", value: "Core only" },
        { label: "Why Hidden", value: "Not real yet" },
      ],
      mode: "operational",
    })
  );

  const card = createEl("article", "surface-card surface-card--operational surface-card--intent");
  card.append(createEl("p", "snapshot-card__label", "Internal During Build"));
  card.append(
    createEl(
      "h3",
      "surface-card__title",
      "This surface stays private until the real product loop exists."
    )
  );
  card.append(
    createEl(
      "p",
      "page-hero__body",
      "We are showing the system model publicly, while execution comparison, commitment logic, registry controls, and internal operations stay off-site until they are backed by real product behavior."
    )
  );

  if (bullets.length) {
    const list = createEl("ul", "clean-list");
    bullets.forEach((item) => list.append(createEl("li", "", item)));
    card.append(list);
  }

  section.append(card);
  return section;
}

export function renderAgentPill(agent) {
  return createEl("span", "agent-pill", agent?.dashboard?.verification ?? "No status");
}

export function renderMetricGrid(items) {
  const grid = createEl("div", "simple-metric-grid");
  items.forEach(([label, value]) => {
    const card = createEl("div", "simple-metric");
    card.append(createEl("p", "simple-metric__label", label));
    card.append(createEl("p", "simple-metric__value", value));
    grid.append(card);
  });
  return grid;
}

export function renderDataTable({
  columns = [],
  rows = [],
  template = "",
}) {
  const table = createEl("div", "surface-table");

  const header = createEl("div", "surface-table__row surface-table__row--head");
  if (template) {
    header.style.gridTemplateColumns = template;
  }
  columns.forEach((column) => header.append(createEl("span", "", column)));
  table.append(header);

  rows.forEach((cells) => {
    const row = createEl("div", "surface-table__row");
    if (template) {
      row.style.gridTemplateColumns = template;
    }
    cells.forEach((cell) => {
      if (typeof Node !== "undefined" && cell instanceof Node) {
        row.append(cell);
        return;
      }

      if (cell && typeof cell === "object" && "text" in cell) {
        row.append(createEl("span", cell.className ?? "", String(cell.text ?? "")));
        return;
      }

      row.append(createEl("span", "", String(cell ?? "")));
    });
    table.append(row);
  });

  return table;
}

export function renderChartCard({ title, subtitle, labels, series, variant = "revenue" }) {
  const card = createEl("article", "surface-card surface-card--chart");
  card.append(createEl("p", "snapshot-card__label", title));
  card.append(createEl("h3", "surface-card__title", subtitle));
  const chart = createEl("div", "mini-chart mini-chart--standalone");
  const maxValue = Math.max(...series, 1);
  labels.forEach((label, index) => {
    const row = createEl("div", "mini-chart__row");
    const day = createEl("span", "mini-chart__label", label);
    const bars = createEl("div", "mini-chart__bars");
    const bar = createEl("span", `mini-chart__bar mini-chart__bar--${variant}`);
    bar.style.width = `${(series[index] / maxValue) * 100}%`;
    bar.textContent = String(series[index]);
    bars.append(bar);
    row.append(day, bars);
    chart.append(row);
  });
  card.append(chart);
  return card;
}

export function createSectionHeading(eyebrow, title) {
  const wrap = createEl("div", "section__heading");
  wrap.append(createEl("p", "eyebrow", eyebrow));
  wrap.append(createEl("h2", "", title));
  return wrap;
}
