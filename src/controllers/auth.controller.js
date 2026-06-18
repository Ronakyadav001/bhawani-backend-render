const { z } = require("zod");
const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { comparePassword, hashPassword } = require("../utils/password");
const { sendSuccess } = require("../utils/response");
const { signToken } = require("../utils/tokens");
const { logActivity } = require("../utils/activity");

const registerBaseSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(6)
});

const publicRegisterSchema = registerBaseSchema.refine((data) => data.email || data.phone, "Email or phone is required");

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(6)
}).refine((data) => data.email || data.phone, "Email or phone is required");

const staffSchema = registerBaseSchema.extend({
  role: z.enum(["SUPER_ADMIN", "SALES_ADMIN", "YOGA_TRAINER", "DIETICIAN", "SUPPORT_ADMIN"])
}).refine((data) => data.email || data.phone, "Email or phone is required");

function authPayload(user) {
  const token = signToken(user);
  const { passwordHash, ...safeUser } = user;
  return { token, user: safeUser };
}

async function authenticateCredentials(data) {
  const user = await prisma.user.findFirst({
    where: data.email ? { email: data.email } : { phone: data.phone }
  });

  if (!user || !(await comparePassword(data.password, user.passwordHash))) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (!user.isActive) throw new ApiError(403, "Account is inactive");
  return user;
}

const register = asyncHandler(async (req, res) => {
  // Registration is disabled - only existing premium members can access the app
  throw new ApiError(403, "Registration is currently disabled. Only existing premium members can access the app.");
});

const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await authenticateCredentials(data);

  await logActivity({ actor: user, action: "USER_LOGIN", entity: "User", entityId: user.id });
  sendSuccess(res, "Login successful", authPayload(user));
});

const userLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await authenticateCredentials(data);
  if (user.role !== "USER") {
    throw new ApiError(403, "Use staff panel login for admin accounts");
  }

  // Check if user has an active premium subscription
  const activeSubscription = await prisma.userSubscription.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      endDate: { gt: new Date() }
    }
  });

  if (!activeSubscription) {
    throw new ApiError(403, "Access denied. Only premium members can login to the app.");
  }

  await logActivity({ actor: user, action: "USER_APP_LOGIN", entity: "User", entityId: user.id });
  sendSuccess(res, "User app login successful", authPayload(user));
});

const staffLogin = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await authenticateCredentials(data);
  if (user.role === "USER") {
    throw new ApiError(403, "Use mobile app login for user accounts");
  }

  await logActivity({ actor: user, action: "STAFF_PANEL_LOGIN", entity: "User", entityId: user.id, metadata: { role: user.role } });
  sendSuccess(res, "Staff panel login successful", authPayload(user));
});

const me = asyncHandler(async (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  sendSuccess(res, "Current user fetched", { user: safeUser });
});

const createStaff = asyncHandler(async (req, res) => {
  const data = staffSchema.parse(req.body);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      role: data.role
    }
  });

  await logActivity({
    actor: req.user,
    action: "STAFF_CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { role: data.role }
  });

  const { passwordHash, ...safeUser } = user;
  sendSuccess(res, "Staff account created", { user: safeUser }, 201);
});

module.exports = { register, login, userLogin, staffLogin, me, createStaff };
