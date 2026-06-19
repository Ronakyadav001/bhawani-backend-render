const panels = {
  sales: {
    title: "Sales Team Panel",
    label: "Sales Operations",
    hero: "Lead, subscription and onboarding control",
    copy: "Manage enquiry flow, payment/subscription visibility, mandatory onboarding calls and conversion analytics from one admin view.",
    email: "sales@yoga.test",
    password: "SalesAdmin@123",
    cards: ["Total Leads", "Active Subscriptions", "Onboarding Calls", "Conversion Rate"],
    tableTitle: "Sales pipeline"
  },
  trainer: {
    title: "Yoga Trainer Panel",
    label: "Trainer Operations",
    hero: "Live classes, attendance and assigned users",
    copy: "Schedule live yoga sessions, manage session links, monitor attendance and review trainer-side performance analytics.",
    email: "trainer@yoga.test",
    password: "Trainer@123",
    cards: ["Total Sessions", "Upcoming Sessions", "Assigned Users", "Attendance Rate"],
    tableTitle: "Live session schedule"
  },
  dietician: {
    title: "Dietician Panel",
    label: "Diet Operations",
    hero: "Diet plans, compliance and progress monitoring",
    copy: "Create personalized diet plans, update meal schedules, monitor compliance and track user wellness progress.",
    email: "dietician@yoga.test",
    password: "Dietician@123",
    cards: ["Assigned Plans", "Compliance Logs", "Progress Entries", "Compliance Rate"],
    tableTitle: "Diet and progress records"
  },
  support: {
    title: "Support Team Panel",
    label: "Support Operations",
    hero: "Tickets, chat escalation and issue history",
    copy: "Handle user issues, review chat escalations, manage tickets and track resolution history from support workflows.",
    email: "support@yoga.test",
    password: "Support@123",
    cards: ["Open Tickets", "Resolved Tickets", "Chat Messages", "Issue History"],
    tableTitle: "Support queue"
  }
};

let active = location.hash.replace("#", "") || "sales";
let token = "";
let user = null;
let demoUserId = "";
let demoDieticianId = "";
let lastDietPlanId = "";
let lastSessionId = "";
let lastTicketId = "";

const els = {
  title: document.getElementById("pageTitle"),
  roleLabel: document.getElementById("roleLabel"),
  heroTitle: document.getElementById("heroTitle"),
  heroCopy: document.getElementById("heroCopy"),
  form: document.getElementById("loginForm"),
  cards: document.getElementById("cards"),
  actions: document.getElementById("actions"),
  actionsTitle: document.getElementById("actionsTitle"),
  tableTitle: document.getElementById("tableTitle"),
  tableHead: document.getElementById("tableHead"),
  tableBody: document.getElementById("tableBody"),
  loginState: document.getElementById("loginState"),
  log: document.getElementById("logBox"),
  health: document.getElementById("healthStatus"),
  refresh: document.getElementById("refreshBtn")
};

function safe(value, fallback = "-") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function write(message, payload) {
  const extra = payload ? `\n${JSON.stringify(payload, null, 2)}` : "";
  els.log.textContent = `[${new Date().toLocaleTimeString()}] ${message}${extra}\n\n${els.log.textContent}`;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Request failed ${res.status}`);
  return json.data || json;
}

function setPanel(next) {
  active = panels[next] ? next : "sales";
  const panel = panels[active];
  if (location.hash.replace("#", "") !== active) {
    location.hash = active;
  }
  token = "";
  user = null;
  lastDietPlanId = "";
  lastSessionId = "";
  lastTicketId = "";

  document.querySelectorAll("nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === active);
  });

  els.title.textContent = panel.title;
  els.roleLabel.textContent = panel.label;
  els.heroTitle.textContent = panel.hero;
  els.heroCopy.textContent = panel.copy;
  els.form.email.value = panel.email;
  els.form.password.value = panel.password;
  els.actionsTitle.textContent = `${panel.title} Actions`;
  els.tableTitle.textContent = panel.tableTitle;
  els.loginState.textContent = "Not logged in";
  els.loginState.className = "pill";
  els.cards.innerHTML = panel.cards.map((label) => `
    <article class="card">
      <small>${label}</small>
      <strong>-</strong>
    </article>
  `).join("");
  renderActions();
  setRows(["Area", "Status", "Owner", "Next Step"], [
    ["Login", "Pending", panel.title, "Use demo credentials"],
    ["Backend", "Live API", "Node + PostgreSQL", "Run panel actions"]
  ]);
  write(`${panel.title} ready. Login to load role-specific backend data.`);
}

function setCard(index, value) {
  const card = els.cards.querySelectorAll(".card strong")[index];
  if (card) card.textContent = value;
}

function setRows(headers, rows) {
  els.tableHead.innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;
  els.tableBody.innerHTML = rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${safe(cell)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">No records available yet.</td></tr>`;
}

