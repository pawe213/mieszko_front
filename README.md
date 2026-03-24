Mieszko frontend

## Authentication

All API endpoints (except `/health` and `/api/auth/registration-status`) require a JWT Bearer token.

### Step 1 — Obtain a token

```bash
curl -X POST https://phone-duty-scheduler-799156456450.europe-west1.run.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'
```

Response:

```json
{
  "access_token": "<jwt-token>",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { ... }
}
```

### Step 2 — Use the token in requests

Pass the `access_token` as a Bearer token in the `Authorization` header:

```bash
curl -X GET https://phone-duty-scheduler-799156456450.europe-west1.run.app/api/vonage/schedule/today \
  -H "Authorization: Bearer <jwt-token>"
```

JavaScript example:

```js
// 1. Login and get the token
const { access_token } = await fetch(
  'https://phone-duty-scheduler-799156456450.europe-west1.run.app/api/auth/login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'your_username', password: 'your_password' }),
  }
).then(r => r.json());

// 2. Use the token in subsequent requests
const schedule = await fetch(
  'https://phone-duty-scheduler-799156456450.europe-west1.run.app/api/vonage/schedule/today',
  {
    headers: { 'Authorization': `Bearer ${access_token}` },
  }
).then(r => r.json());
```

### Notes

- Tokens expire after `expires_in` seconds (typically 1 hour). Re-login to get a new one.
- A `401 Unauthorized` response means the token is missing, expired, or invalid.
- Public registration may be disabled; contact an administrator for an account if needed.