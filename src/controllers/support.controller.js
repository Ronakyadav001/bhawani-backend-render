const { z } = require("zod");
const { prisma } = require("../config/database");
const { ApiError } = require("../utils/apiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { getPagination } = require("../utils/pagination");
const { logActivity } = require("../utils/activity");
const { notifyAdmins } = require("../services/notification.service");

function chatSenderType(role) {
  if (role === "SUPPORT_ADMIN") return "SUPPORT_ADMIN";
  if (role === "DIETICIAN") return "DIETICIAN";
  if (role === "YOGA_TRAINER") return "YOGA_TRAINER";
  return "USER";
}

const sendChatMessage = asyncHandler(async (req, res) => {
  const data = z.object({
    message: z.string().min(1),
    userId: z.string().uuid().optional()
  }).parse(req.body);

  const targetUserId = req.user.role === "USER" ? req.user.id : data.userId;
  if (!targetUserId) {
    throw new ApiError(400, "userId is required for staff chat replies");
  }

  const userMessage = await prisma.chatMessage.create({
    data: {
      userId: targetUserId,
      senderId: req.user.id,
      senderType: chatSenderType(req.user.role),
      message: data.message
    }
  });

  await logActivity({ actor: req.user, action: "CHAT_MESSAGE_SENT", entity: "ChatMessage", entityId: userMessage.id });
  sendSuccess(res, "Chat assistance message saved", { message: userMessage }, 201);
});

const listMyChat = asyncHandler(async (req, res) => {
  const userId = req.user.role === "USER" ? req.user.id : req.query.userId;
  if (!userId) {
    throw new ApiError(400, "userId query is required for staff chat history");
  }

  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100
  });
  sendSuccess(res, "Chat messages fetched", { messages });
});

const createTicket = asyncHandler(async (req, res) => {
  const data = z.object({
    subject: z.string().min(2),
    description: z.string().min(2),
    priority: z.string().default("NORMAL")
  }).parse(req.body);

  const ticket = await prisma.supportTicket.create({
    data: { userId: req.user.id, ...data }
  });
  await notifyAdmins(["SUPPORT_ADMIN", "SUPER_ADMIN"], {
    title: "New Support Ticket",
    message: data.subject,
    metadata: { ticketId: ticket.id, userId: req.user.id }
  });
  await logActivity({ actor: req.user, action: "SUPPORT_TICKET_CREATED", entity: "SupportTicket", entityId: ticket.id });
  sendSuccess(res, "Support ticket created", { ticket }, 201);
});

const listTickets = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = req.user.role === "USER" ? { userId: req.user.id } : {};
  if (req.query.status) where.status = req.query.status;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, name: true } }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.supportTicket.count({ where })
  ]);

  sendSuccess(res, "Tickets fetched", { tickets, pagination: { page, limit, total } });
});

const updateTicket = asyncHandler(async (req, res) => {
  const data = z.object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    assignedToId: z.string().uuid().optional(),
    resolution: z.string().optional()
  }).parse(req.body);

  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data
  });
  await logActivity({ actor: req.user, action: "SUPPORT_TICKET_UPDATED", entity: "SupportTicket", entityId: ticket.id, metadata: { status: ticket.status } });
  sendSuccess(res, "Ticket updated", { ticket });
});

const userIssueHistory = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const [user, tickets, chatMessages, notifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    }),
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    })
  ]);

  if (!user) throw new ApiError(404, "User not found");

  sendSuccess(res, "User issue history fetched", {
    user,
    tickets,
    chatMessages,
    notifications,
    summary: {
      totalTickets: tickets.length,
      openTickets: tickets.filter((ticket) => ["OPEN", "IN_PROGRESS"].includes(ticket.status)).length,
      resolvedTickets: tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length
    }
  });
});

module.exports = { sendChatMessage, listMyChat, createTicket, listTickets, updateTicket, userIssueHistory };