function renderActions() {
  const actions = {
    sales: [
      ["Load Sales Dashboard", loadSalesDashboard],
      ["Create Lead", createLead],
      ["Schedule Onboarding", scheduleOnboarding],
      ["View Payments", viewPayments]
    ],
    trainer: [
      ["Load Trainer Dashboard", loadTrainerDashboard],
      ["Create Live Session", createTrainerSession],
      ["View Assigned Users", trainerUsers],
      ["Attendance Report", attendanceReport]
    ],
    dietician: [
      ["Load Diet Dashboard", loadDietDashboard],
      ["Create Diet Plan", createDietPlan],
      ["Record Compliance", recordCompliance],
      ["Record Progress", recordProgress]
    ],
    support: [
      ["Load Support Queue", loadSupportQueue],
      ["Create Demo Ticket", createDemoTicket],
      ["Send Support Reply", supportReply],
      ["Issue History", issueHistory]
    ]
  }[active];

  els.actions.innerHTML = "";
  actions.forEach(([label, fn]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => run(fn));
    els.actions.appendChild(button);
  });
}

async function login(event) {
  event.preventDefault();
  const panel = panels[active];
  const data = await api("/api/v1/auth/login/staff", {
    method: "POST",
    body: JSON.stringify({ email: els.form.email.value, password: els.form.password.value })
  });
  token = data.token;
  user = data.user;
  if (user.role === "DIETICIAN") demoDieticianId = user.id;
  els.loginState.textContent = `${user.name} - ${user.role}`;
  els.loginState.className = "pill is-live";
  write(`${panel.title} login successful`, { name: user.name, role: user.role });
  await run(defaultLoader());
}

function defaultLoader() {
  return {
    sales: loadSalesDashboard,
    trainer: loadTrainerDashboard,
    dietician: loadDietDashboard,
    support: loadSupportQueue
  }[active];
}

async function run(fn) {
  if (!token && fn !== checkHealth) {
    write("Login required before running panel actions.");
    return;
  }
  try {
    await fn();
  } catch (error) {
    write(`Action failed: ${error.message}`);
  }
}

async function checkHealth() {
  const data = await api("/health");
  els.health.textContent = `API + DB ${data.database}`;
  els.health.classList.toggle("is-live", data.database === "connected");
  write("Health check passed", data);
}

async function getDemoUserId() {
  if (demoUserId) return demoUserId;
  const currentToken = token;
  const client = await api("/api/v1/auth/login/user", {
    method: "POST",
    headers: {},
    body: JSON.stringify({ email: "user@yoga.test", password: "User@123" })
  });
  token = currentToken;
  demoUserId = client.user.id;
  return demoUserId;
}

async function getDemoDieticianId() {
  if (demoDieticianId) return demoDieticianId;
  const currentToken = token;
  const dietician = await api("/api/v1/auth/login/staff", {
    method: "POST",
    headers: {},
    body: JSON.stringify({ email: "dietician@yoga.test", password: "Dietician@123" })
  });
  token = currentToken;
  demoDieticianId = dietician.user.id;
  return demoDieticianId;
}

async function loadSalesDashboard() {
  const [analytics, leads, subscriptions, calls] = await Promise.all([
    api("/api/v1/admin/sales-analytics"),
    api("/api/v1/leads?limit=5"),
    api("/api/v1/subscriptions/admin?limit=5"),
    api("/api/v1/onboarding-calls?limit=5")
  ]);
  setCard(0, analytics.leads || 0);
  setCard(1, analytics.activeSubscriptions || 0);
  setCard(2, Object.values(analytics.onboardingByStatus || {}).reduce((sum, value) => sum + value, 0));
  setCard(3, `${analytics.conversionRate || 0}%`);
  setRows(["Lead", "Status", "Concern", "Created"], (leads.leads || []).map((lead) => [
    lead.name,
    lead.status,
    lead.concern,
    formatDate(lead.createdAt)
  ]));
  write("Sales dashboard loaded", {
    analytics,
    subscriptions: subscriptions.subscriptions?.length || 0,
    onboardingCalls: calls.calls?.length || 0
  });
}

