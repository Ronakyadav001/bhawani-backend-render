# CRM Open and Test Guide

## CRM URL

After starting the backend, open:

```text
http://localhost:5000/crm
```

If the backend runs on another port, replace `5000` with that port.

## Start Backend

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
npm run start
```

## Demo Staff Login

```text
Email: superadmin@yoga.test
Password: SuperAdmin@123
```

## What To Test

1. Open `/crm`.
2. API status should show healthy.
3. Login using the demo staff account.
4. Dashboard numbers should load.
5. Click `Create Test Lead`.
6. The new lead should appear in Latest Leads.
7. Refresh the page and login again. The lead should still be visible because it is stored in PostgreSQL.

## Important Notes

- CRM is served from the same Node backend.
- Website/app enquiries save in the same `Lead` table.
- Chat support, escalation tickets, and issue history are available through backend APIs.
- Zoom recording and session recording storage are intentionally removed from the active scope.
