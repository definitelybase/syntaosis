const appState = {
  config: null,
  selectedAgentId: null,
  activeSurface: "principal",
  messagesByThread: {},
  busy: false,
  persistedState: {
    principal: {
      treasury: {
        balance: 0,
        creditBalance: 0,
        capitalEvents: [],
      },
      activity: [],
      dispatches: [],
    },
    executorsByAgent: {},
  },
};

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (typeof text === "string") {
    el.textContent = text;
  }
  return el;
}

function getAgents() {
  return appState.config?.agents ?? [];
}

function getProduct() {
  return appState.config?.product ?? {};
}

function getPrincipal() {
  return appState.config?.principal ?? {};
}

function getPrincipalState() {
  return appState.persistedState?.principal ?? {};
}

function getMarketState() {
  const principal = getPrincipal();
  const principalState = getPrincipalState();
  return {
    offers:
      appState.persistedState?.market?.offers ??
      principalState.offers ??
      principal.offers ??
      [],
    dispatches:
      appState.persistedState?.market?.dispatches ??
      principalState.dispatches ??
      [],
  };
}

function getCapitalState() {
  return appState.persistedState?.capital ?? {
    ledger: [],
    recentAllocations: [],
    verifiedOutcomes: [],
  };
}

function getTreasuryState() {
  return (
    appState.persistedState?.principal?.treasury ??
    appState.persistedState?.treasury ??
    appState.persistedState?.buyer ?? {
      balance: 0,
      creditBalance: 0,
      capitalEvents: [],
      transactions: [],
    }
  );
}

function getCapitalEvents() {
  const treasury = getTreasuryState();
  return treasury.capitalEvents ?? treasury.transactions ?? [];
}

function getExecutorSession(agentId) {
  return (
    appState.persistedState?.executorsByAgent?.[agentId] ??
    appState.persistedState?.creatorByAgent?.[agentId] ??
    null
  );
}

function getSelectedAgent() {
  const agents = getAgents();
  return (
    agents.find((agent) => agent.id === appState.selectedAgentId) ??
    agents[0] ??
    null
  );
}

function parseTaoAmount(value) {
  const match = String(value).match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function formatTao(value) {
  return `${Number(value).toFixed(3)} TAO`;
}

function formatDelta(value) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "+";
  return `${sign}${formatTao(Math.abs(amount))}`;
}

function formatPercent(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `${Math.round(amount)}%` : "0%";
}