async function createLead() {
  const data = await api("/api/v1/leads", {
    method: "POST",
    body: JSON.stringify({
      name: `Demo Lead ${new Date().toLocaleTimeString()}`,
      email: `lead${Date.now()}@example.com`,
      phone: "7726060202",
      source: "WEBSITE",
      status: "HOT",
      intent: "Subscription enquiry",
      concern: "Female Fertility",
      journey: "Website to Sales Team Panel",
      notes: "Created from Sales Team Panel demo."
    })
  });
  write("Lead created from Sales Team Panel", data.lead);
  await loadSalesDashboard();
}

async function scheduleOnboarding() {
  const userId = await getDemoUserId();
  const data = await api("/api/v1/onboarding-calls", {
    method: "POST",
    body: JSON.stringify({
      userId,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      meetingLink: "https://meet.google.com/demo-bhawani",
      notes: "Mandatory onboarding call scheduled from Sales Team Panel."
    })
  });
  write("Onboarding call scheduled", data.call);
  await loadSalesDashboard();
}

async function viewPayments() {
  const data = await api("/api/v1/subscriptions/payments?limit=8");
  setRows(["Client", "Plan", "Status", "Amount"], (data.payments || []).map((payment) => [
    payment.user?.name,
    payment.plan?.name,
    payment.status,
    `Rs ${Number(payment.amount || 0).toLocaleString("en-IN")}`
  ]));
  write("Payment history loaded", { payments: data.payments?.length || 0 });
}

async function loadTrainerDashboard() {
  const [analytics, sessions] = await Promise.all([
    api("/api/v1/sessions/trainer/analytics"),
    api("/api/v1/sessions")
  ]);
  const ownSessions = (sessions.sessions || []).filter((session) => session.trainer?.id === user.id);
  if (ownSessions[0]) lastSessionId = ownSessions[0].id;
  setCard(0, analytics.totalSessions || 0);
  setCard(1, analytics.upcomingSessions || 0);
  setCard(2, analytics.joined || 0);
  setCard(3, `${analytics.attendanceRate || 0}%`);
  setRows(["Session", "Category", "Status", "Start Time"], ownSessions.slice(0, 8).map((session) => [
    session.title,
    session.category,
    session.status,
    formatDate(session.startTime)
  ]));
  write("Trainer dashboard loaded", analytics);
}

async function createTrainerSession() {
  const data = await api("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      title: `Morning Yoga Demo ${new Date().toLocaleTimeString()}`,
      category: "Fertility Yoga",
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      durationMin: 45
    })
  });
  lastSessionId = data.session.id;
  write("Live yoga session created", data.session);
  await loadTrainerDashboard();
}

async function trainerUsers() {
  const data = await api("/api/v1/sessions/trainer/users");
  setCard(2, `${data.users?.length || 0}`);
  setRows(["Client", "Attended", "Missed", "Last Session"], (data.users || []).map((row) => [
    row.user?.name,
    row.sessionsAttended,
    row.sessionsMissed,
    row.lastSession?.title
  ]));
  write("Assigned users loaded", data);
}

async function attendanceReport() {
  if (!lastSessionId) await loadTrainerDashboard();
  if (!lastSessionId) {
    write("Create or seed a session before loading attendance.");
    return;
  }
  const data = await api(`/api/v1/sessions/${lastSessionId}/attendance`);
  setRows(["Client", "Status", "Duration", "Joined At"], (data.report || []).map((entry) => [
    entry.user?.name,
    entry.status,
    `${entry.durationAttended || 0} min`,
    formatDate(entry.joinedAt)
  ]));
  write("Attendance report loaded", data);
}

async function loadDietDashboard() {
  const userId = await getDemoUserId();
  const [plans, compliance, progress] = await Promise.all([
    api("/api/v1/diet/plans/me"),
    api(`/api/v1/diet/compliance?userId=${encodeURIComponent(userId)}`),
    api(`/api/v1/diet/progress?userId=${encodeURIComponent(userId)}`)
  ]);
  if (plans.plans?.[0]) lastDietPlanId = plans.plans[0].id;
  setCard(0, plans.plans?.length || 0);
  setCard(1, compliance.entries?.length || 0);
  setCard(2, progress.entries?.length || 0);
  setCard(3, `${compliance.summary?.complianceRate || 0}%`);
  setRows(["Plan", "Client", "Meals", "Active Till"], (plans.plans || []).map((plan) => [
    plan.title,
    plan.user?.name,
    plan.meals?.length || 0,
    formatDate(plan.endDate)
  ]));
  write("Dietician dashboard loaded", {
    plans: plans.plans?.length || 0,
    compliance: compliance.summary,
    progress: progress.entries?.length || 0
  });
}

