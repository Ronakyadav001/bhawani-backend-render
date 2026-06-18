const { prisma } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const dashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    activeSubscriptions,
    completedOnboarding,
    upcomingSessions,
    openTickets,
    completedPayments,
    totalAttendance,
    failedNotificationDeliveries,
    openPrivacyRequests
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.userSubscription.count({ where: { status: "ACTIVE", endDate: { gt: new Date() } } }),
    prisma.onboardingCall.count({ where: { status: "COMPLETED" } }),
    prisma.liveSession.count({ where: { startTime: { gt: new Date() } } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.sessionAttendance.count(),
    prisma.notificationDelivery.count({ where: { status: "FAILED" } }),
    prisma.privacyRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })
  ]);

  sendSuccess(res, "Analytics fetched", {
    totalUsers,
    activeSubscriptions,
    completedOnboarding,
    upcomingSessions,
    openTickets,
    completedPayments,
    totalAttendance,
    failedNotificationDeliveries,
    openPrivacyRequests
  });
});

const activityLogs = asyncHandler(async (req, res) => {
  const logs = await prisma.activityLog.findMany({
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  sendSuccess(res, "Activity logs fetched", { logs });
});

const salesAnalytics = asyncHandler(async (req, res) => {
  const [leads, leadsBySource, leadsByStatus, completedPayments, activeSubscriptions, onboardingCalls] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["source"], _count: { source: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.userSubscription.count({ where: { status: "ACTIVE", endDate: { gt: new Date() } } }),
    prisma.onboardingCall.groupBy({
      by: ["status"],
      _count: { status: true }
    })
  ]);

  const revenue = await prisma.payment.aggregate({
    where: { status: "COMPLETED" },
    _sum: { amount: true }
  });

  const onboardingByStatus = onboardingCalls.reduce((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {});

  sendSuccess(res, "Sales conversion analytics fetched", {
    leads,
    leadsBySource: leadsBySource.reduce((acc, row) => {
      acc[row.source || "UNKNOWN"] = row._count.source;
      return acc;
    }, {}),
    leadsByStatus: leadsByStatus.reduce((acc, row) => {
      acc[row.status || "UNKNOWN"] = row._count.status;
      return acc;
    }, {}),
    completedPayments,
    activeSubscriptions,
    conversionRate: leads ? Math.round((completedPayments / leads) * 100) : 0,
    revenue: revenue._sum.amount || 0,
    onboardingByStatus
  });
});

const complianceSummary = asyncHandler(async (req, res) => {
  const [
    consentsByType,
    privacyRequestsByStatus,
    privacyRequestsByType,
    deliveriesByStatus,
    mutationLogs,
    anonymizedUsers
  ] = await Promise.all([
    prisma.userConsent.groupBy({ by: ["type", "accepted"], _count: { type: true } }),
    prisma.privacyRequest.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.privacyRequest.groupBy({ by: ["type"], _count: { type: true } }),
    prisma.notificationDelivery.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.activityLog.count({ where: { action: "API_MUTATION" } }),
    prisma.activityLog.count({ where: { action: "USER_ACCOUNT_ANONYMIZED" } })
  ]);

  sendSuccess(res, "Compliance summary fetched", {
    consentsByType,
    privacyRequestsByStatus,
    privacyRequestsByType,
    deliveriesByStatus,
    mutationLogs,
    anonymizedUsers
  });
});

module.exports = { dashboard, activityLogs, salesAnalytics, complianceSummary };