function formatWhen(value) {
  if (!value) {
    return "just now";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function setButtonText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function getPreferredExecutorId(snapshot = getSystemSnapshot()) {
  return snapshot.activeIntent?.preferredExecutorId ?? null;
}

function getSystemSnapshot() {
  const principal = getPrincipal();
  const principalState = getPrincipalState();
  const treasury = getTreasuryState();
  const market = getMarketState();
  const capital = getCapitalState();
  const events = getCapitalEvents();
  const activeIntent =
    principalState.activeIntent ??
    market.offers.find((offer) => !["closed", "completed"].includes(String(offer?.status || "").toLowerCase())) ??
    market.offers[0] ??
    null;
  const lastDispatch = principalState.lastDispatch ?? market.dispatches?.[0] ?? null;
  const lastEvent = capital.ledger?.[0] ?? events[0] ?? null;
  const availableCapital = Number(
    treasury.availableCapital ?? treasury.balance ?? treasury.creditBalance ?? 0
  );
  const totalCapital = Number(
    treasury.totalCapital ??
      treasury.fundedTotal ??
      (treasury.allocatedTotal ?? 0) + availableCapital
  );
  const lastAllocationDelta = Number(
    treasury.lastAllocationDelta ?? lastEvent?.amount ?? 0
  );
  const reserveFloor = Number(treasury.reserveFloor ?? 0);
  const capitalAtRisk = Number(treasury.capitalAtRisk ?? 0);
  const verifiedOutcomes =
    capital.verifiedOutcomes ?? principalState.verifiedOutcomes ?? [];
  const recentAllocations =
    capital.recentAllocations ?? principalState.recentAllocations ?? [];
  const status =
    principalState.status ??
    principal.status ??
    (lastDispatch ? "Verifying" : activeIntent ? "Allocating" : "Idle");
  const selectedExecutorId = activeIntent?.preferredExecutorId ?? null;
  const selectedExecutor =
    getAgents().find((agent) => agent.id === selectedExecutorId) ?? null;

  return {
    principal,
    principalState,
    treasury,
    market,
    capital,
    activeIntent,
    lastDispatch,
    lastEvent,
    availableCapital,
    totalCapital,
    lastAllocationDelta,
    reserveFloor,
    capitalAtRisk,
    verifiedOutcomes,
    recentAllocations,
    selectedExecutorId,
    selectedExecutor,
    verification:
      activeIntent?.verificationTarget ??
      verifiedOutcomes[0]?.expectedOutcome ??
      lastDispatch?.summary ??
      principal?.treasury?.verification ??
      "Capital under active orchestration",
    status,
  };
}

function getSurfaceKey() {
  if (appState.activeSurface === "principal") {
    return "principal";
  }
  const agent = getSelectedAgent();
  return `executor:${agent?.id ?? "default"}`;
}

function getMessagesForCurrentSurface() {
  const key = getSurfaceKey();
  if (!appState.messagesByThread[key]) {
    appState.messagesByThread[key] = [];
  }
  return appState.messagesByThread[key];
}

function getActiveSurface() {
  const snapshot = getSystemSnapshot();
  if (appState.activeSurface === "principal") {
    const principal = getPrincipal();
    const intentTitle = snapshot.activeIntent?.title ?? "the current intent";
    return {
      type: "principal",
      id: "principal",
      name: principal.name ?? "synTAOsis Core",
      tagline: principal.tagline ?? "Sovereign capital orchestration AI",
      description:
        principal.description ??
        "The central intelligence that owns treasury, posts market intents, and routes capital.",
      verification:
        principal.treasury?.verification ?? "Capital under active orchestration",
      starterPrompts: principal.starterPrompts ?? [],
      placeholder:
        "Ask synTAOsis Core how it allocates treasury, chooses offers, or routes execution.",
      intro: `I am synTAOsis Core. I control treasury, keep ${formatTao(snapshot.availableCapital)} available, and route capital into ${intentTitle}.`,
      status: `Principal diagnostics active. System status: ${snapshot.status}. Identity and provider questions are intercepted on the server before they reach the model.`,
    };
  }

  const agent = getSelectedAgent();
  const intentTitle = snapshot.activeIntent?.title ?? "the active intent";
  return {
    type: "executor",
    id: agent?.id ?? "executor",
    name: agent?.name ?? "Selected Executor",
    tagline: agent?.tagline ?? "Secondary execution surface",
    description: agent?.description ?? "",
    verification: agent?.dashboard?.verification ?? "Execution surface",
    starterPrompts: agent?.starterPrompts ?? [],
    placeholder:
      "Ask how this executor helps synTAOsis Core, what work it handles, or what results it returns.",
    intro: `I am ${agent?.name ?? "the selected executor"}, a secondary execution surface used by synTAOsis Core for ${intentTitle}.`,
    status: `${agent?.name ?? "Selected Executor"} is downstream from Core and currently evaluated against ${intentTitle}. Identity and provider questions are intercepted on the server.`,
  };
}

function mountList(selector, items) {
  const container = document.querySelector(selector);
  if (!container) {
    return;
  }
  container.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.append(li);
  });
}

function mountStats(items) {
  const container = document.querySelector("#hero-stats");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  items.forEach((item) => {
    const wrapper = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = item.label;
    dd.textContent = item.value;
    wrapper.append(dt, dd);
    container.append(wrapper);
  });
}

function mountRoadmap(items) {
  const container = document.querySelector("#timeline");
  container.innerHTML = "";
  items.forEach((item) => {
    const article = createEl("article", "timeline__item fade-in");
    const day = createEl("p", "timeline__day", item.day);
    const title = createEl("h3", "", item.title);
    const list = document.createElement("ul");

    item.items.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      list.append(li);
    });

    article.append(day, title, list);
    container.append(article);
  });
}

