# SRM Document - Bhawani Fitness Central Data Backend

## 1. Purpose

This document defines how Bhawani Fitness app data and website data will be stored and managed in one central Node.js backend. The goal is to reduce management time by giving sales, support, trainer, dietician and admin teams one source of truth for users, website enquiries, app users, subscriptions, live sessions, diet progress, support tickets and analytics.

## 2. Scope

The backend will serve:

- Flutter mobile app
- React website
- Admin and staff panels
- Sales management workflow
- Support and chat-assistance workflow
- Trainer and dietician workflow
- Central analytics and activity logs

The current implementation uses Node.js, Express, Prisma ORM and PostgreSQL.

## 3. Central Data Principle

All data must be stored in one PostgreSQL database through the Node backend.

Website forms must not store data only in frontend, WhatsApp, spreadsheets or browser storage. The website can still redirect users to WhatsApp, but the lead/enquiry record must also be submitted to the backend through:

```http
POST /api/v1/leads/website
```

The mobile app continues to use authenticated APIs for user, subscription, diet, support and session data.

## 4. User Roles

- `SUPER_ADMIN`: full system visibility, staff creation, analytics, compliance.
- `SALES_ADMIN`: website/app leads, onboarding calls, sales conversion.
- `YOGA_TRAINER`: live sessions, assigned users, attendance, trainer analytics.
- `DIETICIAN`: assigned users, diet plans, diet compliance, progress tracking.
- `SUPPORT_ADMIN`: chat assistance, tickets, user history, notification logs.
- `USER`: app client profile, subscriptions, sessions, support, diet/progress.

## 5. Website Data Flow

1. Visitor opens website.
2. Visitor clicks consultation/contact CTA.
3. Website sends form data to `POST /api/v1/leads/website`.
4. Backend stores the record in `Lead`.
5. Sales admin sees the lead in the same lead panel as app/manual leads.
6. Sales admin updates status: `NEW`, `CONTACTED`, `QUALIFIED`, `CONVERTED`, `LOST`.
7. If converted, the user can be registered in the app and subscribed to a plan.

### Website Lead Fields

- name
- phone
- email
- source
- status
- intent
- concern
- journey
- page
- notes
- country
- city
- utmSource
- utmMedium
- utmCampaign
- referrer
- ipAddress
- userAgent
- metadata

## 6. App Data Flow

1. Client registers/logs in through the Flutter app.
2. Client subscription/payment is stored through subscription APIs.
3. Onboarding calls are scheduled and tracked.
4. Trainer creates Zoom live sessions.
5. Attendance is stored when users join/leave sessions.
6. Dietician assigns plans and tracks compliance/progress.
7. Support chat/tickets are stored for full issue history.
8. Notifications and delivery attempts are logged centrally.

## 7. Required Backend Modules

### Lead & Sales CRM

- Public website lead submission.
- Protected lead listing and filtering.
- Lead status updates.
- Source-wise analytics: website, app, manual, campaign.
- Sales conversion dashboard.

### Auth & Users

- Role-based login.
- User profile.
- Staff creation by super admin.
- Consent and privacy workflows.

### Subscription & Payments

- Plans.
- Payment orders.
- Payment verification.
- User subscription history.
- Admin subscription management.

### Onboarding

- Call scheduling.
- WhatsApp reminders.
- Missed/rescheduled/completed status tracking.

### Live Sessions

- Zoom meeting creation fields.
- Reminder before session.
- Session live notification.
- Auto missed attendance handling.
- Trainer assigned-users module.
- Trainer session analytics.

### Diet & Progress

- Dietician assignment.
- Diet plan creation.
- Meal plan records.
- Diet compliance entries.
- Progress entries.

### Support

- Human chat assistance.
- Support tickets.
- User issue history.
- Support assignment and resolution tracking.

### Notifications

- In-app notifications.
- Push/WhatsApp delivery logs.
- Retry/skipped/failed delivery statuses.

### Admin & Compliance

- Dashboard.
- Sales analytics.
- Activity logs.
- Privacy request handling.
- Data export/deletion workflows.

## 8. API Summary

### Public Website API

```http
POST /api/v1/leads/website
```

Stores website enquiries in the central backend.

### Protected CRM APIs

```http
GET /api/v1/leads
POST /api/v1/leads
PATCH /api/v1/leads/:id
GET /api/v1/admin/sales-analytics
```

### App APIs

```http
POST /api/v1/auth/register
POST /api/v1/auth/login/user
GET /api/v1/subscriptions/me
GET /api/v1/sessions
POST /api/v1/sessions/:id/join
POST /api/v1/diet/compliance
POST /api/v1/support/chat
POST /api/v1/support/tickets
```

## 9. Management Dashboard Requirements

The management panel should show:

- Total website leads.
- Total app users.
- Leads by source.
- Leads by status.
- Leads by concern.
- New leads today/this week.
- Converted leads.
- Active subscriptions.
- Revenue.
- Onboarding call status.
- Open support tickets.
- Trainer session performance.
- Diet compliance progress.
- Notification delivery failures.
- Recent admin activity logs.

## 10. Website Integration Requirements

The React website should call the backend when a user submits:

- Free consultation popup.
- Contact form.
- Fertility page CTA.
- Pregnancy page CTA.
- Success stories CTA.

Recommended payload:

```json
{
  "name": "Visitor Name",
  "phone": "Visitor WhatsApp Number",
  "email": "optional@email.com",
  "intent": "BOOK_FREE_CONSULTATION",
  "concern": "PCOS / Low AMH / Pregnancy / Male Fertility",
  "journey": "Visitor message",
  "page": "/fertility",
  "source": "WEBSITE",
  "utmSource": "instagram",
  "utmMedium": "social",
  "utmCampaign": "fertility"
}
```

After successful backend submission, the website may open WhatsApp with a pre-filled message.

## 11. Security Requirements

- Public website lead endpoint must only accept lead form fields.
- Admin lead listing must remain protected with JWT and role checks.
- Rate limiting should stay enabled.
- CORS should allow only approved website/app domains in production.
- No secrets must be stored in frontend code.
- Activity logs should capture mutations.
- Health data and consent data must remain protected.

## 12. Current Implementation Status

Completed in the backend:

- Central `Lead` model enhanced for website/app source tracking.
- Public endpoint: `POST /api/v1/leads/website`.
- Protected lead management remains available.
- Sales analytics now includes lead counts by source and status.
- Prisma migration added for website lead fields.
- API docs updated.

Pending for frontend wiring:

- Update latest React website forms to call `POST /api/v1/leads/website`.
- Add environment variable such as `VITE_API_BASE_URL`.
- Keep WhatsApp redirect after successful backend submission.

## 13. Delivery Notes

The backend remains Node.js based and is suitable for both app and website data centralization. The React website ZIP contains latest frontend code and assets; it should be connected to this backend through the public website lead endpoint.
