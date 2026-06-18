const roles = {
  client: {
    title: "Client Login Interface",
    label: "USER INTERFACE",
    hero: "Client app login and personal wellness data",
    copy: "Shows how a client logs in and accesses their subscription, diet, progress, support chat and sessions from the app backend.",
    email: "user@yoga.test",
    password: "User@123",
    loginPath: "/api/v1/auth/login/user",
    cards: ["Client Login", "Subscription", "Diet Progress", "Support Chat"]
  },
  trainer: {
    title: "Trainer Panel Interface",
    label: "TRAINER INTERFACE",
    hero: "Trainer sessions, assigned users and performance analytics",
    copy: "Shows trainer-side backend APIs for assigned users, live sessions, attendance and trainer analytics.",
    email: "trainer@yoga.test",
    password: "Trainer@123",
    loginPath: "/api/v1/auth/login/staff",
    cards: ["Trainer Login", "Assigned Users", "Live Sessions", "Analytics"]
  },
  dietician: {
    title: "Dietician Panel Interface",
    label: "DIETICIAN INTERFACE",
    hero: "Diet plans, weekly diet and compliance tracking",
    copy: "Shows dietician-side backend APIs for diet plan visibility, compliance entries and user progress data.",
    email: "dietician@yoga.test",
    password: "Dietician@123",
    loginPath: "/api/v1/auth/login/staff",
    cards: ["Dietician Login", "Diet Plans", "Compliance", "Progress"]
  },
  support: {
    title: "Support Panel Interface",
    label: "SUPPORT INTERFACE",
    hero: "Human chat support, tickets and issue history",
    copy: "Shows support-side backend APIs for chat assistance, tickets, user issue history and notification delivery logs.",
    email: "support@yoga.test",
    password: "Support@123",
    loginPath: "/api/v1/auth/login/staff",
    cards: ["Support Login", "Chat", "Tickets", "Issue History"]
  }
};

let active = location.hash.replace("#", "") || "client";
let token = "";
let user = null;
let demoUserId = "";
const cache = {};

const els = {
  title: document.getElementById("pageTitle"),
  roleLabel: document.getElementById("roleLabel"),
  heroTitle: document.getElementById("heroTitle"),
  heroCopy: document.getElementById("heroCopy"),
  form: document.getElementById("loginForm"),
  cards: document.getElementById("cards"),
  actions: document.getElementById("actions"),
  actionsTitle: document.getElementById("actionsTitle"),
  log: document.getElementById("logBox"),
  health: document.getElementById("healthStatus"),
  refresh: document.getElementById("refreshBtn")
};

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

function setRole(next) {
  active = roles[next] ? next : "client";
  const role = roles[active];
  location.hash = active;
  token = "";
  user = null;
  document.querySelectorAll("nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === active);
  });
  els.title.textContent = role.title;
  els.roleLabel.textContent = role.label;
  els.heroTitle.textContent = role.hero;
  els.heroCopy.textContent = role.copy;
  els.form.email.value = role.email;
  els.form.password.value = role.password;
  els.actionsTitle.textContent = `${role.title} actions`;
  els.cards.innerHTML = role.cards.map((label) => `
    <article class="card">
      <small>${label}</small>
      <strong>-</strong>
    </article>
  `).join("");
  renderActions();
  write(`${role.title} ready. Click login to load backend data.`);
}

function setCard(index, value) {
  const card = els.cards.querySelectorAll(".card strong")[index];
  if (card) card.textContent = value;
}

function renderActions() {
  const labels = {
    client: [
      ["Load Client Data", loadClient],
      ["Create Progress Entry", createProgress],
      ["Send Support Chat", sendClientChat],
      ["List Sessions", listSessions]
    ],
    trainer: [
      ["Assigned Users", trainerUsers],
      ["Trainer Analytics", trainerAnalytics],
      ["Create Live Session", createTrainerSession],
      ["List Sessions", listSessions]
    ],
    dietician: [
      ["Load Diet Plans", loadDietPlans],
      ["Load Compliance", loadCompliance],
      ["Load Progress", loadProgress],
      ["Create Diet Plan", createDietPlan]
    ],
    support: [
      ["List Tickets", listTickets],
      ["Create Support Reply", supportReply],
      ["User Issue History", issueHistory],
      ["Delivery Logs", deliveryLogs]
    ]
  }[active];

  els.actions.innerHTML = "";
  labels.forEach(([label, fn]) => {
    const button = document.createElement("button");
    button.textContent = label;
    button.addEventListener("click", () => run(fn));
    els.actions.appendChild(button);
  });
}

async function login(event) {
  event.preventDefault();
  const role = roles[active];
  const data = await api(role.loginPath, {
    method: "POST",
    body: JSON.stringify({ email: els.form.email.value, password: els.form.password.value })
  });
  token = data.token;
  user = data.user;
  cache[active] = { token, user };
  setCard(0, "Logged In");
  write(`${role.title} login successful`, { name: user.name, role: user.role });
  await run(defaultLoader());
}