function buildRecentAllocationLines(snapshot) {
  const recentAllocations = snapshot.recentAllocations ?? [];
  if (recentAllocations.length) {
    return recentAllocations.slice(0, 6).map((allocation) => {
      const intent = allocation.intent ?? "Active intent";
      const executor = allocation.executor ?? "Selected executor";
      const delta = formatDelta(allocation.delta ?? 0);
      return `${formatWhen(allocation.timestamp)} · ${intent} -> ${executor} (${delta})`;
    });
  }
  return snapshot.principalState?.activity ?? snapshot.principal?.activity ?? [];
}

function buildCapitalEventLines(snapshot) {
  const events = snapshot.treasury?.capitalEvents ?? [];
  if (!events.length) {
    return [
      "No capital events yet. Fund treasury before synTAOsis Core can allocate into execution.",
    ];
  }
  return events.slice(0, 8).map((event) => {
    const delta = formatDelta(event.amount ?? 0);
    return `${formatWhen(event.createdAt)} · ${event.description} (${delta})`;
  });
}

function mountCoreHeroState() {
  const heroTitle = document.querySelector("#core-hero-title");
  if (heroTitle) {
    heroTitle.innerHTML = `Launch one central AI with a clear capital model, <span>not a fake live product.</span>`;
  }

  setText("#core-hero-eyebrow", "Principal System Preview");
  setText(
    "#core-hero-lede",
    "synTAOsis is still in build mode. Publicly this site shows the control model: one principal intelligence defines intent, evaluates downstream execution, and keeps every secondary surface clearly subordinate until launch is real."
  );
  setButtonText("#core-primary-cta", "View Execution Model");
  setButtonText("#core-secondary-cta", "View Launch Scope");
  setButtonText("#core-tertiary-cta", "View Build Roadmap");

  setText(
    "#core-terminal-wedge",
    "How one principal intelligence defines intent and keeps execution secondary"
  );
  setText("#core-terminal-intent", "Why execution stays downstream");
  setText("#core-terminal-allocation", "Core only");
  setText("#core-terminal-status", "Explanatory");

  setText("#candidate-section-eyebrow", "Initial Execution Cohort");
  setText(
    "#candidate-section-title",
    "These execution surfaces are shown only to explain the system shape. They are still under evaluation and are not public product surfaces."
  );
  setText("#candidate-card-label", "Launch Candidate");
}

function mountCoreShellState() {
  const snapshot = getSystemSnapshot();
  const totalEl = document.querySelector("#topbar-total-capital");
  const availableEl = document.querySelector("#topbar-available-capital");
  const deltaEl = document.querySelector("#topbar-allocation-delta");
  const breadcrumbIntent = document.querySelector("#core-breadcrumb-intent");
  const ribbonIntent = document.querySelector("#core-ribbon-intent");
  const ribbonStatus = document.querySelector("#core-ribbon-status");
  const ribbonDispatch = document.querySelector("#core-ribbon-dispatch");
  const ribbonVerification = document.querySelector("#core-ribbon-verification");
  const railIntentTitle = document.querySelector("#rail-intent-title");
  const railIntentDetail = document.querySelector("#rail-intent-detail");
  const railDispatchTitle = document.querySelector("#rail-dispatch-title");
  const railDispatchDetail = document.querySelector("#rail-dispatch-detail");
  const railStatusValue = document.querySelector("#rail-status-value");
  const railStatusDetail = document.querySelector("#rail-status-detail");

  if (!totalEl) {
    return;
  }

  totalEl.textContent = "In build";
  availableEl.textContent = "Core only";
  deltaEl.textContent = "How it works";

  breadcrumbIntent.textContent = "Public model";
  ribbonIntent.textContent = "One principal intelligence";
  ribbonStatus.textContent = "Core explanation only";
  ribbonDispatch.textContent = "The control layer comes first";
  ribbonVerification.textContent = "Execution and commitment flows";

  railIntentTitle.textContent = "Core explanation only";
  railIntentDetail.textContent =
    "The site explains the principal model instead of pretending balances, commitments, or market activity are already live.";
  railDispatchTitle.textContent = "Principal first";
  railDispatchDetail.textContent =
    "One central intelligence defines intent and evaluates downstream execution instead of presenting equal product surfaces.";
  railStatusValue.textContent = "Execution and commitment";
  railStatusDetail.textContent =
    "Market comparison, registry controls, and operational flows stay private until they reflect real product behavior.";
}

