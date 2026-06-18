const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { verifyToken } = require("../utils/tokens");
const { logActivity } = require("../utils/activity");

function attachMutationAudit(req, res) {
  if (req._mutationAuditAttached) return;
  req._mutationAuditAttached = true;

  res.on("finish", () => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
    if (res.statusCode >= 400) return;

    logActivity({
      actor: req.user,
      action: "API_MUTATION",
      entity: "HttpRequest",
      entityId: req.params?.id,
      metadata: {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode
      }
    }).catch((error) => {
      console.error("Mutation audit log failed:", error.message);
    });
  });
}

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentication token required");
  }

  const payload = verifyToken(authHeader.split(" ")[1]);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  req.user = user;
  attachMutationAudit(req, res);
  next();
});

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission for this action"));
    }

    next();
  };
}

module.exports = { protect, allowRoles };
