const express = require("express");
const {
  createOrder,
  createPlan,
  listPayments,
  listPlans,
  listSubscriptions,
  mySubscription,
  mySubscriptionHistory,
  updateSubscriptionStatus,
  verifyPayment
} = require("../controllers/subscription.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

// User subscription purchase routes are disabled - only premium members can access the app
// router.get("/plans", listPlans);
// router.post("/orders", protect, allowRoles("USER"), createOrder);
// router.post("/payments/verify", protect, allowRoles("USER"), verifyPayment);

// Admin routes for managing plans and subscriptions
router.post("/plans", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), createPlan);
router.get("/me", protect, allowRoles("USER"), mySubscription);
router.get("/me/history", protect, allowRoles("USER"), mySubscriptionHistory);
router.get("/payments", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), listPayments);
router.get("/admin", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN", "SUPPORT_ADMIN"), listSubscriptions);
router.patch("/admin/:id/status", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), updateSubscriptionStatus);

module.exports = router;