function mountAgentSwitcher() {
  const container = document.querySelector("#agent-switcher");
  container.innerHTML = "";

  const preferredExecutorId = getPreferredExecutorId();
  const agents = [...getAgents()].sort((left, right) => {
    const leftScore = left.id === preferredExecutorId ? -1 : 0;
    const rightScore = right.id === preferredExecutorId ? -1 : 0;
    return leftScore - rightScore;
  });

  agents.forEach((agent) => {
    const button = createEl("button", "agent-switcher__item");
    if (agent.id === appState.selectedAgentId) {
      button.classList.add("agent-switcher__item--active");
    }

    const name = createEl("span", "agent-switcher__name", agent.name);
    const tagline = createEl(
      "span",
      "agent-switcher__tag",
      agent.id === preferredExecutorId
        ? "Leading launch candidate"
        : "Secondary candidate under evaluation"
    );
    button.append(name, tagline);

    button.addEventListener("click", () => {
      if (appState.selectedAgentId === agent.id || appState.busy) {
        return;
      }
      appState.selectedAgentId = agent.id;
      mountAgentSwitcher();
      renderSelectedExecutor();
    });

    container.append(button);
  });
}

function mountExecutorMetrics(agent) {
  const snapshot = getSystemSnapshot();
  const metrics = document.querySelector("#agent-metrics");
  if (!metrics) {
    return;
  }
  metrics.innerHTML = "";

  const entries = [
    [
      "Surface Role",
      agent.id === snapshot.selectedExecutorId ? "Leading launch candidate" : "Secondary launch candidate",
    ],
    [
      "What It Does",
      agent.cohortBody,
    ],
    [
      "Why It Exists",
      "To serve principal decisions after an intent exists, not to act as a standalone product.",
    ],
    [
      "How It Is Judged",
      "By fit to intent, clarity of output, and whether it stays replaceable.",
    ],
    [
      "Public Status",
      "Shown as system context only",
    ],
    [
      "Current Relationship To Core",
      snapshot.activeIntent?.title
        ? `Under evaluation for ${snapshot.activeIntent.title}`
        : "Waiting for the public launch surface to become real",
    ],
  ];

  entries.forEach(([label, value]) => {
    const item = createEl("div", "agent-metric");
    item.append(createEl("p", "agent-metric__label", label));
    item.append(createEl("p", "agent-metric__value", value));
    metrics.append(item);
  });
}

function mountTreasuryKpis() {
  const snapshot = getSystemSnapshot();
  const container = document.querySelector("#creator-kpis");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  const items = [
    ["Total Capital", formatTao(snapshot.totalCapital)],
    ["Available", formatTao(snapshot.availableCapital)],
    ["Capital At Risk", formatTao(snapshot.capitalAtRisk)],
    ["Reserve Floor", formatTao(snapshot.reserveFloor)],
  ];

  items.forEach(([label, value]) => {
    const card = createEl("div", "creator-kpi");
    card.append(createEl("p", "creator-kpi__label", label));
    card.append(createEl("p", "creator-kpi__value", value));
    container.append(card);
  });
}

