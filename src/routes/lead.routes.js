const express = require("express");
const { createLead, createWebsiteLead, listLeads, updateLead, updateLeadStatus } = require("../controllers/lead.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.post("/website", createWebsiteLead);

router.get("/", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), listLeads);
router.post("/", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), createLead);
router.patch("/:id/status", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), updateLeadStatus);
router.patch("/:id", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), updateLead);

module.exports = router;
