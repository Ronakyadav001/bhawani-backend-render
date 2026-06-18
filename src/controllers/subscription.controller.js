const { z } = require("zod");
const crypto = require("crypto");
const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { addDuration } = require("../utils/dates");
const { logActivity } = require("../utils/activity");
const { getPagination } = require("../utils/pagination");
const { createNotification, notifyAdmins } = require("../services/notification.service");
const { env } = require("../config/env");

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  duration: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  price: z.number().positive(),
  yogaSessions: z.number().int().min(0),
  hasDietician: z.boolean().default(true),
  hasLiveClasses: z.boolean().default(true),
  features: z.array(z.string()).default([])
});

const createPlan = asyncHandler(async (req, res) => {
  const data = planSchema.parse(req.body);
  const plan = await prisma.subscriptionPlan.create({ data });
  await logActivity({ actor: req.user, action: "PLAN_CREATED", entity: "SubscriptionPlan", entityId: plan.id });
  sendSuccess(res, "Subscription plan created", { plan }, 201);
});

const listPlans = asyncHandler(async (req, res) => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" }
  });
  sendSuccess(res, "Subscription plans fetched", { plans });
});

const createOrder = asyncHandler(async (req, res) => {
  const { planId } = z.object({ planId: z.string().min(1) }).parse(req.body);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new ApiError(404, "Subscription plan not found");

  const providerOrderId = `order_${crypto.randomUUID()}`;
  const payment = await prisma.payment.create({
    data: {
      userId: req.user.id,
      planId,
      amount: plan.price,
      providerOrderId,
      status: "PENDING"
    }
  });

  await logActivity({ actor: req.user, action: "PAYMENT_ORDER_CREATED", entity: "Payment", entityId: payment.id });
  sendSuccess(res, "Payment order created", {
    payment,
    gateway: {
      provider: "RAZORPAY",
      keyId: env.RAZORPAY_KEY_ID || "mock_key_for_development",
      orderId: providerOrderId,
      amount: Number(plan.price) * 100,
      currency: "INR"
    }
  }, 201);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const data = z.object({
    providerOrderId: z.string(),
    providerPaymentId: z.string().optional(),
    providerSignature: z.string().optional()
  }).parse(req.body);

  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: data.providerOrderId },
    include: { plan: true }
  });
  if (!payment) throw new ApiError(404, "Payment order not found");
  if (payment.userId !== req.user.id) throw new ApiError(403, "Cannot verify another user's payment");

  if (env.RAZORPAY_KEY_SECRET && data.providerPaymentId && data.providerSignature) {
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${data.providerOrderId}|${data.providerPaymentId}`)
      .digest("hex");
    if (expected !== data.providerSignature) throw new ApiError(400, "Payment signature verification failed");
  }

  const startDate = new Date();
  const endDate = addDuration(startDate, payment.plan.duration);

  const result = await prisma.$transaction(async (tx) => {
    const completedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        providerPaymentId: data.providerPaymentId || `mock_pay_${crypto.randomUUID()}`,
        providerSignature: data.providerSignature
      }
    });

    const subscription = await tx.userSubscription.create({
      data: {
        userId: req.user.id,
        planId: payment.planId,
        paymentId: completedPayment.id,
        startDate,
        endDate
      }
    });

    return { completedPayment, subscription };
  });

  await createNotification({
    userId: req.user.id,
    title: "Subscription Activated",
    message: `Your ${payment.plan.name} subscription is active.`,
    metadata: { subscriptionId: result.subscription.id }
  });
  await notifyAdmins(["SALES_ADMIN", "SUPER_ADMIN"], {
    title: "New Subscription Purchased",
    message: `${req.user.name} purchased ${payment.plan.name}.`,
    metadata: { userId: req.user.id, subscriptionId: result.subscription.id }
  });
  await logActivity({ actor: req.user, action: "SUBSCRIPTION_ACTIVATED", entity: "UserSubscription", entityId: result.subscription.id });

  sendSuccess(res, "Payment verified and subscription activated", result);
});

const mySubscription = asyncHandler(async (req, res) => {
  const subscription = await prisma.userSubscription.findFirst({
    where: { userId: req.user.id, status: "ACTIVE", endDate: { gt: new Date() } },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
  sendSuccess(res, "Active subscription fetched", { subscription });
});

const mySubscriptionHistory = asyncHandler(async (req, res) => {
  const subscriptions = await prisma.userSubscription.findMany({
    where: { userId: req.user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
  const payments = await prisma.payment.findMany({
    where: { userId: req.user.id },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
  sendSuccess(res, "Subscription history fetched", { subscriptions, payments });
});

const listPayments = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.userId) where.userId = req.query.userId;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.payment.count({ where })
  ]);

  sendSuccess(res, "Payments fetched", { payments, pagination: { page, limit, total } });
});

const listSubscriptions = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.userId) where.userId = req.query.userId;

  const [subscriptions, total] = await Promise.all([
    prisma.userSubscription.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.userSubscription.count({ where })
  ]);

  sendSuccess(res, "Subscriptions fetched", { subscriptions, pagination: { page, limit, total } });
});

const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const data = z.object({
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"])
  }).parse(req.body);

  const subscription = await prisma.userSubscription.update({
    where: { id: req.params.id },
    data,
    include: { user: true, plan: true }
  });

  await logActivity({
    actor: req.user,
    action: "SUBSCRIPTION_STATUS_UPDATED",
    entity: "UserSubscription",
    entityId: subscription.id,
    metadata: { status: subscription.status }
  });

  sendSuccess(res, "Subscription status updated", { subscription });
});

module.exports = {
  createPlan,
  listPlans,
  createOrder,
  verifyPayment,
  mySubscription,
  mySubscriptionHistory,
  listPayments,
  listSubscriptions,
  updateSubscriptionStatus
};
