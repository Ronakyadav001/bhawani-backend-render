# Render Deploy Handoff - Backend Ready

Date: 2026-06-18

## Current Status

The backend is verified and ready for Render deployment.

Verified locally with the configured database:

- `npm run check` - PASS
- `npm run seed` - PASS
- `npm run smoke` - PASS
- `npm run rbac` - PASS
- `GET /health` - PASS, database connected

## Important Update Made Today

Premium-only login was already enabled, but the demo seed user did not have an active subscription. That caused app login to fail with:

`Access denied. Only premium members can login to the app.`

Updated `prisma/seed.js` so the demo user gets an active 1-year premium subscription automatically:

`user@yoga.test / User@123`

This keeps the premium-only rule intact while making the demo account usable for today's client showing.

## Render Files Added

Added `render.yaml` with:

- Node web service
- Build command: `npm install && npm run prisma:generate && npm run prisma:deploy`
- Start command: `npm start`
- Health check: `/health`
- Required environment variable placeholders

## Render Environment Variables Needed

Set these in Render dashboard:

- `NODE_ENV=production`
- `PORT=10000`
- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `CORS_ORIGIN`
- Optional: Razorpay, Zoom, WhatsApp, FCM, support/admin panel URLs

For Neon:

- `DATABASE_URL` should be the pooled connection string.
- `DIRECT_URL` should be the direct/non-pooled connection string.

## Deploy Package

Updated backend ZIP:

`bhawani-backend-render-ready-2026-06-18.zip`

This excludes `.env` and `node_modules`, and includes source, Prisma migrations, public CRM/static panels, docs, tests, and Render config.

## Demo Credentials

Staff/admin:

- `superadmin@yoga.test / SuperAdmin@123`
- `sales@yoga.test / SalesAdmin@123`
- `trainer@yoga.test / Trainer@123`
- `dietician@yoga.test / Dietician@123`
- `support@yoga.test / Support@123`

Premium app user:

- `user@yoga.test / User@123`

## Demo URLs After Render Deploy

Replace `<render-url>` with the deployed service URL:

- Health: `<render-url>/health`
- CRM: `<render-url>/crm`
- Interfaces: `<render-url>/interfaces`
- API base: `<render-url>/api/v1`

## Deploy Blocker

Direct deployment could not be completed from this machine because:

- Render CLI is not installed.
- Git remote is not configured in this folder.
- No Render API key/account access is available in the environment.

To deploy directly, provide either:

1. Render dashboard access / API key, or
2. GitHub repo remote connected to Render, so the updated backend can be pushed and auto-deployed.