async function createDietPlan() {
  const userId = await getDemoUserId();
  const data = await api("/api/v1/diet/plans", {
    method: "POST",
    body: JSON.stringify({
      userId,
      title: `Weekly Wellness Plan ${new Date().toLocaleTimeString()}`,
      description: "Personalized diet plan created from Dietician Panel.",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      meals: [
        { dayOfWeek: 1, mealType: "Breakfast", title: "Protein breakfast with fruit", calories: 350, proteinGrams: 22 },
        { dayOfWeek: 1, mealType: "Lunch", title: "Balanced roti, dal and salad plate", calories: 520, proteinGrams: 28 }
      ]
    })
  });
  lastDietPlanId = data.plan.id;
  write("Diet plan created", data.plan);
  await loadDietDashboard();
}

async function recordCompliance() {
  if (!lastDietPlanId) await loadDietDashboard();
  if (!lastDietPlanId) {
    write("Create a diet plan before recording compliance.");
    return;
  }
  const data = await api("/api/v1/diet/compliance", {
    method: "POST",
    body: JSON.stringify({
      userId: await getDemoUserId(),
      dietPlanId: lastDietPlanId,
      followed: true,
      mealsFollowed: 4,
      notes: "Compliance updated from Dietician Panel."
    })
  });
  write("Diet compliance recorded", data.entry);
  await loadDietDashboard();
}

async function recordProgress() {
  const data = await api("/api/v1/diet/progress", {
    method: "POST",
    body: JSON.stringify({
      userId: await getDemoUserId(),
      weightKg: 67.4,
      energyLevel: 8,
      sleepHours: 7,
      notes: "Progress entry recorded from Dietician Panel."
    })
  });
  write("Progress entry recorded", data.entry);
  await loadDietDashboard();
}

async function loadSupportQueue() {
  const userId = await getDemoUserId();
  const [tickets, history] = await Promise.all([
    api("/api/v1/support/tickets?limit=8"),
    api(`/api/v1/support/users/${encodeURIComponent(userId)}/history`)
  ]);
  if (tickets.tickets?.[0]) lastTicketId = tickets.tickets[0].id;
  const openTickets = (tickets.tickets || []).filter((ticket) => ["OPEN", "IN_PROGRESS"].includes(ticket.status)).length;
  const resolvedTickets = (tickets.tickets || []).filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  setCard(0, openTickets);
  setCard(1, resolvedTickets);
  setCard(2, history.chatMessages?.length || 0);
  setCard(3, `${history.summary?.totalTickets || 0} records`);
  setRows(["Ticket", "Client", "Status", "Priority"], (tickets.tickets || []).map((ticket) => [
    ticket.subject,
    ticket.user?.name,
    ticket.status,
    ticket.priority
  ]));
  write("Support queue loaded", { tickets: tickets.tickets?.length || 0, summary: history.summary });
}

async function createDemoTicket() {
  const currentToken = token;
  const client = await api("/api/v1/auth/login/user", {
    method: "POST",
    headers: {},
    body: JSON.stringify({ email: "user@yoga.test", password: "User@123" })
  });
  token = client.token;
  const data = await api("/api/v1/support/tickets", {
    method: "POST",
    body: JSON.stringify({
      subject: "AI chat escalation for schedule support",
      description: "Client query needs manual support review after chat assistance.",
      priority: "HIGH"
    })
  });
  token = currentToken;
  lastTicketId = data.ticket.id;
  write("Demo support ticket created", data.ticket);
  await loadSupportQueue();
}

async function supportReply() {
  const data = await api("/api/v1/support/chat", {
    method: "POST",
    body: JSON.stringify({
      userId: await getDemoUserId(),
      message: "Support team reviewed the escalation and replied from Support Team Panel."
    })
  });
  write("Support reply saved", data.message);
  await loadSupportQueue();
}

async function issueHistory() {
  const data = await api(`/api/v1/support/users/${encodeURIComponent(await getDemoUserId())}/history`);
  setRows(["Record", "Status", "Detail", "Created"], [
    ...(data.tickets || []).map((ticket) => ["Ticket", ticket.status, ticket.subject, formatDate(ticket.createdAt)]),
    ...(data.chatMessages || []).slice(0, 5).map((message) => ["Chat", message.senderType, message.message, formatDate(message.createdAt)])
  ]);
  write("User issue history loaded", data.summary);
}

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => setPanel(button.dataset.panel));
});
els.form.addEventListener("submit", login);
els.refresh.addEventListener("click", () => run(checkHealth));
window.addEventListener("hashchange", () => setPanel(location.hash.replace("#", "")));

setPanel(active);
run(checkHealth);
