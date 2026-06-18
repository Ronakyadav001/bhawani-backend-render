const express = require("express");
const { createStaff, login, me, register, staffLogin, userLogin } = require("../controllers/auth.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

// Registration is disabled - only existing premium members can access the app
router.post("/register", register);
router.post("/login", login);
router.post("/login/user", userLogin);
router.post("/login/staff", staffLogin);
router.get("/me", protect, me);
router.post("/staff", protect, allowRoles("SUPER_ADMIN"), createStaff);

module.exports = router;
