const express = require("express");
const {
  attendanceReport,
  assignedUsers,
  createSession,
  joinSession,
  leaveSession,
  listSessions,
  trainerAnalytics,
  updateSession
} = require("../controllers/session.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, listSessions);
router.get("/trainer/users", protect, allowRoles("YOGA_TRAINER", "SUPER_ADMIN"), assignedUsers);
router.get("/trainer/analytics", protect, allowRoles("YOGA_TRAINER", "SUPER_ADMIN"), trainerAnalytics);
router.post("/", protect, allowRoles("YOGA_TRAINER", "SUPER_ADMIN"), createSession);
router.patch("/:id", protect, allowRoles("YOGA_TRAINER", "SUPER_ADMIN"), updateSession);
router.post("/:id/join", protect, allowRoles("USER"), joinSession);
router.post("/:id/leave", protect, allowRoles("USER"), leaveSession);
router.get("/:id/attendance", protect, allowRoles("YOGA_TRAINER", "SUPER_ADMIN"), attendanceReport);

module.exports = router;
