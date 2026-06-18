const { env } = require("../config/env");

function isWhatsAppConfigured() {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

async function sendWhatsAppMessage({ phone, message }) {
  if (!isWhatsAppConfigured() || !phone) {
    return { sent: false, reason: "WHATSAPP_NOT_CONFIGURED_OR_PHONE_MISSING" };
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message }
    })
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: "WHATSAPP_REQUEST_FAILED", details: body };
  }

  return { sent: true, details: body };
}

module.exports = { isWhatsAppConfigured, sendWhatsAppMessage };
