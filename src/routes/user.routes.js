const express = require("express");
const {
  createPrivacyRequest,
  exportMyData,
  listPrivacyRequests,
  listUsers,
  myConsents,
  saveConsent,
  updateMe,
  updatePrivacyRequest
} = require("../controllers/user.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN", "SUPPORT_ADMIN"), listUsers);
router.patch("/me", protect, updateMe);
router.post("/me/consents", protect, allowRoles("USER"), saveConsent);
router.get("/me/consents", protect, allowRoles("USER"), myConsents);
router.post("/me/privacy-requests", protect, allowRoles("USER"), createPrivacyRequest);
router.get("/me/data-export", protect, allowRoles("USER"), exportMyData);
router.get("/privacy-requests", protect, allowRoles("USER", "SUPER_ADMIN", "SUPPORT_ADMIN"), listPrivacyRequests);
router.patch("/privacy-requests/:id", protect, allowRoles("SUPER_ADMIN", "SUPPORT_ADMIN"), updatePrivacyRequest);

module.exports = router;
