const { z } = require("zod");
const { prisma } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/apiError");
const { sendSuccess } = require("../utils/response");
const { getPagination } = require("../utils/pagination");
const { logActivity } = require("../utils/activity");

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  profilePic: z.string().url().optional(),
  fcmToken: z.string().optional(),
  age: z.number().int().min(10).max(100).optional(),
  gender: z.string().optional(),
  heightCm: z.number().min(50).max(260).optional(),
  weightKg: z.number().min(20).max(400).optional(),
  goal: z.string().optional(),
  activityLevel: z.string().optional()
});

const updateMe = asyncHandler(async (req, res) => {
  const data = updateProfileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data
  });

  await logActivity({ actor: req.user, action: "PROFILE_UPDATED", entity: "User", entityId: user.id });
  const { passwordHash, ...safeUser } = user;
  sendSuccess(res, "Profile updated", { user: safeUser });
});

const saveConsent = asyncHandler(async (req, res) => {
  const data = z.object({
    type: z.enum(["TERMS", "PRIVACY", "MARKETING", "HEALTH_DATA"]),
    accepted: z.boolean().default(true),
    version: z.string().default("1.0"),
    source: z.string().optional()
  }).parse(req.body);

  const consent = await prisma.userConsent.upsert({
    where: { userId_type_version: { userId: req.user.id, type: data.type, version: data.version } },
    update: {
      accepted: data.accepted,
      source: data.source,
      ipAddress: req.ip,
      acceptedAt: data.accepted ? new Date() : undefined,
      revokedAt: data.accepted ? null : new Date()
    },
    create: {
      userId: req.user.id,
      type: data.type,
      accepted: data.accepted,
      version: data.version,
      source: data.source,
      ipAddress: req.ip,
      revokedAt: data.accepted ? null : new Date()
    }
  });

  await logActivity({ actor: req.user, action: "USER_CONSENT_SAVED", entity: "UserConsent", entityId: consent.id, metadata: { type: consent.type, accepted: consent.accepted } });
  sendSuccess(res, "Consent saved", { consent }, 201);
});

const myConsents = asyncHandler(async (req, res) => {
  const consents = await prisma.userConsent.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: "desc" }
  });
  sendSuccess(res, "Consents fetched", { consents });
});

const createPrivacyRequest = asyncHandler(async (req, res) => {
  const data = z.object({
    type: z.enum(["DATA_EXPORT", "DATA_DELETION", "DATA_CORRECTION"]),
    reason: z.string().optional()
  }).parse(req.body);

  const request = await prisma.privacyRequest.create({
    data: { userId: req.user.id, ...data }
  });

  await logActivity({ actor: req.user, action: "PRIVACY_REQUEST_CREATED", entity: "PrivacyRequest", entityId: request.id, metadata: { type: request.type } });
  sendSuccess(res, "Privacy request created", { request }, 201);
});

const exportMyData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [
    user,
    subscriptions,
    payments,
    onboardingCalls,
    dietPlans,
    dietComplianceEntries,
    progressEntries,
    attendances,
    chatMessages,
    supportTickets,
    notifications,
    consents,
    privacyRequests,
    feedbacks
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        profilePic: true,
        age: true,
        gender: true,
        heightCm: true,
        weightKg: true,
        goal: true,
        activityLevel: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.userSubscription.findMany({ where: { userId }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.onboardingCall.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.dietPlan.findMany({ where: { userId }, include: { meals: true }, orderBy: { createdAt: "desc" } }),
    prisma.dietComplianceEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.progressEntry.findMany({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.sessionAttendance.findMany({ where: { userId }, include: { session: true }, orderBy: { createdAt: "desc" } }),
    prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.userConsent.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),
    prisma.privacyRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.feedback.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
  ]);

  await logActivity({ actor: req.user, action: "USER_DATA_EXPORTED", entity: "User", entityId: userId });
  sendSuccess(res, "User data export generated", {
    exportedAt: new Date(),
    user,
    subscriptions,
    payments,
    onboardingCalls,
    dietPlans,
    dietComplianceEntries,
    progressEntries,
    attendances,
    chatMessages,
    supportTickets,
    notifications,
    consents,
    privacyRequests,
    feedbacks
  });
});

const listPrivacyRequests = asyncHandler(async (req, res) => {
  const where = req.user.role === "USER" ? { userId: req.user.id } : {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.type) where.type = req.query.type;

  const requests = await prisma.privacyRequest.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  sendSuccess(res, "Privacy requests fetched", { requests });
});

const updatePrivacyRequest = asyncHandler(async (req, res) => {
  const data = z.object({
    status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(),
    resolution: z.string().optional()
  }).parse(req.body);

  const existingRequest = await prisma.privacyRequest.findUnique({ where: { id: req.params.id } });
  if (!existingRequest) {
    throw new ApiError(404, "Privacy request not found");
  }

  const request = await prisma.privacyRequest.update({
    where: { id: req.params.id },
    data: {
      ...data,
      resolvedAt: ["COMPLETED", "REJECTED"].includes(data.status) ? new Date() : undefined
    }
  });

  if (request.type === "DATA_DELETION" && request.status === "COMPLETED") {
    await prisma.user.update({
      where: { id: request.userId },
      data: {
        name: "Deleted User",
        email: null,
        phone: null,
        passwordHash: null,
        profilePic: null,
        fcmToken: null,
        age: null,
        gender: null,
        heightCm: null,
        weightKg: null,
        goal: null,
        activityLevel: null,
        isActive: false
      }
    });
    await logActivity({
      actor: req.user,
      action: "USER_ACCOUNT_ANONYMIZED",
      entity: "User",
      entityId: request.userId,
      metadata: { privacyRequestId: request.id }
    });
  }

  await logActivity({ actor: req.user, action: "PRIVACY_REQUEST_UPDATED", entity: "PrivacyRequest", entityId: request.id, metadata: { status: request.status } });
  sendSuccess(res, "Privacy request updated", { request });
});

const listUsers = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const role = req.query.role;
  const where = role ? { role } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    }),
    prisma.user.count({ where })
  ]);

  sendSuccess(res, "Users fetched", { users, pagination: { page, limit, total } });
});

module.exports = {
  updateMe,
  saveConsent,
  myConsents,
  createPrivacyRequest,
  exportMyData,
  listPrivacyRequests,
  updatePrivacyRequest,
  listUsers
};
