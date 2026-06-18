const express = require("express");
const { appConfig } = require("../controllers/config.controller");

const router = express.Router();

router.get("/", appConfig);

module.exports = router;
