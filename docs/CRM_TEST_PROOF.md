# CRM Test Proof

Test date: 2026-05-30  
Local backend URL: `http://localhost:5050`  
CRM URL: `http://localhost:5050/crm`

## Test Result

Status: Passed

Verified:

- Backend health endpoint opened.
- CRM page opened at `/crm/`.
- Staff login worked with seeded Super Admin account.
- Website lead API created a lead successfully.
- Protected lead listing fetched saved leads.
- Sales analytics fetched total lead count.
- Prisma migration for website lead fields was applied successfully.

## Smoke Test Output

```text
login ok: SUPER_ADMIN
lead ok: 58cc5def-3060-4911-8fd3-a2c1d898fd57
leads fetched: 11
analytics leads: 11
```

## CRM Login

```text
Email: superadmin@yoga.test
Password: SuperAdmin@123
```

## Important Run Command

```bash
npm install
npm run prisma:deploy
npm run seed
npm run start
```

Then open:

```text
http://localhost:5000/crm
```

If `.env` has `PORT=5050`, open:

```text
http://localhost:5050/crm
```
