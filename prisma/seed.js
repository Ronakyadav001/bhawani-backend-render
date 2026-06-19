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
  const salesAdmin = await prisma.user.upsert({
    where: { email: "sales@yoga.test" },
    update: {},
    create: { name: "Sales Admin", email: "sales@yoga.test", passwordHash: salesPassword, role: "SALES_ADMIN" }
  });
  const trainer = await prisma.user.upsert({
    where: { email: "trainer@yoga.test" },
    update: {},
    create: { name: "Yoga Trainer", email: "trainer@yoga.test", passwordHash: trainerPassword, role: "YOGA_TRAINER" }
  });
  const dietician = await prisma.user.upsert({
    where: { email: "dietician@yoga.test" },
    update: {},
    create: { name: "Dietician", email: "dietician@yoga.test", passwordHash: dieticianPassword, role: "DIETICIAN" }
  });
  const supportAdmin = await prisma.user.upsert({
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

  await prisma.payment.upsert({
    where: { id: "demo-completed-payment" },
    update: {
      status: "COMPLETED",
      amount: 1999
    },
    create: {
      id: "demo-completed-payment",
      userId: demoUser.id,
      planId: "monthly-wellness",
      amount: 1999,
      status: "COMPLETED",
      providerOrderId: "order_demo_completed",
      providerPaymentId: "pay_demo_completed"
    }
  });

  await prisma.lead.upsert({
    where: { id: "demo-hot-website-lead" },
    update: {
      status: "HOT",
      concern: "Female Fertility",
      intent: "Subscription enquiry"
    },
    create: {
      id: "demo-hot-website-lead",
      name: "Demo Client",
      email: "demo.client@example.com",
      phone: "7726060202",
      source: "WEBSITE",
      status: "HOT",
      intent: "Subscription enquiry",
      concern: "Female Fertility",
      journey: "Website enquiry to sales onboarding",
      page: "/female-fertility-yoga",
      notes: "Seeded lead for Sales Team Panel demo."
    }
  });

  const onboardingCall = await prisma.onboardingCall.upsert({
    where: { id: "demo-completed-onboarding-call" },
    update: {
      status: "COMPLETED",
      scheduledById: salesAdmin.id,
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    create: {
      id: "demo-completed-onboarding-call",
      userId: demoUser.id,
      scheduledById: salesAdmin.id,
      scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: "COMPLETED",
      meetingLink: "https://meet.google.com/demo-bhawani",
      notes: "Seeded completed onboarding call for sales workflow."
    }
  });

  await prisma.dieticianAssignment.updateMany({
    where: { userId: demoUser.id, isActive: true },
    data: { isActive: false }
  });

  await prisma.dieticianAssignment.upsert({
    where: { id: "demo-active-dietician-assignment" },
    update: {
      dieticianId: dietician.id,
      assignedBy: salesAdmin.id,
      isActive: true
    },
    create: {
      id: "demo-active-dietician-assignment",
      userId: demoUser.id,
      dieticianId: dietician.id,
      assignedBy: salesAdmin.id,
      isActive: true,
      notes: `Assigned after onboarding call ${onboardingCall.id}.`
    }
  });

  const dietPlan = await prisma.dietPlan.upsert({
    where: { id: "demo-weekly-diet-plan" },
    update: {
      dieticianId: dietician.id,
      isActive: true,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    create: {
      id: "demo-weekly-diet-plan",
      userId: demoUser.id,
      dieticianId: dietician.id,
      title: "Seeded Weekly Fertility Wellness Plan",
      description: "Personalized diet plan for live backend panel demo.",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  await prisma.dietMeal.deleteMany({ where: { dietPlanId: dietPlan.id } });
  await prisma.dietMeal.createMany({
    data: [
      {
        dietPlanId: dietPlan.id,
        dayOfWeek: 1,
        mealType: "Breakfast",
        title: "Protein breakfast with fruit",
        calories: 350,
        proteinGrams: 22,
        carbsGrams: 42,
        fatsGrams: 10,
        instructions: "Hydrate before breakfast and avoid refined sugar."
      },
      {
        dietPlanId: dietPlan.id,
        dayOfWeek: 1,
        mealType: "Lunch",
        title: "Balanced dal, roti and salad plate",
        calories: 520,
        proteinGrams: 28,
        carbsGrams: 65,
        fatsGrams: 14,
        instructions: "Add seasonal vegetables and curd."
      }
    ]
  });

  const complianceDate = new Date();
  complianceDate.setHours(0, 0, 0, 0);

  await prisma.dietComplianceEntry.upsert({
    where: { userId_dietPlanId_date: { userId: demoUser.id, dietPlanId: dietPlan.id, date: complianceDate } },
    update: {
      followed: true,
      mealsFollowed: 4,
      notes: "Seeded compliance record for Dietician Panel."
    },
    create: {
      userId: demoUser.id,
      dietPlanId: dietPlan.id,
      date: complianceDate,
      followed: true,
      mealsFollowed: 4,
      notes: "Seeded compliance record for Dietician Panel."
    }
  });

  await prisma.progressEntry.create({
    data: {
      userId: demoUser.id,
      date: new Date(),
      weightKg: 67.8,
      energyLevel: 8,
      sleepHours: 7,
      notes: "Seeded progress record for Dietician Panel."
    }
  });

  const liveSession = await prisma.liveSession.upsert({
    where: { id: "demo-live-yoga-session" },
    update: {
      trainerId: trainer.id,
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: "SCHEDULED"
    },
    create: {
      id: "demo-live-yoga-session",
      trainerId: trainer.id,
      title: "Daily Fertility Yoga Session",
      category: "Fertility Yoga",
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      durationMin: 45,
      liveLink: "https://meet.google.com/demo-yoga-session",
      status: "SCHEDULED"
    }
  });

  await prisma.sessionAttendance.upsert({
    where: { sessionId_userId: { sessionId: liveSession.id, userId: demoUser.id } },
    update: {
      status: "JOINED",
      durationAttended: 32,
      joinedAt: new Date(Date.now() - 60 * 60 * 1000)
    },
    create: {
      sessionId: liveSession.id,
      userId: demoUser.id,
      status: "JOINED",
      durationAttended: 32,
      joinedAt: new Date(Date.now() - 60 * 60 * 1000)
    }
  });

  await prisma.supportTicket.upsert({
    where: { id: "demo-open-support-ticket" },
    update: {
      assignedToId: supportAdmin.id,
      status: "IN_PROGRESS"
    },
    create: {
      id: "demo-open-support-ticket",
      userId: demoUser.id,
      assignedToId: supportAdmin.id,
      subject: "AI chat escalation for session timing",
      description: "Client needs manual support after automated chat assistance.",
      status: "IN_PROGRESS",
      priority: "HIGH"
    }
  });

  await prisma.chatMessage.create({
    data: {
      userId: demoUser.id,
      senderId: supportAdmin.id,
      senderType: "SUPPORT_ADMIN",
      message: "Support team is reviewing your session timing query."
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