function renderSeriesChart(containerSelector, labels, values, variant) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    return;
  }
  container.innerHTML = "";
  const maxValue = Math.max(...values, 1);

  labels.forEach((label, index) => {
    const row = createEl("div", "mini-chart__row");
    const day = createEl("span", "mini-chart__label", label);
    const bars = createEl("div", "mini-chart__bars");
    const bar = createEl("span", `mini-chart__bar mini-chart__bar--${variant}`);
    bar.style.width = `${(values[index] / maxValue) * 100}%`;
    bar.textContent = String(values[index]);
    bars.append(bar);
    row.append(day, bars);
    container.append(row);
  });
}

function renderTreasuryDashboard(agent) {
  const executorState = getExecutorSession(agent.id);
  const principal = getPrincipal();
  const snapshot = getSystemSnapshot();
  const historyTitle = document.querySelector("#creator-history-title");
  const verificationTitle = document.querySelector("#creator-verification-title");

  if (!executorState || !historyTitle || !verificationTitle) {
    return;
  }

  historyTitle.textContent =
    `${principal.name ?? "synTAOsis Core"} capital trajectory`;
  verificationTitle.textContent =
    `${agent.name} verification against ${snapshot.activeIntent?.title ?? "the current intent"}`;

  mountTreasuryKpis();
  renderSeriesChart(
    "#creator-revenue-chart",
    principal.history?.labels || executorState.labels || [],
    principal.history?.capital || executorState.grossHistory || [],
    "revenue"
  );
  renderSeriesChart(
    "#creator-verified-chart",
    executorState.labels || [],
    executorState.verifiedHistory || [],
    "verified"
  );
  mountList("#settlement-list", buildRecentAllocationLines(snapshot));
}

function setPersistedState(state) {
  appState.persistedState = state || {
    principal: {
      treasury: {
        balance: 0,
        creditBalance: 0,
        capitalEvents: [],
      },
      activity: [],
      dispatches: [],
    },
    executorsByAgent: {},
  };
}

function renderTreasuryState() {
  const snapshot = getSystemSnapshot();
  const transactionList = document.querySelector("#transaction-list");
  const agent = getSelectedAgent();
  const balanceEl = document.querySelector("#credit-balance");
  const pricePill = document.querySelector("#current-price-pill");
  const depositButtons = document.querySelectorAll(".deposit-button");
  if (!transactionList || !balanceEl || !pricePill) {
    return;
  }

  balanceEl.textContent = formatTao(snapshot.availableCapital);
  pricePill.textContent = agent
    ? `Commit ${formatTao(parseTaoAmount(agent.dashboard.priceModel))}`
    : "No execution candidate";

  depositButtons.forEach((button) => {
    const amount = Number(button.dataset.amount || "0");
    button.textContent = `Fund +${amount} TAO`;
  });

  transactionList.innerHTML = "";

  buildCapitalEventLines(snapshot).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    transactionList.append(li);
  });
}

function renderMiniChart(agent) {
  const container = document.querySelector("#mini-chart");
  const title = document.querySelector("#history-title");
  if (!container || !title) {
    return;
  }
  container.innerHTML = "";

  const history = agent.history || { usage: [], revenue: [], labels: [] };
  const usage = history.usage || [];
  const revenue = history.revenue || [];
  const labels = history.labels || [];

  title.textContent = `${agent.name} execution history used by Core for comparison`;

  const maxValue = Math.max(...usage, ...revenue, 1);

  labels.forEach((label, index) => {
    const row = createEl("div", "mini-chart__row");
    const day = createEl("span", "mini-chart__label", label);
    const bars = createEl("div", "mini-chart__bars");

    const usageBar = createEl("span", "mini-chart__bar mini-chart__bar--usage");
    usageBar.style.width = `${(usage[index] / maxValue) * 100}%`;
    usageBar.textContent = String(usage[index]);

    const revenueBar = createEl("span", "mini-chart__bar mini-chart__bar--revenue");
    revenueBar.style.width = `${(revenue[index] / maxValue) * 100}%`;
    revenueBar.textContent = String(revenue[index]);

    bars.append(usageBar, revenueBar);
    row.append(day, bars);
    container.append(row);
  });
}

