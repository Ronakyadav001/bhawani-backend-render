const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");

const prisma = new PrismaClient();

async function main() {
  const superAdminPassword = await hashPassword("SuperAdmin@123");
  const salesPassword = await hashPassword("SalesAdmin@123");
  const trainerPassword = await hashPassword("Trainer@123");
  const dieticianPassword = await hashPassword("Dietician@123");
  const supportPassword = await hashPassword("Support@123");
  const userPassword = await hashPassword("User@123");

  await prisma.user.upsert({
    where: { email: "superadmin@yoga.test" },
    update: {},
    create: { name: "Super Admin", email: "superadmin@yoga.test", passwordHash: superAdminPassword, role: "SUPER_ADMIN" }
  });
  await prisma.user.upsert({
    where: { email: "sales@yoga.test" },
    update: {},
    create: { name: "Sales Admin", email: "sales@yoga.test", passwordHash: salesPassword, role: "SALES_ADMIN" }
  });
  await prisma.user.upsert({
    where: { email: "trainer@yoga.test" },
    update: {},
    create: { name: "Yoga Trainer", email: "trainer@yoga.test", passwordHash: trainerPassword, role: "YOGA_TRAINER" }
  });
  await prisma.user.upsert({
    where: { email: "dietician@yoga.test" },
    update: {},
    create: { name: "Dietician", email: "dietician@yoga.test", passwordHash: dieticianPassword, role: "DIETICIAN" }
  });
  await prisma.user.upsert({
    where: { email: "support@yoga.test" },
    update: {},
    create: { name: "Support Admin", email: "support@yoga.test", passwordHash: supportPassword, role: "SUPPORT_ADMIN" }
  });
  const demoUser = await prisma.user.upsert({
    where: { email: "user@yoga.test" },
    update: {},
    create: {
      name: "Demo User",
      email: "user@yoga.test",
      phone: "9999999999",
      passwordHash: userPassword,
      role: "USER",
      age: 28,
      gender: "female",
      heightCm: 165,
      weightKg: 68,
      goal: "Weight loss and flexibility",
      activityLevel: "Moderate"
    }
  });

  const plans = [
    {
      name: "Monthly Wellness",
      description: "Daily live yoga with dietician support.",
      duration: "MONTHLY",
      price: 1999,
      yogaSessions: 30,
      hasDietician: true,
      hasLiveClasses: true,
      features: ["Daily live yoga", "Personal diet plan", "Chat assistance", "Attendance tracking"]
    },
    {
      name: "Quarterly Transformation",
      description: "Three month guided yoga and wellness program.",
      duration: "QUARTERLY",
      price: 4999,
      yogaSessions: 90,
      hasDietician: true,
      hasLiveClasses: true,
      features: ["Daily live yoga", "Dietician revisions", "Attendance tracking", "Priority support"]
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.name.toLowerCase().replaceAll(" ", "-") },
      update: plan,
      create: { id: plan.name.toLowerCase().replaceAll(" ", "-"), ...plan }
    });
  }

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  await prisma.userSubscription.upsert({
    where: { id: "demo-user-active-subscription" },
    update: {
      status: "ACTIVE",
      endDate
    },
    create: {
      id: "demo-user-active-subscription",
      userId: demoUser.id,
      planId: "monthly-wellness",
      status: "ACTIVE",
      startDate: new Date(),
      endDate
    }
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
