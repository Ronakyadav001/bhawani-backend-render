const express = require("express");
const { createFeedback } = require("../controllers/feedback.controller");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, createFeedback);

module.exports = router;
