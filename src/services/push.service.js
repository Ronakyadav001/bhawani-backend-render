const { env } = require("../config/env");

function isPushConfigured() {
  return Boolean(env.FCM_PROJECT_ID);
}

async function sendPushNotification({ token, title, message, metadata }) {
  if (!isPushConfigured() || !token) {
    return { sent: false, reason: "FCM_NOT_CONFIGURED_OR_TOKEN_MISSING" };
  }

  // Firebase Admin SDK credentials are intentionally not bundled in this repo.
  // Wire this function to firebase-admin when service credentials are provided.
  return {
    sent: false,
    reason: "FCM_ADAPTER_READY_NEEDS_SERVICE_CREDENTIALS",
    payload: { token, title, message, metadata }
  };
}

module.exports = { isPushConfigured, sendPushNotification };