function renderSampleOutput(agent) {
  const outputTitle = document.querySelector("#sample-output-title");
  const outputFormat = document.querySelector("#sample-output-format");
  const outputBody = document.querySelector("#sample-output-body");
  if (!outputTitle || !outputFormat || !outputBody) {
    return;
  }
  outputTitle.textContent = agent.sampleOutput.title;
  outputFormat.textContent = agent.sampleOutput.format;
  outputBody.textContent = agent.sampleOutput.body;
}

function renderActivity(agent) {
  const snapshot = getSystemSnapshot();
  const activity = [
    agent.id === snapshot.selectedExecutorId
      ? `Currently preferred by Core for ${snapshot.activeIntent?.title ?? "the active intent"}.`
      : `Currently replaceable for ${snapshot.activeIntent?.title ?? "the active intent"}.`,
    ...(agent.activity || []),
  ];
  mountList("#activity-list", activity);
}

function appendChatMessage(role, text, meta = {}) {
  const log = document.querySelector("#chat-log");
  if (!log) {
    return;
  }
  const article = createEl("article", `chat-message chat-message--${role}`);
  const body = createEl("div", "chat-message__body", text);
  const footer = createEl("div", "chat-message__meta");

  footer.append(
    createEl("span", "chat-badge", role === "user" ? "You" : getProduct().name || "synTAOsis")
  );
  if (meta.surfaceName) {
    footer.append(createEl("span", "chat-badge", meta.surfaceName));
  }

  if (meta.filtered) {
    footer.append(createEl("span", "chat-badge chat-badge--accent", "scripted identity reply"));
  } else if (meta.provider) {
    footer.append(createEl("span", "chat-badge", meta.provider));
  }

  article.append(body, footer);
  log.append(article);
  log.scrollTop = log.scrollHeight;
}

function rerenderChatLog() {
  const log = document.querySelector("#chat-log");
  if (!log) {
    return;
  }
  log.innerHTML = "";
  const messages = getMessagesForCurrentSurface();
  messages.forEach((message) => {
    appendChatMessage(message.role, message.content, message.meta || {});
  });
}

function ensureSurfaceIntro() {
  const surface = getActiveSurface();
  const messages = getMessagesForCurrentSurface();
  if (messages.length > 0) {
    return;
  }

  messages.push({
    role: "assistant",
    content: surface.intro,
    meta: {
      surfaceName: surface.name,
      provider: "console-intro",
    },
  });
}

function setChatBusy(isBusy, statusText) {
  appState.busy = isBusy;
  const submit = document.querySelector("#chat-submit");
  const input = document.querySelector("#chat-input");
  const status = document.querySelector("#chat-status");
  if (!submit || !input || !status) {
    return;
  }

  submit.disabled = isBusy;
  input.disabled = isBusy;
  submit.textContent = isBusy ? "Thinking..." : "Send";
  status.textContent = statusText;
}

function mountPromptChips(surface) {
  const container = document.querySelector("#prompt-chips");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  surface.starterPrompts.forEach((prompt) => {
    const button = createEl("button", "prompt-chip", prompt);
    button.type = "button";
    button.addEventListener("click", () => {
      const input = document.querySelector("#chat-input");
      input.value = prompt;
      input.focus();
    });
    container.append(button);
  });
}

function mountConsoleSurfaceSwitcher() {
  const container = document.querySelector("#console-target-switcher");
  if (!container) {
    return;
  }
  container.innerHTML = "";

  [
    { id: "principal", label: "Principal" },
    { id: "executor", label: "Executor" },
  ].forEach((surface) => {
    const button = createEl(
      "button",
      appState.activeSurface === surface.id
        ? "filter-chip filter-chip--active"
        : "filter-chip",
      surface.label
    );
    button.type = "button";
    button.addEventListener("click", () => {
      if (appState.activeSurface === surface.id || appState.busy) {
        return;
      }
      appState.activeSurface = surface.id;
      renderConsoleSurface();
    });
    container.append(button);
  });
}

