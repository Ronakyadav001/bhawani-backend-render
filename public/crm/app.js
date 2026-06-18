const state = {
  token: localStorage.getItem("crmToken") || "",
  user: JSON.parse(localStorage.getItem("crmUser") || "null")
};

const els = {
  apiStatus: document.getElementById("apiStatus"),
  loginForm: document.getElementById("loginForm"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginPanel: document.getElementById("loginPanel"),
  sessionStatus: document.getElementById("sessionStatus"),
  refreshBtn: document.getElementById("refreshBtn"),
  createTestLead: document.getElementById("createTestLead"),
  leadForm: document.getElementById("leadForm"),
  statusFilter: document.getElementById("statusFilter"),
  totalUsers: document.getElementById("totalUsers"),
  totalLeads: document.getElementById("totalLeads"),
  conversionRate: document.getElementById("conversionRate"),
  revenue: document.getElementById("revenue"),
  leadRows: document.getElementById("leadRows"),
  blogForm: document.getElementById("blogForm"),
  blogRows: document.getElementById("blogRows"),
  blogStatusFilter: document.getElementById("blogStatusFilter"),
  logBox: document.getElementById("logBox")
};

function log(message, payload) {
  const time = new Date().toLocaleTimeString();
  const extra = payload ? `\n${JSON.stringify(payload, null, 2)}` : "";
  els.logBox.textContent = `[${time}] ${message}${extra}\n\n${els.logBox.textContent}`;
}

function setStatus(message, healthy = false) {
  els.apiStatus.textContent = message;
  els.apiStatus.className = healthy ? "healthy" : "";
}

function refreshLabel(message) {
  const time = new Date().toLocaleTimeString();
  setStatus(`${message} · refreshed at ${time}`, true);
}

function setSessionUi() {
  const button = els.loginForm.querySelector("button");
  const fields = els.loginForm.querySelectorAll("input");

  if (state.token && state.user) {
    els.loginPanel.classList.add("logged-in");
    els.sessionStatus.textContent = `Logged in as ${state.user.name || state.user.email || "Admin"} (${state.user.role || "STAFF"})`;
    button.disabled = true;
    button.textContent = "Logged in";
    fields.forEach((field) => {
      field.disabled = true;
    });
    els.logoutBtn.classList.remove("hidden");
    return;
  }

  els.loginPanel.classList.remove("logged-in");
  els.sessionStatus.textContent = "Not logged in";
  button.disabled = false;
  button.textContent = "Login to CRM";
  fields.forEach((field) => {
    field.disabled = false;
  });
  els.logoutBtn.classList.add("hidden");
}

function clearProtectedData() {
  els.totalUsers.textContent = "-";
  els.totalLeads.textContent = "-";
  els.conversionRate.textContent = "-";
  els.revenue.textContent = "-";
  els.leadRows.innerHTML = '<tr><td colspan="7">Login to load leads.</td></tr>';
  els.blogRows.innerHTML = '<tr><td colspan="4">Login to load blogs.</td></tr>';
}

function clearAuthOnly() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("crmToken");
  localStorage.removeItem("crmUser");
}

function logout() {
  clearAuthOnly();
  setSessionUi();
  clearProtectedData();
  setStatus("Logged out · ready for fresh login");
  log("CRM logout successful");
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }

  return payload.data || payload;
}

