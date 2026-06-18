const express = require("express");
const { createBlog, listAdminBlogs, listPublicBlogs, updateBlog } = require("../controllers/blog.controller");
const { allowRoles, protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", listPublicBlogs);
router.get("/admin", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), listAdminBlogs);
router.post("/admin", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), createBlog);
router.patch("/admin/:id", protect, allowRoles("SUPER_ADMIN", "SALES_ADMIN"), updateBlog);

module.exports = router;
