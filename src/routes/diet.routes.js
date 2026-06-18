const express = require("express");
const {
  assignDietician,
  createComplianceEntry,
  createDietPlan,
  createProgressEntry,
  listComplianceEntries,
  listProgressEntries,
  myDietPlans
} = require("../controllers/diet.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.post("/assignments", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), assignDietician);
router.post("/plans", protect, allowRoles("DIETICIAN", "SUPER_ADMIN"), createDietPlan);
router.get("/plans/me", protect, allowRoles("USER", "DIETICIAN"), myDietPlans);
router.post("/compliance", protect, allowRoles("USER", "DIETICIAN", "SUPER_ADMIN"), createComplianceEntry);
router.get("/compliance", protect, allowRoles("USER", "DIETICIAN", "SUPER_ADMIN"), listComplianceEntries);
router.post("/progress", protect, allowRoles("USER", "DIETICIAN", "SUPER_ADMIN"), createProgressEntry);
router.get("/progress", protect, allowRoles("USER", "DIETICIAN", "SUPER_ADMIN"), listProgressEntries);

module.exports = router;
