const { z } = require("zod");
const { prisma } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const createFeedback = asyncHandler(async (req, res) => {
  const data = z.object({
    step: z.string().min(2),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional()
  }).parse(req.body);

  const feedback = await prisma.feedback.create({
    data: { userId: req.user.id, ...data }
  });
  sendSuccess(res, "Feedback submitted", { feedback }, 201);
});

module.exports = { createFeedback };
