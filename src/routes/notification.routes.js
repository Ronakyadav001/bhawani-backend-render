const express = require("express");
const { deliveryLogs, markRead, myNotifications } = require("../controllers/notification.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, myNotifications);
router.patch("/read-all", protect, markRead);
router.get("/delivery-logs", protect, allowRoles("SUPER_ADMIN", "SUPPORT_ADMIN"), deliveryLogs);

module.exports = router;
