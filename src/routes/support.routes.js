const express = require("express");
const {
  createTicket,
  listMyChat,
  listTickets,
  sendChatMessage,
  updateTicket,
  userIssueHistory
} = require("../controllers/support.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.post("/chat", protect, sendChatMessage);
router.get("/chat/me", protect, listMyChat);
router.post("/tickets", protect, createTicket);
router.get("/tickets", protect, listTickets);
router.patch("/tickets/:id", protect, allowRoles("SUPPORT_ADMIN", "SUPER_ADMIN"), updateTicket);
router.get("/users/:userId/history", protect, allowRoles("SUPPORT_ADMIN", "SUPER_ADMIN"), userIssueHistory);

module.exports = router;
