const baseUrl = process.env.API_BASE_URL || "http://127.0.0.1:5050";

async function request(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email, password, path = "/api/v1/auth/login/staff") {
  const { response, json } = await request(path, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(json)}`);
  return json.data.token;
}

async function expectStatus(name, expectedStatus, path, options = {}) {
  const { response, json } = await request(path, options);
  if (response.status !== expectedStatus) {
    throw new Error(`${name} expected ${expectedStatus}, got ${response.status}: ${JSON.stringify(json)}`);
  }
  console.log(`${name}: ${response.status}`);
}

async function main() {
  console.log(`RBAC testing ${baseUrl}`);

  const tokens = {
    user: await login("user@yoga.test", "User@123", "/api/v1/auth/login/user"),
    sales: await login("sales@yoga.test", "SalesAdmin@123"),
    trainer: await login("trainer@yoga.test", "Trainer@123"),
    dietician: await login("dietician@yoga.test", "Dietician@123"),
    support: await login("support@yoga.test", "Support@123"),
    superAdmin: await login("superadmin@yoga.test", "SuperAdmin@123")
  };

  await expectStatus("user_cannot_list_leads", 403, "/api/v1/leads", { headers: auth(tokens.user) });
  await expectStatus("user_cannot_view_admin_payments", 403, "/api/v1/subscriptions/payments", { headers: auth(tokens.user) });
  await expectStatus("sales_cannot_create_session", 403, "/api/v1/sessions", {
    method: "POST",
    headers: auth(tokens.sales),
    body: JSON.stringify({
      title: "Blocked Session",
      category: "Beginner",
      startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      durationMin: 30
    })
  });
  await expectStatus("trainer_cannot_view_leads", 403, "/api/v1/leads", { headers: auth(tokens.trainer) });
  await expectStatus("trainer_cannot_create_diet_plan", 403, "/api/v1/diet/plans", {
    method: "POST",
    headers: auth(tokens.trainer),
    body: JSON.stringify({})
  });
  await expectStatus("dietician_cannot_view_admin_payments", 403, "/api/v1/subscriptions/payments", { headers: auth(tokens.dietician) });
  await expectStatus("dietician_cannot_view_sales_analytics", 403, "/api/v1/admin/sales-analytics", { headers: auth(tokens.dietician) });
  await expectStatus("support_cannot_create_session", 403, "/api/v1/sessions", {
    method: "POST",
    headers: auth(tokens.support),
    body: JSON.stringify({})
  });
  await expectStatus("support_cannot_view_trainer_analytics", 403, "/api/v1/sessions/trainer/analytics", { headers: auth(tokens.support) });
  await expectStatus("support_can_view_tickets", 200, "/api/v1/support/tickets", { headers: auth(tokens.support) });
  await expectStatus("user_cannot_view_delivery_logs", 403, "/api/v1/notifications/delivery-logs", { headers: auth(tokens.user) });
  await expectStatus("trainer_cannot_view_privacy_requests", 403, "/api/v1/users/privacy-requests", { headers: auth(tokens.trainer) });
  await expectStatus("sales_cannot_view_compliance_summary", 403, "/api/v1/admin/compliance-summary", { headers: auth(tokens.sales) });
  await expectStatus("support_can_view_compliance_summary", 200, "/api/v1/admin/compliance-summary", { headers: auth(tokens.support) });
  await expectStatus("super_admin_can_view_activity", 200, "/api/v1/admin/activity-logs", { headers: auth(tokens.superAdmin) });

  console.log("RBAC_TEST_PASS");
}

main().catch((error) => {
  console.error("RBAC_TEST_FAIL");
  console.error(error);
  process.exit(1);
});
