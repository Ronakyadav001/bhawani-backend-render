const { prisma } = require("../config/database");
const { createNotification, retryPendingDeliveries } = require("./notification.service");

const SESSION_REMINDER_MINUTES = 30;
const ONBOARDING_REMINDER_MINUTES = 60;

let schedulerHandle = null;
let schedulerRunning = false;

async function activeUserIds() {
  const subscriptions = await prisma.userSubscription.findMany({
    where: { status: "ACTIVE", endDate: { gt: new Date() } },
    select: { userId: true },
    distinct: ["userId"]
  });
  return subscriptions.map((subscription) => subscription.userId);
}

async function notifyUsers(userIds, payload) {
  await Promise.all(userIds.map((userId) => createNotification({ userId, ...payload })));
}

async function sendOnboardingReminders(now) {
  const reminderWindow = new Date(now.getTime() + ONBOARDING_REMINDER_MINUTES * 60 * 1000);
  const calls = await prisma.onboardingCall.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      scheduledAt: { gte: now, lte: reminderWindow }
    }
  });

  for (const call of calls) {
    await createNotification({
      userId: call.userId,
      title: "Onboarding Call Reminder",
      message: "Your onboarding call is coming up soon.",
      channel: "WHATSAPP",
      metadata: { callId: call.id, scheduledAt: call.scheduledAt }
    });
    await prisma.onboardingCall.update({
      where: { id: call.id },
      data: { reminderSentAt: now }
    });
  }
}

async function sendSessionReminders(now) {
  const reminderWindow = new Date(now.getTime() + SESSION_REMINDER_MINUTES * 60 * 1000);
  const sessions = await prisma.liveSession.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      startTime: { gte: now, lte: reminderWindow }
    },
    include: { trainer: { select: { name: true } } }
  });

  if (!sessions.length) return;
  const users = await activeUserIds();

  for (const session of sessions) {
    await notifyUsers(users, {
      title: "Yoga Session Reminder",
      message: `${session.title} with ${session.trainer.name} starts soon.`,
      channel: "PUSH",
      metadata: { sessionId: session.id, startTime: session.startTime }
    });
    await prisma.liveSession.update({
      where: { id: session.id },
      data: { reminderSentAt: now }
    });
  }
}

async function sendLiveNotifications(now) {
  const sessions = await prisma.liveSession.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      liveNotifiedAt: null,
      startTime: { lte: now }
    }
  });

  if (!sessions.length) return;
  const users = await activeUserIds();

  for (const session of sessions) {
    await notifyUsers(users, {
      title: "Your live yoga session is now live",
      message: `${session.title} is live now.`,
      channel: "PUSH",
      metadata: { sessionId: session.id, liveLink: session.liveLink }
    });
    await prisma.liveSession.update({
      where: { id: session.id },
      data: { status: "LIVE", liveNotifiedAt: now }
    });
  }
}

async function markMissedSessions(now) {
  const sessions = await prisma.liveSession.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
      missedProcessedAt: null,
      startTime: { lt: now }
    },
    include: { attendances: { select: { userId: true } } }
  });

  if (!sessions.length) return;
  const users = await activeUserIds();

  for (const session of sessions) {
    const endTime = new Date(session.startTime.getTime() + session.durationMin * 60 * 1000);
    if (endTime > now) continue;

    const attended = new Set(session.attendances.map((attendance) => attendance.userId));
    const missedUsers = users.filter((userId) => !attended.has(userId));

    if (missedUsers.length) {
      await prisma.sessionAttendance.createMany({
        data: missedUsers.map((userId) => ({
          sessionId: session.id,
          userId,
          status: "MISSED",
          durationAttended: 0
        })),
        skipDuplicates: true
      });
    }

    await prisma.liveSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED", missedProcessedAt: now }
    });
  }
}

async function runSchedulerTick() {
  if (schedulerRunning) return;
  schedulerRunning = true;
  const now = new Date();

  try {
    await sendOnboardingReminders(now);
    await sendSessionReminders(now);
    await sendLiveNotifications(now);
    await markMissedSessions(now);
    await retryPendingDeliveries(now);
  } catch (error) {
    console.error("Scheduler tick failed:", error);
  } finally {
    schedulerRunning = false;
  }
}

function startScheduler() {
  if (schedulerHandle || process.env.SCHEDULER_ENABLED === "false") return;
  schedulerHandle = setInterval(runSchedulerTick, 60 * 1000);
  runSchedulerTick();
}

function stopScheduler() {
  if (!schedulerHandle) return;
  clearInterval(schedulerHandle);
  schedulerHandle = null;
}

module.exports = { runSchedulerTick, startScheduler, stopScheduler };
