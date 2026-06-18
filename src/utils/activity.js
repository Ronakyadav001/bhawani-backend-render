const { prisma } = require("../config/database");

async function logActivity({ actor, action, entity, entityId, metadata }) {
  return prisma.activityLog.create({
    data: {
      actorId: actor?.id,
      role: actor?.role,
      action,
      entity,
      entityId,
      metadata
    }
  });
}

module.exports = { logActivity };
