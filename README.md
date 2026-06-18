# Yoga Wellness Backend

Clean REST API backend for a Flutter yoga subscription app with admin-panel workflows.

## Stack

- Node.js + Express
- PostgreSQL + Prisma
- JWT authentication
- Role-based access control
- Zod validation
- Razorpay-ready payment flow
- Notification-ready database layer for Firebase/WhatsApp integration
- Zoom-ready live session creation
- Notification delivery logs and retry scheduler
- Consent and privacy-request workflows

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Smoke test:

```bash
npm run smoke
npm run rbac
```

Default API URL:

```text
http://localhost:5050/api/v1
```

Health check:

```http
GET /health
```

Flutter user app should call `POST /api/v1/auth/login/user`. Web admin panels should call `POST /api/v1/auth/login/staff`.
Flutter can fetch `GET /api/v1/app-config` for support-chat redirect URL, support hours, and panel URLs.

## Seed Login Accounts

```text
superadmin@yoga.test / SuperAdmin@123
sales@yoga.test      / SalesAdmin@123
trainer@yoga.test    / Trainer@123
dietician@yoga.test  / Dietician@123
support@yoga.test    / Support@123
user@yoga.test       / User@123
```

For Neon, keep `DATABASE_URL` as the pooled connection string and set `DIRECT_URL` to the direct/non-pooled connection string. Prisma migrations use `DIRECT_URL`.

## Main Workflow

```text
User registers/logs in
→ Fetches subscription plans
→ Creates payment order
→ Verifies payment
→ Subscription becomes active
→ User consent and health-data permissions are captured
→ Sales admin schedules onboarding call
→ Onboarding call completed
→ Sales/admin assigns dietician
→ Dietician creates diet plan
→ User/dietician tracks compliance and progress
→ Trainer schedules Zoom live sessions
→ Backend sends reminders and live-session notifications
→ User joins sessions and attendance is tracked
→ Backend marks missed sessions automatically
→ User uses chat assistance
→ User or support team creates support ticket when needed
→ Support team resolves ticket
→ Feedback and analytics are tracked
```

## Security Notes

- Do not commit `.env` or external service account JSON files.
- Rotate any secrets that were present in older backend zips.
- Use a long `JWT_SECRET` in production.
- Real Razorpay verification is enabled automatically when `RAZORPAY_KEY_SECRET` is set.
- Real Zoom meeting creation is enabled when Zoom Server-to-Server OAuth credentials are set.
- Push and WhatsApp notification attempts are logged and retried when retryable; real sending needs provider credentials before production.
- Chat support is normal human/staff support. AI auto-replies and session recordings are intentionally out of the current agreed scope.
- Privacy workflows cover user consent plus data export, deletion, and correction requests.

## Handoff Documents

- `MANAGER_HANDOFF.md`
- `FINAL_DELIVERY_NOTE.md`
- `TEST_PROOF.md`
- `SECURITY_REVIEW.md`
- `REQUIREMENT_AUDIT.md`
- `DELIVERY_CHECKLIST.md`
- `HANDOFF_SUMMARY.md`
