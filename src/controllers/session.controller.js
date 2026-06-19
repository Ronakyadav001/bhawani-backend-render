const { z } = require("zod");
const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { dayRange } = require("../utils/dates");
const { logActivity } = require("../utils/activity");
const { createZoomMeeting } = require("../services/zoom.service");

const sessionSchema = z.object({
  title: z.string().min(2),
  category: z.string().min(2),
  startTime: z.string().datetime(),
  durationMin: z.number().int().min(1),
  status: z.string().optional()
});

const recordingSchema = z.object({
  title: z.string().min(2),
  recordingUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional()
});

async function hasActiveSubscription(userId) {
  const subscription = await prisma.userSubscription.findFirst({
    where: { userId, status: "ACTIVE", endDate: { gt: new Date() } }
  });
  return Boolean(subscription);
}

const createSession = asyncHandler(async (req, res) => {
  const data = sessionSchema.parse(req.body);
  const startTime = new Date(data.startTime);
  const zoomMeeting = await createZoomMeeting({
    title: data.title,
    startTime,
    durationMin: data.durationMin
  });

  const session = await prisma.liveSession.create({
    data: {
      trainerId: req.user.id,
      title: data.title,
      category: data.category,
      startTime,
      durationMin: data.durationMin,
      liveLink: zoomMeeting.liveLink,
      zoomMeetingId: zoomMeeting.zoomMeetingId,
      zoomStartUrl: zoomMeeting.zoomStartUrl,
      zoomJoinUrl: zoomMeeting.zoomJoinUrl,
      status: data.status || "SCHEDULED"
    }
  });
  await logActivity({
    actor: req.user,
    action: "ZOOM_LIVE_SESSION_CREATED",
    entity: "LiveSession",
    entityId: session.id,
    metadata: { provider: zoomMeeting.provider }
  });
  sendSuccess(res, "Zoom live session created", { session, zoomConfigured: zoomMeeting.provider === "ZOOM" }, 201);
});

const listSessions = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.date) {
    const { start, end } = dayRange(req.query.date);
    where.startTime = { gte: start, lte: end };
  }
  if (req.query.category) where.category = req.query.category;

  const sessions = await prisma.liveSession.findMany({
    where,
    include: {
      trainer: { select: { id: true, name: true } }
    },
    orderBy: { startTime: "asc" }
  });
  sendSuccess(res, "Sessions fetched", { sessions });
});

const createSessionRecording = asyncHandler(async (req, res) => {
  const data = recordingSchema.parse(req.body);
  const session = await prisma.liveSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user.role === "YOGA_TRAINER" && session.trainerId !== req.user.id) {
    throw new ApiError(403, "You can only upload recordings for your own sessions");
  }

  const recording = await prisma.sessionRecording.create({
    data: {
      sessionId: session.id,
      title: data.title,
      recordingUrl: data.recordingUrl,
      thumbnailUrl: data.thumbnailUrl
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          category: true,
          startTime: true,
          trainer: { select: { id: true, name: true } }
        }
      }
    }
  });

  await logActivity({
    actor: req.user,
    action: "SESSION_RECORDING_UPLOADED",
    entity: "SessionRecording",
    entityId: recording.id,
    metadata: { sessionId: session.id }
  });

  sendSuccess(res, "Session recording uploaded", { recording }, 201);
});

