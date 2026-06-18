const { prisma } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { getPagination } = require("../utils/pagination");

const myNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    include: {
      deliveries: {
        select: {
          id: true,
          channel: true,
          provider: true,
          status: true,
          attempts: true,
          nextAttemptAt: true,
          lastAttemptAt: true,
          error: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  sendSuccess(res, "Notifications fetched", { notifications });
});

const markRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });
  sendSuccess(res, "Notifications marked as read");
});

const deliveryLogs = asyncHandler(async (req, res) => {
  const { skip, limit, page } = getPagination(req.query);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.provider) where.provider = req.query.provider;

  const [deliveries, total] = await Promise.all([
    prisma.notificationDelivery.findMany({
      where,
      include: {
        notification: {
          select: {
            id: true,
            userId: true,
            title: true,
            channel: true,
            createdAt: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.notificationDelivery.count({ where })
  ]);

  sendSuccess(res, "Notification delivery logs fetched", { deliveries, pagination: { page, limit, total } });
});

module.exports = { myNotifications, markRead, deliveryLogs };
