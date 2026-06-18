const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const { env } = require("../config/env");

function errorHandler(error, req, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.errors.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({ success: false, message: "Duplicate value already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 && env.NODE_ENV === "production" ? "Internal server error" : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: error.details || undefined
  });
}

module.exports = { errorHandler };