const listRecordings = asyncHandler(async (req, res) => {
  if (req.user.role === "USER" && !(await hasActiveSubscription(req.user.id))) {
    throw new ApiError(403, "Active subscription required to access session recordings");
  }

  const where = { isActive: true };
  if (req.user.role === "YOGA_TRAINER") {
    where.session = { trainerId: req.user.id };
  }
  if (req.query.category) {
    where.session = { ...(where.session || {}), category: req.query.category };
  }

  const recordings = await prisma.sessionRecording.findMany({
    where,
    include: {
      session: {
        select: {
          id: true,
          title: true,
          category: true,
          startTime: true,
          durationMin: true,
          trainer: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  sendSuccess(res, "Session recordings fetched", { recordings });
});

const joinSession = asyncHandler(async (req, res) => {
  const session = await prisma.liveSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new ApiError(404, "Session not found");
  if (!(await hasActiveSubscription(req.user.id))) {
    throw new ApiError(403, "Active subscription required to join live sessions");
  }

  const attendance = await prisma.sessionAttendance.upsert({
    where: { sessionId_userId: { sessionId: session.id, userId: req.user.id } },
    update: { status: "JOINED", joinedAt: new Date() },
    create: { sessionId: session.id, userId: req.user.id, status: "JOINED", joinedAt: new Date() }
  });
  await logActivity({ actor: req.user, action: "SESSION_JOINED", entity: "LiveSession", entityId: session.id });
  sendSuccess(res, "Session joined", { attendance, liveLink: session.liveLink });
});

const leaveSession = asyncHandler(async (req, res) => {
  const data = z.object({ durationAttended: z.number().int().min(0) }).parse(req.body);
  const attendance = await prisma.sessionAttendance.update({
    where: { sessionId_userId: { sessionId: req.params.id, userId: req.user.id } },
    data: { leftAt: new Date(), durationAttended: data.durationAttended }
  });
  sendSuccess(res, "Session attendance updated", { attendance });
});

const updateSession = asyncHandler(async (req, res) => {
  const data = z.object({
    title: z.string().min(2).optional(),
    category: z.string().min(2).optional(),
    startTime: z.string().datetime().optional(),
    durationMin: z.number().int().min(1).optional(),
    status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional()
  }).parse(req.body);

  const session = await prisma.liveSession.findUnique({ where: { id: req.params.id } });
  if (!session) throw new ApiError(404, "Session not found");
  if (req.user.role === "YOGA_TRAINER" && session.trainerId !== req.user.id) {
    throw new ApiError(403, "You can only update your own sessions");
  }

const updatedSession = await prisma.liveSession.update({
    where: { id: session.id },
    data: {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : undefined
    }
  });

  await logActivity({
    actor: req.user,
    action: "LIVE_SESSION_UPDATED",
    entity: "LiveSession",
    entityId: updatedSession.id,
    metadata: data
  });
  sendSuccess(res, "Session updated", { session: updatedSession });
});

const attendanceReport = asyncHandler(async (req, res) => {
  const report = await prisma.sessionAttendance.findMany({
    where: { sessionId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" }
  });
  sendSuccess(res, "Attendance report fetched", { report });
});

const assignedUsers = asyncHandler(async (req, res) => {
  const trainerId = req.user.role === "YOGA_TRAINER" ? req.user.id : req.query.trainerId;
  if (!trainerId) throw new ApiError(400, "trainerId query is required");

  const attendances = await prisma.sessionAttendance.findMany({
    where: { session: { trainerId } },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      session: { select: { id: true, title: true, startTime: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const byUser = new Map();
  for (const attendance of attendances) {
    if (!byUser.has(attendance.userId)) {
      byUser.set(attendance.userId, {
        user: attendance.user,
        sessionsAttended: 0,
        sessionsMissed: 0,
        lastSession: attendance.session
      });
    }
    const row = byUser.get(attendance.userId);
    if (attendance.status === "JOINED") row.sessionsAttended += 1;
    if (attendance.status === "MISSED") row.sessionsMissed += 1;
  }

  sendSuccess(res, "Trainer users fetched", { users: Array.from(byUser.values()) });
});

const trainerAnalytics = asyncHandler(async (req, res) => {
  const trainerId = req.user.role === "YOGA_TRAINER" ? req.user.id : req.query.trainerId;
  if (!trainerId) throw new ApiError(400, "trainerId query is required");

  const [sessions, attendance] = await Promise.all([
    prisma.liveSession.findMany({ where: { trainerId }, select: { id: true, status: true, startTime: true } }),
    prisma.sessionAttendance.findMany({ where: { session: { trainerId } } })
  ]);

  const joined = attendance.filter((entry) => entry.status === "JOINED").length;
  const missed = attendance.filter((entry) => entry.status === "MISSED").length;
  const totalDuration = attendance.reduce((sum, entry) => sum + entry.durationAttended, 0);

  sendSuccess(res, "Trainer analytics fetched", {
    totalSessions: sessions.length,
    completedSessions: sessions.filter((session) => session.status === "COMPLETED").length,
    liveSessions: sessions.filter((session) => session.status === "LIVE").length,
    upcomingSessions: sessions.filter((session) => session.startTime > new Date()).length,
    joined,
    missed,
    attendanceRate: joined + missed ? Math.round((joined / (joined + missed)) * 100) : 0,
    averageDurationAttended: joined ? Math.round(totalDuration / joined) : 0
  });
});

module.exports = {
  createSession,
  createSessionRecording,
  listSessions,
  listRecordings,
  joinSession,
  leaveSession,
  updateSession,
  attendanceReport,
  assignedUsers,
  trainerAnalytics
};