async function checkHealth() {
  try {
    const data = await api("/health");
    const dbStatus = data.data?.database || data.database || "unknown";
    setStatus(dbStatus === "connected" ? "API + DB healthy" : "API online", true);
    log("Health check passed", { database: dbStatus });
  } catch (error) {
    setStatus("API offline");
    log(error.message);
  }
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const button = event.target.querySelector("button");
  button.disabled = true;
  button.textContent = "Logging in...";

  try {
    const data = await api("/api/v1/auth/login/staff", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password")
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("crmToken", state.token);
    localStorage.setItem("crmUser", JSON.stringify(state.user));
    setSessionUi();
    log("CRM login successful", { name: data.user.name, role: data.user.role });
    loadCrm().catch((loadError) => {
      log(`CRM data load warning after login: ${loadError.message}`);
    });
  } catch (error) {
    log(`Login failed: ${error.message}`);
    clearAuthOnly();
    setSessionUi();
  }
}

async function refreshCrm() {
  els.refreshBtn.disabled = true;
  els.refreshBtn.textContent = "Refreshing...";
  try {
    await checkHealth();
    if (state.token) {
      await loadCrm();
      refreshLabel("API + DB healthy");
      log("CRM refreshed successfully");
    } else {
      clearProtectedData();
      refreshLabel("API online");
      log("Refresh completed. Login required to load protected CRM data.");
    }
  } catch (error) {
    log(`Refresh failed: ${error.message}`);
  } finally {
    els.refreshBtn.disabled = false;
    els.refreshBtn.textContent = "Refresh";
  }
}

async function loadCrm() {
  if (!state.token) {
    els.leadRows.innerHTML = '<tr><td colspan="7">Login to load leads.</td></tr>';
    return;
  }

  const loaders = [
    ["Dashboard", loadDashboard],
    ["Analytics", loadAnalytics],
    ["Leads", loadLeads],
    ["Blogs", loadBlogs]
  ];
  const results = await Promise.allSettled(loaders.map(([, loader]) => loader()));
  const failed = results
    .map((result, index) => ({ result, label: loaders[index][0] }))
    .filter(({ result }) => result.status === "rejected");

  if (failed.length) {
    failed.forEach(({ result, label }) => log(`${label} load failed: ${result.reason.message}`));
    refreshLabel(`CRM partially loaded (${loaders.length - failed.length}/${loaders.length})`);
    return;
  }

  refreshLabel("API + DB healthy");
}

async function loadBlogs() {
  if (!state.token) {
    els.blogRows.innerHTML = '<tr><td colspan="4">Login to load blogs.</td></tr>';
    return;
  }

  const status = els.blogStatusFilter.value;
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await api(`/api/v1/blogs/admin${query}`);
  const blogs = data.blogs || [];

  if (!blogs.length) {
    els.blogRows.innerHTML = '<tr><td colspan="4">No blogs found.</td></tr>';
    return;
  }

  els.blogRows.innerHTML = blogs.map((blog) => `
    <tr>
      <td>${escapeHtml(blog.title || "-")}</td>
      <td>${escapeHtml(blog.category || "-")}</td>
      <td><span class="badge">${escapeHtml(blog.status || "DRAFT")}</span></td>
      <td>${new Date(blog.updatedAt).toLocaleString()}</td>
    </tr>
  `).join("");
}

async function saveBlog(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const button = event.target.querySelector("button");
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    const data = await api("/api/v1/blogs/admin", {
      method: "POST",
      body: JSON.stringify({
        title: form.get("title"),
        category: form.get("category"),
        status: form.get("status"),
        excerpt: form.get("excerpt"),
        content: form.get("content")
      })
    });

    log("Blog saved successfully", { title: data.blog.title, status: data.blog.status });
    event.target.reset();
    event.target.category.value = "Fertility";
    await loadBlogs();
  } catch (error) {
    log(`Blog save failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Save Blog";
  }
}

async function loadDashboard() {
  const data = await api("/api/v1/admin/dashboard");
  els.totalUsers.textContent = data.totalUsers ?? 0;
}

async function loadAnalytics() {
  const data = await api("/api/v1/admin/sales-analytics");
  els.totalLeads.textContent = data.leads ?? 0;
  els.conversionRate.textContent = `${data.conversionRate ?? 0}%`;
  els.revenue.textContent = `₹${Number(data.revenue || 0).toLocaleString("en-IN")}`;
}

async function loadLeads() {
  const status = els.statusFilter.value;
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await api(`/api/v1/leads${query}`);
  const leads = data.leads || [];

  if (!leads.length) {
    els.leadRows.innerHTML = '<tr><td colspan="7">No leads found.</td></tr>';
    return;
  }

  els.leadRows.innerHTML = leads.map((lead) => `
    <tr data-lead-id="${escapeHtml(lead.id)}">
      <td>${escapeHtml(lead.name || "-")}</td>
      <td>${escapeHtml(lead.phone || "-")}</td>
      <td>${escapeHtml(lead.concern || "-")}</td>
      <td><span class="badge">${escapeHtml(lead.source || "UNKNOWN")}</span></td>
      <td>
        <select class="lead-status" data-lead-id="${escapeHtml(lead.id)}">
          ${["NEW", "CONTACTED", "HOT", "COLD", "CONVERTED"].map((status) => (
            `<option value="${status}" ${status === (lead.status || "NEW") ? "selected" : ""}>${status}</option>`
          )).join("")}
        </select>
      </td>
      <td><button class="save-status" data-lead-id="${escapeHtml(lead.id)}">Update</button></td>
      <td>${new Date(lead.createdAt).toLocaleString()}</td>
    </tr>
  `).join("");
}

async function createManualLead(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  els.createTestLead.disabled = true;
  els.createTestLead.textContent = "Saving...";

  try {
    const data = await api("/api/v1/leads/website", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: "connect.bhawanifitness@gmail.com",
        source: "WEBSITE",
        intent: "BOOK_FREE_CONSULTATION",
        concern: form.get("concern"),
        journey: form.get("journey"),
        page: "/crm-test",
        metadata: { createdFrom: "CRM manual demo form" }
      })
    });

    log("Manual lead saved successfully", {
      name: data.lead.name,
      phone: data.lead.phone,
      concern: data.lead.concern,
      status: data.lead.status
    });
    if (state.token) {
      await loadCrm();
    } else {
      log("Lead was saved. Login is required to reload protected lead table.");
    }
  } catch (error) {
    log(`Lead save failed: ${error.message}`);
  } finally {
    els.createTestLead.disabled = false;
    els.createTestLead.textContent = "Save Lead to CRM";
  }
}

async function updateLeadStatus(leadId) {
  const select = document.querySelector(`.lead-status[data-lead-id="${CSS.escape(leadId)}"]`);
  const button = document.querySelector(`.save-status[data-lead-id="${CSS.escape(leadId)}"]`);
  if (!select || !button) return;

  button.disabled = true;
  button.textContent = "Saving...";
  try {
    const data = await api(`/api/v1/leads/${leadId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: select.value })
    });
    log("Lead status updated", { name: data.lead.name, status: data.lead.status });
    await loadAnalytics();
  } catch (error) {
    log(`Status update failed: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = "Update";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.loginForm.addEventListener("submit", login);
els.logoutBtn.addEventListener("click", logout);
els.refreshBtn.addEventListener("click", refreshCrm);
els.leadForm.addEventListener("submit", createManualLead);
els.leadRows.addEventListener("click", (event) => {
  if (event.target.classList.contains("save-status")) {
    updateLeadStatus(event.target.dataset.leadId);
  }
});
els.statusFilter.addEventListener("change", loadLeads);
els.blogForm.addEventListener("submit", saveBlog);
els.blogStatusFilter.addEventListener("change", loadBlogs);

setSessionUi();
checkHealth();
if (state.token) {
  loadCrm().catch((error) => log(`Auto-load failed: ${error.message}`));
}
