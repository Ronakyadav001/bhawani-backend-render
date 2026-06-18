const { z } = require("zod");
const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { logActivity } = require("../utils/activity");
const { createNotification } = require("../services/notification.service");

const assignmentSchema = z.object({
  userId: z.string().uuid(),
  dieticianId: z.string().uuid(),
  notes: z.string().optional()
});

const assignDietician = asyncHandler(async (req, res) => {
  const data = assignmentSchema.parse(req.body);
  const completedCall = await prisma.onboardingCall.findFirst({
    where: { userId: data.userId, status: "COMPLETED" }
  });
  if (!completedCall) throw new ApiError(400, "Complete onboarding call before assigning dietician");

  const dietician = await prisma.user.findFirst({
    where: { id: data.dieticianId, role: "DIETICIAN", isActive: true }
  });
  if (!dietician) throw new ApiError(404, "Dietician not found");

  await prisma.dieticianAssignment.updateMany({
    where: { userId: data.userId, isActive: true },
    data: { isActive: false }
  });

  const assignment = await prisma.dieticianAssignment.create({
    data: {
      userId: data.userId,
      dieticianId: data.dieticianId,
      assignedBy: req.user.id,
      notes: data.notes
    },
    include: { user: true, dietician: true }
  });

  await createNotification({
    userId: data.userId,
    title: "Dietician Assigned",
    message: `${dietician.name} has been assigned as your dietician.`,
    metadata: { dieticianId: dietician.id }
  });
  await logActivity({ actor: req.user, action: "DIETICIAN_ASSIGNED", entity: "DieticianAssignment", entityId: assignment.id });
  sendSuccess(res, "Dietician assigned", { assignment }, 201);
});

const dietPlanSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  meals: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    mealType: z.string(),
    title: z.string(),
    calories: z.number().int().optional(),
    proteinGrams: z.number().int().optional(),
    carbsGrams: z.number().int().optional(),
    fatsGrams: z.number().int().optional(),
    instructions: z.string().optional()
  })).default([])
});

const createDietPlan = asyncHandler(async (req, res) => {
  const data = dietPlanSchema.parse(req.body);
  const assignment = await prisma.dieticianAssignment.findFirst({
    where: { userId: data.userId, dieticianId: req.user.id, isActive: true }
  });
  if (req.user.role === "DIETICIAN" && !assignment) {
    throw new ApiError(403, "This user is not assigned to you");
  }

  const plan = await prisma.dietPlan.create({
    data: {
      userId: data.userId,
      dieticianId: req.user.id,
      title: data.title,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      meals: { create: data.meals }
    },
    include: { meals: true }
  });

  await createNotification({
    userId: data.userId,
    title: "Diet Plan Shared",
    message: "Your personalized diet plan is ready.",
    metadata: { dietPlanId: plan.id }
  });
  await logActivity({ actor: req.user, action: "DIET_PLAN_CREATED", entity: "DietPlan", entityId: plan.id });
  sendSuccess(res, "Diet plan created", { plan }, 201);
});

const myDietPlans = asyncHandler(async (req, res) => {
  const where = req.user.role === "DIETICIAN" ? { dieticianId: req.user.id } : { userId: req.user.id };
  const plans = await prisma.dietPlan.findMany({
    where,
    include: { meals: true, user: { select: { id: true, name: true } }, dietician: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" }
  });
  sendSuccess(res, "Diet plans fetched", { plans });
});

const createComplianceEntry = asyncHandler(async (req, res) => {
  const data = z.object({
    userId: z.string().uuid().optional(),
    dietPlanId: z.string().uuid(),
    date: z.string().datetime().optional(),
    followed: z.boolean(),
    mealsFollowed: z.number().int().min(0).optional(),
    notes: z.string().optional()
  }).parse(req.body);
  const userId = req.user.role === "USER" ? req.user.id : data.userId;
  if (!userId) throw new ApiError(400, "userId is required for staff compliance entries");

  if (req.user.role === "DIETICIAN") {
    const assignment = await prisma.dieticianAssignment.findFirst({
      where: { userId, dieticianId: req.user.id, isActive: true }
    });
    if (!assignment) throw new ApiError(403, "This user is not assigned to you");
  }

  const entryDate = data.date ? new Date(data.date) : new Date();
  entryDate.setHours(0, 0, 0, 0);

  const entry = await prisma.dietComplianceEntry.upsert({
    where: { userId_dietPlanId_date: { userId, dietPlanId: data.dietPlanId, date: entryDate } },
    update: {
      followed: data.followed,
      mealsFollowed: data.mealsFollowed,
      notes: data.notes
    },
    create: {
      userId,
      dietPlanId: data.dietPlanId,
      date: entryDate,
      followed: data.followed,
      mealsFollowed: data.mealsFollowed,
      notes: data.notes
    }
  });

  await logActivity({ actor: req.user, action: "DIET_COMPLIANCE_RECORDED", entity: "DietComplianceEntry", entityId: entry.id });
  sendSuccess(res, "Diet compliance saved", { entry }, 201);
});

const listComplianceEntries = asyncHandler(async (req, res) => {
  const userId = req.user.role === "USER" ? req.user.id : req.query.userId;
  if (!userId) throw new ApiError(400, "userId query is required");

  const entries = await prisma.dietComplianceEntry.findMany({
    where: { userId },
    include: { dietPlan: { select: { id: true, title: true } } },
    orderBy: { date: "desc" },
    take: 100
  });

  const total = entries.length;
  const followed = entries.filter((entry) => entry.followed).length;
  sendSuccess(res, "Diet compliance fetched", {
    entries,
    summary: {
      total,
      followed,
      complianceRate: total ? Math.round((followed / total) * 100) : 0
    }
  });
});

const createProgressEntry = asyncHandler(async (req, res) => {
  const data = z.object({
    userId: z.string().uuid().optional(),
    date: z.string().datetime().optional(),
    weightKg: z.number().positive().optional(),
    energyLevel: z.number().int().min(1).max(10).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    notes: z.string().optional()
  }).parse(req.body);
  const userId = req.user.role === "USER" ? req.user.id : data.userId;
  if (!userId) throw new ApiError(400, "userId is required for staff progress entries");

  if (req.user.role === "DIETICIAN") {
    const assignment = await prisma.dieticianAssignment.findFirst({
      where: { userId, dieticianId: req.user.id, isActive: true }
    });
    if (!assignment) throw new ApiError(403, "This user is not assigned to you");
  }

  const entry = await prisma.progressEntry.create({
    data: {
      userId,
      date: data.date ? new Date(data.date) : new Date(),
      weightKg: data.weightKg,
      energyLevel: data.energyLevel,
      sleepHours: data.sleepHours,
      notes: data.notes
    }
  });

  await logActivity({ actor: req.user, action: "PROGRESS_RECORDED", entity: "ProgressEntry", entityId: entry.id });
  sendSuccess(res, "Progress saved", { entry }, 201);
});

const listProgressEntries = asyncHandler(async (req, res) => {
  const userId = req.user.role === "USER" ? req.user.id : req.query.userId;
  if (!userId) throw new ApiError(400, "userId query is required");

  const entries = await prisma.progressEntry.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 100
  });

  sendSuccess(res, "Progress entries fetched", { entries });
});

module.exports = {
  assignDietician,
  createDietPlan,
  myDietPlans,
  createComplianceEntry,
  listComplianceEntries,
  createProgressEntry,
  listProgressEntries
};