function renderConsoleSurface() {
  const surface = getActiveSurface();
  const label = document.querySelector("#chat-form-label");
  const input = document.querySelector("#chat-input");
  const title = document.querySelector("#console-target-title");
  const copy = document.querySelector("#console-target-copy");
  if (!label || !input || !title || !copy) {
    return;
  }

  title.textContent = surface.type === "principal" ? "Principal Diagnostics" : "Executor Diagnostics";
  label.textContent =
    surface.type === "principal"
      ? `Query ${surface.name}`
      : `Query ${surface.name}`;
  input.placeholder = surface.placeholder;
  copy.textContent =
    surface.type === "principal"
      ? "The principal AI is the center of the system: treasury, market intents, and dispatch policy all start here."
      : `${surface.name} is a secondary executor. It only exists to serve capital decisions made by synTAOsis Core.`;

  mountConsoleSurfaceSwitcher();
  mountPromptChips(surface);
  ensureSurfaceIntro();
  rerenderChatLog();
  setChatBusy(false, surface.status);
}

function mountExecutionCohort() {
  const container = document.querySelector("#cohort-grid");
  if (!container) {
    return;
  }

  const snapshot = getSystemSnapshot();
  container.innerHTML = "";

  const article = createEl("article", "detail-card detail-card--wide");
  article.append(createEl("p", "snapshot-card__label", "Execution Cohort"));
  article.append(
    createEl(
      "h3",
      "",
      "Secondary services remain available to Core, but only after an intent exists."
    )
  );

  const list = document.createElement("ul");
  list.className = "clean-list";
  getAgents().forEach((agent) => {
    const li = document.createElement("li");
    const preferred = agent.id === snapshot.selectedExecutorId ? "Leading for launch." : "Secondary for now.";
    li.textContent = `${agent.name} — ${agent.cohortBody}. ${preferred}`;
    list.append(li);
  });

  article.append(list);
  container.append(article);
}

function renderSelectedExecutor() {
  const agent = getSelectedAgent();
  if (!agent) {
    return;
  }

  const snapshot = getSystemSnapshot();
  mountCoreShellState();
  mountCoreHeroState();
  const agentName = document.querySelector("#agent-name");
  const agentTagline = document.querySelector("#agent-tagline");
  const agentDescription = document.querySelector("#agent-description");
  const agentVerification = document.querySelector("#agent-verification");
  if (!agentName || !agentTagline || !agentDescription || !agentVerification) {
    return;
  }
  agentName.textContent = agent.name;
  agentTagline.textContent =
    agent.id === snapshot.selectedExecutorId
      ? `Leading launch candidate for ${snapshot.activeIntent?.title ?? "the current wedge"}`
      : `Secondary execution candidate for ${snapshot.activeIntent?.title ?? "future launch phases"}`;
  agentDescription.textContent = `${agent.description} This surface is still under evaluation and remains clearly secondary to the principal system.`;
  agentVerification.textContent = "Under evaluation";

  mountExecutorMetrics(agent);
  mountExecutionCohort();
}

