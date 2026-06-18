const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { env } = require("./config/env");
const { prisma } = require("./config/database");
const { errorHandler } = require("./middleware/errorHandler");
const { notFoundHandler } = require("./middleware/notFoundHandler");

const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const blogRoutes = require("./routes/blog.routes");
const configRoutes = require("./routes/config.routes");
const dietRoutes = require("./routes/diet.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const leadRoutes = require("./routes/lead.routes");
const notificationRoutes = require("./routes/notification.routes");
const onboardingRoutes = require("./routes/onboarding.routes");
const sessionRoutes = require("./routes/session.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const supportRoutes = require("./routes/support.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
app.use("/crm", express.static(path.join(__dirname, "../public/crm")));
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", async (req, res) => {
  let databaseReady = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReady = true;
    req.app.locals.databaseReady = true;
  } catch (error) {
    req.app.locals.databaseReady = false;
  }

  res.json({
    success: true,
    message: "Yoga Wellness API is healthy",
    data: {
      database: databaseReady ? "connected" : "disconnected"
    }
  });
});

app.get("/crm", (req, res) => {
  res.redirect(302, "/crm/");
});

app.get("/crm/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/crm/index.html"));
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/app-config", configRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/onboarding-calls", onboardingRoutes);
app.use("/api/v1/diet", dietRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/feedback", feedbackRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
