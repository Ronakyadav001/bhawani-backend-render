# API Contract

Base URL:

```text
http://localhost:5050/api/v1
```

Protected endpoints require:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Auth

```http
POST /auth/register
POST /auth/login
POST /auth/login/user
POST /auth/login/staff
GET /auth/me
POST /auth/staff
```

`POST /auth/staff` is super-admin only.
Flutter user app should use `POST /auth/login/user`; web admin panels should use `POST /auth/login/staff`.

## App Config

```http
GET /app-config
```

Returns support web-chat URL, support hours, panel URLs, and the intended user/staff login endpoints for app navigation.

## Users

```http
GET /users
PATCH /users/me
POST /users/me/consents
GET /users/me/consents
POST /users/me/privacy-requests
GET /users/me/data-export
GET /users/privacy-requests
PATCH /users/privacy-requests/:id
```

Consent APIs capture terms, privacy, marketing, and health-data consent versions. Privacy requests cover data export, deletion, and correction workflows for support/super-admin handling. Completing a `DATA_DELETION` request anonymizes and deactivates the user account.

## Leads

```http
POST /leads/website
GET /leads
POST /leads
PATCH /leads/:id
```

`POST /leads/website` is a public website endpoint for consultation/contact forms. It stores website enquiries in the same `Lead` table used by the sales/admin panel.

Example website payload:

```json
{
  "name": "Riya Sharma",
  "phone": "7726060202",
  "email": "riya@example.com",
  "intent": "BOOK_FREE_CONSULTATION",
  "concern": "Low AMH",
  "journey": "Trying for 2 years, wants natural fertility support",
  "page": "/fertility",
  "source": "WEBSITE",
  "utmSource": "instagram",
  "utmCampaign": "fertility-consultation"
}
```

Sales/admin users can filter leads by `source`, `status`, `concern`, `intent`, and `search`.

## Subscriptions & Payments

```http
GET /subscriptions/plans
POST /subscriptions/plans
POST /subscriptions/orders
POST /subscriptions/payments/verify
GET /subscriptions/me
GET /subscriptions/me/history
GET /subscriptions/payments
GET /subscriptions/admin
PATCH /subscriptions/admin/:id/status
```

## Onboarding Calls

```http
GET /onboarding-calls
POST /onboarding-calls
PATCH /onboarding-calls/:id
```

## Dietician & Diet Plans

```http
POST /diet/assignments
POST /diet/plans
GET /diet/plans/me
POST /diet/compliance
GET /diet/compliance
POST /diet/progress
GET /diet/progress
```

## Live Sessions & Attendance

```http
GET /sessions
POST /sessions
PATCH /sessions/:id
GET /sessions/trainer/users
GET /sessions/trainer/analytics
POST /sessions/:id/join
POST /sessions/:id/leave
GET /sessions/:id/attendance
```

## Chat Support & Tickets

```http
POST /support/chat
GET /support/chat/me
POST /support/tickets
GET /support/tickets
PATCH /support/tickets/:id
GET /support/users/:userId/history
```

`POST /support/chat` stores normal chat-assistance messages. Support tickets are created explicitly with `POST /support/tickets`.

Chat support is human/staff chat by design for the current scope. AI auto-resolution and session recordings are intentionally excluded.

## Notifications, Feedback, Admin Analytics

```http
GET /notifications
PATCH /notifications/read-all
GET /notifications/delivery-logs
POST /feedback
GET /admin/dashboard
GET /admin/sales-analytics
GET /admin/compliance-summary
GET /admin/activity-logs
```

Notifications are always stored in the database. Push/WhatsApp delivery attempts are logged in `NotificationDelivery`; retryable failures are retried by the scheduler, while missing provider credentials are marked as skipped.
The backend scheduler handles onboarding reminders, live-session reminders, "session is now live" notifications, and missed-session marking.
