# Website Backend Integration

This document explains how the latest React website should send consultation leads to the central Node backend.

## Environment Variable

Create `.env` in the React website project:

```env
VITE_API_BASE_URL=http://localhost:5050/api/v1
```

Production example:

```env
VITE_API_BASE_URL=https://api.bhawanifitness.com/api/v1
```

## Endpoint

```http
POST /api/v1/leads/website
Content-Type: application/json
```

This endpoint is public and stores website enquiries in the same backend/database as app users and admin data.

## Recommended Payload

```json
{
  "name": "Visitor Name",
  "phone": "Visitor WhatsApp Number",
  "email": "optional@email.com",
  "intent": "BOOK_FREE_CONSULTATION",
  "concern": "Low AMH",
  "journey": "Trying to conceive for 2 years",
  "page": "/fertility",
  "source": "WEBSITE",
  "utmSource": "instagram",
  "utmMedium": "social",
  "utmCampaign": "fertility"
}
```

## React Submit Logic

Use this pattern inside `src/components/ConsultModal.jsx` before opening WhatsApp:

```jsx
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

async function submitWebsiteLead(payload) {
  if (!apiBaseUrl) return;

  const response = await fetch(`${apiBaseUrl}/leads/website`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Lead submission failed');
  }
}
```

Then in `handleSubmit`:

```jsx
const payload = {
  name: fullName,
  phone: whatsapp,
  concern,
  journey,
  source: 'WEBSITE',
  intent: 'BOOK_FREE_CONSULTATION',
  page: window.location.pathname,
  referrer: document.referrer || undefined,
  utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
  utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
  utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
};

try {
  await submitWebsiteLead(payload);
} catch (error) {
  console.warn(error);
}
```

The website can still open WhatsApp after backend submission. This gives the sales team both:

- instant WhatsApp conversation
- stored CRM lead in backend

## Management Panel Usage

Sales/admin panel should call:

```http
GET /api/v1/leads?source=WEBSITE
GET /api/v1/leads?status=NEW
GET /api/v1/leads?concern=Low%20AMH
GET /api/v1/admin/sales-analytics
```

## Important Notes

- Website lead endpoint does not require auth.
- Admin listing/update endpoints still require staff JWT.
- Backend rate limiting is already enabled.
- Production CORS should be set to the official app/admin/website domains.
