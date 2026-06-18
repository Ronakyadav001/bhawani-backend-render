const express = require("express");
const { activityLogs, complianceSummary, dashboard, salesAnalytics } = require("../controllers/admin.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/dashboard", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN", "SUPPORT_ADMIN"), dashboard);
router.get("/sales-analytics", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), salesAnalytics);
router.get("/compliance-summary", protect, allowRoles("SUPER_ADMIN", "SUPPORT_ADMIN"), complianceSummary);
router.get("/activity-logs", protect, allowRoles("SUPER_ADMIN"), activityLogs);

module.exports = router;
