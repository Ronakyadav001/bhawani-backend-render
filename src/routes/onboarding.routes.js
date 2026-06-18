const express = require("express");
const { listCalls, scheduleCall, updateCallStatus } = require("../controllers/onboarding.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), listCalls);
router.post("/", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), scheduleCall);
router.patch("/:id", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), updateCallStatus);

module.exports = router;
