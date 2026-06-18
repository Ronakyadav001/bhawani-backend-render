const { prisma } = require("../config/database");
const { sendPushNotification } = require("./push.service");
const { sendWhatsAppMessage } = require("./whatsapp.service");

const RETRY_DELAY_MINUTES = 10;

function nextRetryDate() {
  return new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000);
}

function shouldRetry(result) {
  return !result.sent && !String(result.reason || "").includes("NOT_CONFIGURED");
}

function deliveryStatus(result, attempts, maxAttempts) {
  if (result.sent) return "SENT";
  if (String(result.reason || "").includes("NOT_CONFIGURED")) return "SKIPPED";
  return shouldRetry(result) && attempts < maxAttempts ? "PENDING" : "FAILED";
}

async function recordDeliveryAttempt({ notificationId, channel, provider, result, existingDelivery }) {
  const attempts = (existingDelivery?.attempts || 0) + 1;
  const maxAttempts = existingDelivery?.maxAttempts || 3;
  const status = deliveryStatus(result, attempts, maxAttempts);
  const data = {
    channel,
    provider,
    status,
    attempts,
    lastAttemptAt: new Date(),
    nextAttemptAt: status === "PENDING" ? nextRetryDate() : null,
    response: result.sent ? result.details || result.payload || result : undefined,
    error: result.sent ? null : result.reason || "DELIVERY_FAILED"
  };

  if (existingDelivery) {
    return prisma.notificationDelivery.update({
      where: { id: existingDelivery.id },
      data
    });
  }

  return prisma.notificationDelivery.create({
    data: { notificationId, maxAttempts, ...data }
  });
}

async function deliverNotification(notification, user, existingDelivery) {
  const shouldSendPush = notification.channel === "PUSH" || notification.channel === "IN_APP";
  const shouldSendWhatsApp = notification.channel === "WHATSAPP";
  const deliveries = [];

  if (shouldSendPush) {
    const result = await sendPushNotification({
      token: user?.fcmToken,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata
    });
    deliveries.push(await recordDeliveryAttempt({
      notificationId: notification.id,
      channel: "PUSH",
      provider: "FCM",
      result,
      existingDelivery: existingDelivery?.provider === "FCM" ? existingDelivery : undefined
    }));
  }

  if (shouldSendWhatsApp) {
    const result = await sendWhatsAppMessage({
      phone: user?.phone,
      message: `${notification.title}: ${notification.message}`
    });
    deliveries.push(await recordDeliveryAttempt({
      notificationId: notification.id,
      channel: "WHATSAPP",
      provider: "WHATSAPP_CLOUD",
      result,
      existingDelivery: existingDelivery?.provider === "WHATSAPP_CLOUD" ? existingDelivery : undefined
    }));
  }

  return deliveries;
}

async function createNotification({ userId, title, message, channel = "IN_APP", metadata }) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, channel, metadata }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true, phone: true }
  });

  const delivery = await deliverNotification(notification, user);

  return { ...notification, delivery };
}

async function notifyAdmins(roles, payload) {
  const admins = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true },
    select: { id: true }
  });

  await Promise.all(admins.map((admin) => createNotification({ userId: admin.id, ...payload })));
}

async function retryPendingDeliveries(now = new Date()) {
  const deliveries = await prisma.notificationDelivery.findMany({
    where: {
      status: "PENDING",
      attempts: { lt: 3 },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }]
    },
    include: {
      notification: {
        include: {
          user: { select: { fcmToken: true, phone: true } }
        }
      }
    },
    take: 100,
    orderBy: { createdAt: "asc" }
  });

  for (const delivery of deliveries) {
    await deliverNotification(delivery.notification, delivery.notification.user, delivery);
  }

  return deliveries.length;
}

module.exports = { createNotification, notifyAdmins, retryPendingDeliveries };
