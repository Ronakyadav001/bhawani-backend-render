# Flutter Integration Guide

Base URL:

```text
http://localhost:5050/api/v1
```

For Android emulator, use:

```text
http://10.0.2.2:5050/api/v1
```

For iOS simulator, `localhost` usually works.

## Auth Handling

After login/register, store:

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "role": "USER"
  }
}
```

Send token on protected APIs:

```http
Authorization: Bearer JWT_TOKEN
Content-Type: application/json
```

## Response Format

Success:

```json
{
  "success": true,
  "message": "Done",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

## Screen To API Mapping

### Login Screen

```http
POST /auth/login/user
```

Body:

```json
{
  "email": "user@yoga.test",
  "password": "User@123"
}
```

### Register Screen

```http
POST /auth/register
```

Body:

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "phone": "9999999999",
  "password": "User@123"
}
```

### Profile Screen

```http
GET /auth/me
PATCH /users/me
POST /users/me/consents
GET /users/me/consents
```

### App Config

```http
GET /app-config
```

Use this to get support web-chat redirect URL, support hours, and panel URLs. Flutter should open `support.chatUrl` when the user taps chat support if the support website is handling live support timing.

Update body:

```json
{
  "age": 28,
  "gender": "female",
  "heightCm": 165,
  "weightKg": 68,
  "goal": "Weight loss and flexibility",
  "activityLevel": "Moderate",
  "fcmToken": "firebase-device-token"
}
```

Health-data consent body:

```json
{
  "type": "HEALTH_DATA",
  "accepted": true,
  "version": "1.0",
  "source": "flutter"
}
```

User privacy requests:

```http
POST /users/me/privacy-requests
GET /users/me/data-export
GET /users/privacy-requests
```

Create privacy request body:

```json
{
  "type": "DATA_EXPORT",
  "reason": "Please export my account data."
}
```

### Subscription Plans Screen

```http
GET /subscriptions/plans
```

### Payment Screen

Create order:

```http
POST /subscriptions/orders
```

Body:

```json
{
  "planId": "monthly-wellness"
}
```

Verify payment:

```http
POST /subscriptions/payments/verify
```

For development without real Razorpay keys:

```json
{
  "providerOrderId": "ORDER_ID_FROM_CREATE_ORDER"
}
```

For real Razorpay:

```json
{
  "providerOrderId": "razorpay_order_id",
  "providerPaymentId": "razorpay_payment_id",
  "providerSignature": "razorpay_signature"
}
```

### Active Subscription Screen

```http
GET /subscriptions/me
GET /subscriptions/me/history
```

### Diet Plan Screen

```http
GET /diet/plans/me
POST /diet/compliance
GET /diet/compliance
POST /diet/progress
GET /diet/progress
```

### Live Sessions Screen

```http
GET /sessions
GET /sessions?date=2026-05-08
GET /sessions?category=Beginner
```

Users need an active subscription to join live sessions.
The backend scheduler sends reminders, live notifications, and marks missed sessions automatically.

Join session:

```http
POST /sessions/:id/join
```

Leave/update attendance:

```http
POST /sessions/:id/leave
```

Body:

```json
{
  "durationAttended": 35
}
```

### Notifications Screen

```http
GET /notifications
PATCH /notifications/read-all
```

Each notification includes delivery status rows when push/WhatsApp delivery was attempted or skipped.

### Chat Support Screen

Send normal chat-support message:

```http
POST /support/chat
```

Body:

```json
{
  "message": "What should I eat before yoga?"
}
```

Staff reply body:

```json
{
  "userId": "USER_ID",
  "message": "Your dietician will update the plan today."
}
```

Chat history:

```http
GET /support/chat/me
```

This module is human chat support only. AI auto-replies are not part of the current agreed scope.

### Support Tickets Screen

```http
POST /support/tickets
GET /support/tickets
```

Create ticket body:

```json
{
  "subject": "Payment issue",
  "description": "My payment is deducted but subscription is not visible.",
  "priority": "HIGH"
}
```

### Feedback Screen

```http
POST /feedback
```

Body:

```json
{
  "step": "LIVE_SESSION",
  "rating": 5,
  "comment": "Great session"
}
```

## Admin Panel APIs

Sales admin:

```http
GET /leads
POST /leads
PATCH /leads/:id
GET /users?role=USER
GET /subscriptions/admin
GET /subscriptions/payments
PATCH /subscriptions/admin/:id/status
GET /onboarding-calls
POST /onboarding-calls
PATCH /onboarding-calls/:id
POST /diet/assignments
GET /admin/dashboard
```

Trainer:

```http
POST /sessions
PATCH /sessions/:id
GET /sessions/trainer/users
GET /sessions/trainer/analytics
GET /sessions/:id/attendance
```

Live sessions are Zoom-based. If Zoom credentials are configured in `.env`, creating a session returns Zoom meeting IDs and join/start URLs.

Dietician:

```http
POST /diet/plans
GET /diet/plans/me
```

Support:

```http
GET /support/tickets
PATCH /support/tickets/:id
GET /support/users/:userId/history
GET /notifications/delivery-logs
GET /users/privacy-requests
PATCH /users/privacy-requests/:id
GET /admin/compliance-summary
```

Super admin:

```http
POST /auth/login/staff
POST /auth/staff
GET /admin/activity-logs
```

## Demo Accounts

```text
superadmin@yoga.test / SuperAdmin@123
sales@yoga.test      / SalesAdmin@123
trainer@yoga.test    / Trainer@123
dietician@yoga.test  / Dietician@123
support@yoga.test    / Support@123
user@yoga.test       / User@123
```
