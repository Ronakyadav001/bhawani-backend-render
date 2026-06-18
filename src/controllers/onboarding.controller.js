const { z } = require("zod");
const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { getPagination } = require("../utils/pagination");
const { logActivity } = require("../utils/activity");
const { createNotification } = require("../services/notification.service");

const callSchema = z.object({
  userId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional()
});

const scheduleCall = asyncHandler(async (req, res) => {
  const data = callSchema.parse(req.body);
  const activeSubscription = await prisma.userSubscription.findFirst({
    where: { userId: data.userId, status: "ACTIVE", endDate: { gt: new Date() } }
  });
  if (!activeSubscription) throw new ApiError(400, "User does not have an active subscription");

  const call = await prisma.onboardingCall.create({
    data: {
      userId: data.userId,
      scheduledById: req.user.id,
      scheduledAt: new Date(data.scheduledAt),
      meetingLink: data.meetingLink,
      notes: data.notes
    }
  });

  await createNotification({
    userId: data.userId,
    title: "Onboarding Call Scheduled",
    message: "Your onboarding call has been scheduled.",
    metadata: { callId: call.id, scheduledAt: call.scheduledAt }
  });
  await logActivity({ actor: req.user, action: "ONBOARDING_CALL_SCHEDULED", entity: "OnboardingCall", entityId: call.id });

  sendSuccess(res, "Onboarding call scheduled", { call }, 201);
});

const updateCallStatus = asyncHandler(async (req, res) => {
  const data = z.object({
    status: z.enum(["SCHEDULED", "COMPLETED", "MISSED", "RESCHEDULED"]),
    scheduledAt: z.string().datetime().optional(),
    meetingLink: z.string().url().optional(),
    notes: z.string().optional()
  }).parse(req.body);

  const call = await prisma.onboardingCall.update({
    where: { id: req.params.id },
    data: {
      status: data.status,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      meetingLink: data.meetingLink,
      notes: data.notes
    }
  });

  await createNotification({
    userId: call.userId,
    title: "Onboarding Call Updated",
    message: `Your onboarding call status is ${call.status}.`,
    metadata: { callId: call.id }
  });
  await logActivity({ actor: req.user, action: "ONBOARDING_CALL_UPDATED", entity: "OnboardingCall", entityId: call.id, metadata: { status: call.status } });

  sendSuccess(res, "Onboarding call updated", { call });
});

const listCalls = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = req.query.status ? { status: req.query.status } : {};
  const [calls, total] = await Promise.all([
    prisma.onboardingCall.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      skip,
      take: limit,
      orderBy: { scheduledAt: "desc" }
    }),
    prisma.onboardingCall.count({ where })
  ]);
  sendSuccess(res, "Onboarding calls fetched", { calls, pagination: { page, limit, total } });
});

module.exports = { scheduleCall, updateCallStatus, listCalls };
