# Bhawani Fitness Backend Code Handoff

## Stack

- Backend: Node.js, Express.js
- Database: PostgreSQL on Neon
- ORM: Prisma
- CRM: Static admin panel served from the same backend at `/crm`
- Auth: JWT based staff/user authentication

## Run Locally

```bash
npm install
npm run prisma:deploy
npm run seed
npm run start
```

Backend:

```txt
http://localhost:5050
```

CRM:

```txt
http://localhost:5050/crm/?v=4
```

Health check:

```txt
http://localhost:5050/health
```

## Demo CRM Login

```txt
Email: superadmin@yoga.test
Password: SuperAdmin@123
```

## Main Backend Modules

- User registration and premium-only user login
- Staff/admin login
- Subscriptions and payments structure
- Website/app lead capture
- CRM leads panel with manual lead creation and status update
- Blog CMS panel
- Human support/chat support APIs
- Diet plan and diet compliance APIs
- Live session and attendance APIs
- Onboarding call scheduler
- Notifications and reminder structure
- Admin dashboard and sales analytics
- Audit/activity log structure

## CRM Demo Proof

The CRM can demonstrate:

- Login/logout
- Dashboard data loading
- Manual website lead save
- Lead list refresh
- Lead status update
- Blog save/list
- Finance/support/activity scope

## Security Notes

- Real `.env` should not be shared publicly.
- `.env.example` is included for setup reference.
- JWT secret and production credentials must be changed before deployment.
- Razorpay, WhatsApp, Firebase, Zoom credentials are integration placeholders until real keys are provided.

## Important

Database is PostgreSQL, not MongoDB.