async function submitChat(message) {
  const agent = getSelectedAgent();
  const surface = getActiveSurface();
  if (!surface || appState.busy) {
    return;
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return;
  }

  const messages = getMessagesForCurrentSurface();
  messages.push({
    role: "user",
    content: trimmed,
    meta: {
      surfaceName: surface.name,
    },
  });
  rerenderChatLog();

  setChatBusy(
    true,
    surface.type === "principal"
      ? "Routing the request through the principal control surface..."
      : `Routing the request through ${surface.name}...`
  );

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetType: surface.type,
        agentId: agent?.id,
        message: trimmed,
        messages: messages.map((messageItem) => ({
          role: messageItem.role,
          content: messageItem.content,
        })),
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      if (payload.state) {
        setPersistedState(payload.state);
        renderSelectedExecutor();
      }
      throw new Error(payload.error || "Request failed");
    }

    messages.push({
      role: "assistant",
      content: payload.reply,
      meta: {
        filtered: payload.filtered,
        provider: payload.provider,
        surfaceName: surface.name,
      },
    });
    if (payload.state) {
      setPersistedState(payload.state);
    }
    rerenderChatLog();
    renderSelectedExecutor();

    let statusText;
    if (payload.filtered) {
      statusText =
        surface.type === "principal"
          ? "Principal identity question intercepted on the server."
          : `${surface.name} identity question intercepted on the server.`;
    } else if (payload.provider === "MiniMax") {
      statusText =
        surface.type === "principal"
          ? "synTAOsis Core replied through the MiniMax proxy route."
          : `${surface.name} replied through the MiniMax proxy route.`;
    } else if (payload.provider === "local-fallback") {
      statusText =
        surface.type === "principal"
          ? "synTAOsis Core used the local fallback because the provider is unavailable."
          : `${surface.name} used the local fallback because the provider is unavailable.`;
    } else {
      statusText =
        surface.type === "principal"
          ? "synTAOsis Core replied through local mock mode."
          : `${surface.name} replied through local mock mode.`;
    }

    setChatBusy(false, statusText);
  } catch (error) {
    const text = error instanceof Error ? error.message : "Unknown chat error";
    messages.push({
      role: "assistant",
      content: `synTAOsis local server hit an error for ${surface.name}: ${text}`,
      meta: {
        surfaceName: surface.name,
      },
    });
    rerenderChatLog();
    setChatBusy(false, `${surface.name} could not complete that request.`);
  }
}

function mountChat() {
  const form = document.querySelector("#chat-form");
  const input = document.querySelector("#chat-input");
  if (!form || !input) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    await submitChat(value);
    input.focus();
  });
}

function mountTreasuryFlow() {
  const buttons = document.querySelectorAll(".deposit-button");
  if (!buttons.length) {
    return;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const amount = Number(button.dataset.amount || "0");
      try {
        const response = await fetch("/api/deposit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Deposit failed");
        }
        if (payload.state) {
          setPersistedState(payload.state);
        }
        renderSelectedExecutor();
        const agent = getSelectedAgent();
        setChatBusy(
          false,
          `Deposited ${formatTao(amount)} into treasury. ${agent?.name ?? "The selected executor"} is now eligible for capital allocation under the active intent.`
        );
      } catch (error) {
        const text = error instanceof Error ? error.message : "Unknown deposit error";
        setChatBusy(false, `Deposit failed: ${text}`);
      }
    });
  });

  renderTreasuryState();
}

async function loadConfig() {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error("Failed to load config");
  }
  return response.json();
}

async function loadState() {
  const response = await fetch("/api/state");
  if (!response.ok) {
    throw new Error("Failed to load persisted state");
  }
  return response.json();
}

function mountProduct() {
  const product = getProduct();

  document.querySelector("#product-thesis-copy").textContent = product.thesis;
  document.querySelector("#one-liner").textContent = product.oneLiner;

  mountStats(product.heroStats || []);
  mountList("#revenue-steps", product.revenueSteps || []);
  mountList("#must-have-list", product.mustHave || []);
  mountList("#hard-no-list", product.hardNo || []);
  mountList("#why-wedge-list", product.whyWedge || []);
  mountList("#metrics-list", product.metrics || []);
  mountList("#ranking-list", product.ranking || []);
  mountList("#chat-rules", product.chatRules || []);
  mountRoadmap(product.roadmap || []);
  mountCoreShellState();
  mountCoreHeroState();
  mountExecutionCohort();
}

async function init() {
  try {
    appState.config = await loadConfig();
    setPersistedState(await loadState());
    const firstAgent = getAgents()[0];
    const preferredExecutorId = getPreferredExecutorId();
    appState.selectedAgentId =
      getAgents().find((agent) => agent.id === preferredExecutorId)?.id ??
      firstAgent?.id ??
      null;

    mountProduct();
    mountAgentSwitcher();
    renderSelectedExecutor();
  } catch (error) {
    const text = error instanceof Error ? error.message : "Unknown init error";
    document.body.innerHTML = `<pre style="padding:24px;font-family:monospace;">Failed to boot synTAOsis console: ${text}</pre>`;
  }
}

init();