function defaultLoader() {
  return { client: loadClient, trainer: trainerAnalytics, dietician: loadDietPlans, support: listTickets }[active];
}

async function run(fn) {
  if (!token && fn !== checkHealth) {
    write("Login required first.");
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
  write("Health check passed", data);
}

async function loadClient() {
  const subscription = await api("/api/v1/subscriptions/me");
  const diet = await api("/api/v1/diet/plans/me");
  const progress = await api("/api/v1/diet/progress");
  const chat = await api("/api/v1/support/chat/me");
  setCard(1, subscription.subscription ? "Active" : "Checked");
  setCard(2, `${progress.entries?.length || 0} logs`);
  setCard(3, `${chat.messages?.length || 0} chats`);
  write("Client data loaded", { dietPlans: diet.plans?.length || 0, progress: progress.entries?.length || 0, chat: chat.messages?.length || 0 });
}

async function createProgress() {
  const data = await api("/api/v1/diet/progress", {
    method: "POST",
    body: JSON.stringify({ weightKg: 67.5, energyLevel: 8, sleepHours: 7, notes: "Client interface demo progress" })
  });
  write("Client progress saved", data.entry);
  await loadClient();
}

async function sendClientChat() {
  const data = await api("/api/v1/support/chat", {
    method: "POST",
    body: JSON.stringify({ message: "Client needs help with the wellness schedule." })
  });
  write("Client support chat saved", data.message);
  await loadClient();
}

async function listSessions() {
  const data = await api("/api/v1/sessions");
  setCard(active === "trainer" ? 2 : 3, `${data.sessions?.length || 0} sessions`);
  write("Sessions fetched", { sessions: data.sessions?.length || 0 });
}

async function trainerUsers() {
  const data = await api("/api/v1/sessions/trainer/users");
  setCard(1, `${data.users?.length || 0} users`);
  write("Trainer assigned users fetched", data);
}

async function trainerAnalytics() {
  const data = await api("/api/v1/sessions/trainer/analytics");
  setCard(3, `${data.totalSessions || 0} sessions`);
  write("Trainer analytics fetched", data);
}

async function createTrainerSession() {
  const data = await api("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify({
      title: `Trainer Demo Session ${Date.now()}`,
      category: "Fertility Yoga",
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      durationMin: 30
    })
  });
  setCard(2, "Created");
  write("Trainer live session created", data.session);
}

async function loadDietPlans() {
  const data = await api("/api/v1/diet/plans/me");
  setCard(1, `${data.plans?.length || 0} plans`);
  write("Diet plans fetched", data);
}

async function loadCompliance() {
  const query = active === "client" ? "" : `?userId=${encodeURIComponent(await getDemoUserId())}`;
  const data = await api(`/api/v1/diet/compliance${query}`);
  setCard(2, `${data.entries?.length || 0} logs`);
  write("Diet compliance fetched", data);
}

async function loadProgress() {
  const query = active === "client" ? "" : `?userId=${encodeURIComponent(await getDemoUserId())}`;
  const data = await api(`/api/v1/diet/progress${query}`);
  setCard(3, `${data.entries?.length || 0} logs`);
  write("Progress entries fetched", data);
}

async function getDemoUserId() {
  if (demoUserId) return demoUserId;
  const client = await api("/api/v1/auth/login/user", {
    method: "POST",
    body: JSON.stringify({ email: "user@yoga.test", password: "User@123" })
  });
  demoUserId = client.user.id;
  return demoUserId;
}

async function createDietPlan() {
  const userId = await getDemoUserId();
  const data = await api("/api/v1/diet/plans", {
    method: "POST",
    body: JSON.stringify({
      userId,
      title: `Weekly Diet Demo ${Date.now()}`,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      meals: [{ dayOfWeek: 1, mealType: "breakfast", title: "Protein breakfast and fruit", calories: 350 }]
    })
  });
  setCard(1, "Created");
  write("Dietician weekly diet plan created", data.plan);
}

async function listTickets() {
  const data = await api("/api/v1/support/tickets");
  setCard(2, `${data.tickets?.length || 0} tickets`);
  write("Support tickets fetched", data);
}

async function supportReply() {
  const userId = await getDemoUserId();
  const data = await api("/api/v1/support/chat", {
    method: "POST",
    body: JSON.stringify({ userId, message: "Support team replied from support interface demo." })
  });
  setCard(1, "Replied");
  write("Support reply saved", data.message);
}

async function issueHistory() {
  const userId = await getDemoUserId();
  const data = await api(`/api/v1/support/users/${userId}/history`);
  setCard(3, "Loaded");
  write("User issue history fetched", data);
}

async function deliveryLogs() {
  const data = await api("/api/v1/notifications/delivery-logs");
  setCard(3, `${data.logs?.length || 0} logs`);
  write("Notification delivery logs fetched", data);
}

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => setRole(button.dataset.panel));
});
els.form.addEventListener("submit", login);
els.refresh.addEventListener("click", () => run(checkHealth));
window.addEventListener("hashchange", () => setRole(location.hash.replace("#", "")));

setRole(active);
run(checkHealth);
