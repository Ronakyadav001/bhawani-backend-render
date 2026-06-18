const app = require("./app");
const { prisma } = require("./config/database");
const { env } = require("./config/env");
const { startScheduler, stopScheduler } = require("./services/scheduler.service");

async function startServer() {
  try {
    await prisma.$connect();
    app.locals.databaseReady = true;
  } catch (error) {
    app.locals.databaseReady = false;
    console.error("Database connection failed. CRM shell will still open, but data APIs need DATABASE_URL to be reachable.");
    console.error(error.message);
  }

  app.listen(env.PORT, () => {
    console.log(`Yoga Wellness API running on port ${env.PORT}`);
    console.log(`CRM panel available at http://localhost:${env.PORT}/crm`);
  });

  if (app.locals.databaseReady) {
    startScheduler();
  }
}

process.on("SIGINT", async () => {
  stopScheduler();
  await prisma.$disconnect();
  process.exit(0);
});

startServer().catch(async (error) => {
  console.error("Failed to start server:", error);
  await prisma.$disconnect();
  process.exit(1);
});
