const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:5050";

async function request(path, options = {}, expectOk = true) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const json = await response.json().catch(() => ({}));

  if (expectOk && !response.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> ${response.status}: ${JSON.stringify(json)}`);
  }

  return { response, json };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password) {
  const { json } = await request("/api/v1/auth/login/user", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return json.data;
}

async function staffLogin(email, password) {
  const { json } = await request("/api/v1/auth/login/staff", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return json.data;
}

async function main() {
  console.log(`Smoke testing ${baseUrl}`);

  const health = await request("/health");
  console.log("health:", health.json.success);
  const appConfig = await request("/api/v1/app-config");
  console.log("app_config:", appConfig.json.data.auth.userLoginEndpoint === "/api/v1/auth/login/user");

  const user = await login("user@yoga.test", "User@123");
  const sales = await staffLogin("sales@yoga.test", "SalesAdmin@123");
  const trainer = await staffLogin("trainer@yoga.test", "Trainer@123");
  const dietician = await staffLogin("dietician@yoga.test", "Dietician@123");
  const support = await staffLogin("support@yoga.test", "Support@123");
  console.log("role_login:", true);

  const consent = await request("/api/v1/users/me/consents", {
    method: "POST",
    headers: auth(user.token),
    body: JSON.stringify({ type: "HEALTH_DATA", accepted: true, version: "1.0", source: "smoke-test" })
  });
  const privacyRequest = await request("/api/v1/users/me/privacy-requests", {
    method: "POST",
    headers: auth(user.token),
    body: JSON.stringify({ type: "DATA_EXPORT", reason: "Smoke test export request" })
  });
  await request(`/api/v1/users/privacy-requests/${privacyRequest.json.data.request.id}`, {
    method: "PATCH",
    headers: auth(support.token),
    body: JSON.stringify({ status: "COMPLETED", resolution: "Smoke test completed." })
  });
  const dataExport = await request("/api/v1/users/me/data-export", {
    headers: auth(user.token)
  });
  console.log("privacy_compliance:", consent.json.success && privacyRequest.json.success && dataExport.json.data.user.id === user.user.id);

  const payments = await request("/api/v1/subscriptions/payments", {
    headers: auth(sales.token)
  });
  const subscriptions = await request("/api/v1/subscriptions/admin", {
    headers: auth(sales.token)
  });
  const mySubscription = await request("/api/v1/subscriptions/me", {
    headers: auth(user.token)
  });
  console.log("finance_payments:", payments.json.success);
  console.log("admin_subscriptions:", subscriptions.json.success);
  console.log("premium_subscription_check:", mySubscription.json.success);

  const lead = await request("/api/v1/leads", {
    method: "POST",
    headers: auth(sales.token),
    body: JSON.stringify({
      name: `Smoke Lead ${Date.now()}`,
      phone: `98${String(Date.now()).slice(-8)}`,
      email: `lead${Date.now()}@example.com`,
      source: "Smoke Test"
    })
  });
  console.log("lead:", lead.json.success);

  const call = await request("/api/v1/onboarding-calls", {
    method: "POST",
    headers: auth(sales.token),
    body: JSON.stringify({
      userId: user.user.id,
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      meetingLink: "https://meet.google.com/demo-yoga-call"
    })
  });
  await request(`/api/v1/onboarding-calls/${call.json.data.call.id}`, {
    method: "PATCH",
    headers: auth(sales.token),
    body: JSON.stringify({ status: "COMPLETED" })
  });
  console.log("onboarding:", true);

  const assignment = await request("/api/v1/diet/assignments", {
    method: "POST",
    headers: auth(sales.token),
    body: JSON.stringify({ userId: user.user.id, dieticianId: dietician.user.id })
  });
  console.log("dietician_assignment:", assignment.json.success);

  const dietPlan = await request("/api/v1/diet/plans", {
    method: "POST",
    headers: auth(dietician.token),
    body: JSON.stringify({
      userId: user.user.id,
      title: `Smoke Diet Plan ${Date.now()}`,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      meals: [{ dayOfWeek: 1, mealType: "breakfast", title: "Oats and fruit", calories: 350 }]
    })
  });
  console.log("diet_plan:", dietPlan.json.data.plan.meals.length);

  const compliance = await request("/api/v1/diet/compliance", {
    method: "POST",
    headers: auth(user.token),
    body: JSON.stringify({
      dietPlanId: dietPlan.json.data.plan.id,
      followed: true,
      mealsFollowed: 1,
      notes: "Smoke compliance entry"
    })
  });
  const progress = await request("/api/v1/diet/progress", {
    method: "POST",
    headers: auth(user.token),
    body: JSON.stringify({
      weightKg: 67.5,
      energyLevel: 8,
      sleepHours: 7,
      notes: "Smoke progress entry"
    })
  });
  console.log("diet_compliance_progress:", compliance.json.success && progress.json.success);

  const session = await request("/api/v1/sessions", {
    method: "POST",
    headers: auth(trainer.token),
    body: JSON.stringify({
      title: `Smoke Zoom Yoga ${Date.now()}`,
      category: "Beginner",
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      durationMin: 30
    })
  });
  await request(`/api/v1/sessions/${session.json.data.session.id}/join`, {
    method: "POST",
    headers: auth(user.token)
  });
  console.log("zoom_session_attendance:", session.json.data.zoomConfigured);

  const trainerUsers = await request("/api/v1/sessions/trainer/users", { headers: auth(trainer.token) });
  const trainerAnalytics = await request("/api/v1/sessions/trainer/analytics", { headers: auth(trainer.token) });
  console.log("trainer_panel:", trainerUsers.json.success && trainerAnalytics.json.success);

  const chat = await request("/api/v1/support/chat", {
    method: "POST",
    headers: auth(user.token),
    body: JSON.stringify({ message: "I need help with my yoga schedule." })
  });
  await request("/api/v1/support/chat", {
    method: "POST",
    headers: auth(support.token),
    body: JSON.stringify({
      userId: user.user.id,
      message: "Support team will help with your yoga schedule."
    })
  });
  console.log("chat_assistance:", chat.json.data.message.senderType);

  const ticket = await request("/api/v1/support/tickets", {
    method: "POST",
    headers: auth(user.token),
    body: JSON.stringify({
      subject: "Smoke ticket",
      description: "Need support assistance.",
      priority: "NORMAL"
    })
  });
  await request(`/api/v1/support/tickets/${ticket.json.data.ticket.id}`, {
    method: "PATCH",
    headers: auth(support.token),
    body: JSON.stringify({ status: "RESOLVED", resolution: "Resolved in smoke test." })
  });
  const supportHistory = await request(`/api/v1/support/users/${user.user.id}/history`, {
    headers: auth(support.token)
  });
  const deliveryLogs = await request("/api/v1/notifications/delivery-logs", {
    headers: auth(support.token)
  });
  console.log("support_ticket:", true);
  console.log("support_history:", supportHistory.json.success);
  console.log("notification_delivery_logs:", deliveryLogs.json.success);

  const dashboard = await request("/api/v1/admin/dashboard", {
    headers: auth(sales.token)
  });
  const salesAnalytics = await request("/api/v1/admin/sales-analytics", {
    headers: auth(sales.token)
  });
  const complianceSummary = await request("/api/v1/admin/compliance-summary", {
    headers: auth(support.token)
  });
  console.log("admin_dashboard:", dashboard.json.success);
  console.log("sales_analytics:", salesAnalytics.json.success);
  console.log("compliance_summary:", complianceSummary.json.success);

  const forbidden = await request("/api/v1/leads", { headers: auth(user.token) }, false);
  console.log("rbac_forbidden:", forbidden.response.status === 403);

  console.log("SMOKE_TEST_PASS");
}

main().catch((error) => {
  console.error("SMOKE_TEST_FAIL");
  console.error(error);
  process.exit(1);
});
