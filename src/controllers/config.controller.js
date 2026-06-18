const { env } = require("../config/env");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const appConfig = asyncHandler(async (req, res) => {
  sendSuccess(res, "App configuration fetched", {
    support: {
      chatUrl: env.SUPPORT_CHAT_URL || null,
      hours: env.SUPPORT_HOURS,
      mode: "WEB_REDIRECT"
    },
    panels: {
      sales: env.SALES_PANEL_URL || null,
      trainer: env.TRAINER_PANEL_URL || null,
      dietician: env.DIETICIAN_PANEL_URL || null,
      support: env.SUPPORT_PANEL_URL || null
    },
    auth: {
      userLoginEndpoint: "/api/v1/auth/login/user",
      staffLoginEndpoint: "/api/v1/auth/login/staff"
    }
  });
});

module.exports = { appConfig };
