const { z } = require("zod");
const { prisma } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { getPagination } = require("../utils/pagination");
const { logActivity } = require("../utils/activity");

const leadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().min(7),
  source: z.string().optional().default("WEBSITE"),
  status: z.string().optional(),
  intent: z.string().optional(),
  concern: z.string().optional(),
  journey: z.string().optional(),
  page: z.string().optional(),
  notes: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referrer: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const createLead = asyncHandler(async (req, res) => {
  const data = leadSchema.parse(req.body);
  const lead = await prisma.lead.create({ data });
  await logActivity({ actor: req.user, action: "LEAD_CREATED", entity: "Lead", entityId: lead.id });
  sendSuccess(res, "Lead created", { lead }, 201);
});

const createWebsiteLead = asyncHandler(async (req, res) => {
  const data = leadSchema.parse({
    ...req.body,
    source: req.body.source || "WEBSITE",
    page: req.body.page || req.headers.referer,
    referrer: req.body.referrer || req.headers.referer,
    ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"]
  });

  const lead = await prisma.lead.create({ data });
  await logActivity({
    action: "WEBSITE_LEAD_CREATED",
    entity: "Lead",
    entityId: lead.id,
    metadata: {
      source: lead.source,
      page: lead.page,
      concern: lead.concern,
      intent: lead.intent
    }
  });

  sendSuccess(res, "Website lead submitted", { lead }, 201);
});

const listLeads = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.source) where.source = req.query.source;
  if (req.query.concern) where.concern = req.query.concern;
  if (req.query.intent) where.intent = req.query.intent;
  if (req.query.search) {
    where.OR = [
      { name: { contains: req.query.search, mode: "insensitive" } },
      { phone: { contains: req.query.search, mode: "insensitive" } },
      { email: { contains: req.query.search, mode: "insensitive" } }
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.lead.count({ where })
  ]);

  sendSuccess(res, "Leads fetched", { leads, pagination: { page, limit, total } });
});

const updateLead = asyncHandler(async (req, res) => {
  const data = leadSchema.partial().parse({
    ...req.body,
    status: req.body.status
  });
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data
  });
  await logActivity({ actor: req.user, action: "LEAD_UPDATED", entity: "Lead", entityId: lead.id, metadata: data });
  sendSuccess(res, "Lead updated", { lead });
});

const updateLeadStatus = asyncHandler(async (req, res) => {
  const { status } = z.object({
    status: z.enum(["NEW", "CONTACTED", "HOT", "COLD", "CONVERTED"])
  }).parse(req.body);

  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { status }
  });

  await logActivity({
    actor: req.user,
    action: "LEAD_STATUS_UPDATED",
    entity: "Lead",
    entityId: lead.id,
    metadata: { status }
  });

  sendSuccess(res, "Lead status updated", { lead });
});

module.exports = { createLead, createWebsiteLead, listLeads, updateLead, updateLeadStatus };
