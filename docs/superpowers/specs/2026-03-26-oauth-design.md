# OAuth Authentication — Google & GitHub

## Status

Approved for implementation.

---

## Overview

Add Google and GitHub OAuth to the existing email/password auth system. Users can sign in with either method and accounts are auto-linked when emails match.

---

## 1. Data Model

Add `Account` model to Prisma schema:

```prisma
model Account {
  id                String  @id @default(uuid())
  userId            String
  provider          String  // "google" | "github"
  providerAccountId String // sub from OAuth provider

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@unique([provider, userId])
}
```

> Note: `accessToken`, `refreshToken`, `expiresAt` are omitted — not needed for basic OAuth sign-in. Add them only if the app later needs to call the OAuth provider API on the user's behalf.

Update `User` model:
```prisma
model User {
  // ...existing fields...
  accounts Account[]
}
```

---

## 2. Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Redirect URIs for OAuth provider consoles:
- Google: `https://<domain>/auth/oauth/google/callback`
- GitHub: `https://<domain>/auth/oauth/github/callback`

---

## 3. API Endpoints

### `GET /auth/oauth/:provider`

Initiates OAuth flow by redirecting to the provider's consent screen.

**Params:** `provider` — `google` | `github`

**Behavior:**
1. Generate random `state` string, store in short-lived cookie (5 min)
2. Redirect to provider's authorization URL with `client_id`, `redirect_uri`, `scope`, `state`

**Scopes:**
- Google: `openid email profile`
- GitHub: `user:email`

---

### `GET /auth/oauth/:provider/callback`

Handles the OAuth callback from the provider.

**Query params:** `code`, `state`

**Behavior:**
1. Validate `state` against cookie (CSRF protection)
2. Exchange `code` for tokens at provider's token endpoint
3. Fetch user info (email, name, provider-specific ID)
4. Lookup `Account` by `provider + providerAccountId`
   - **Found** → existing user, issue JWT, redirect to frontend with token
   - **Not found** → check if user with this email exists
     - **Email exists** → auto-link Account to existing user, issue JWT, redirect with token
     - **No user** → create user + Account, issue JWT, redirect with token
5. On error → redirect to frontend with error query param

**Redirect:** `https://<frontend-domain>/auth/callback?token=...&user=...` or `?error=...`

---

### `POST /auth/link-account` (authenticated)

Links an OAuth account to an already-authenticated user (e.g., from settings).

**Body:** `{ provider: "google" | "github" }` (initiates OAuth flow, returns redirect URL)

---

## 4. OAuth State Machine

```
User clicks "Sign in with Google"
    → GET /auth/oauth/google
    → redirect to Google consent
    → Google redirects to /auth/oauth/google/callback?code=...
    → validate state
    → exchange code for tokens
    → fetch user info { email, name, sub }
    → Account.findUnique(provider=google, providerAccountId=sub)
        → found: issue JWT, redirect /auth/callback?token=...
        → not found:
            → User.findUnique(email=email)
                → found: Account.create({ userId, provider=google, providerAccountId=sub }), issue JWT, redirect /auth/callback?token=...
                → not found: User.create + Account.create, issue JWT, redirect /auth/callback?token=...
```

---

## 5. Frontend Changes

### Login Page
- Add "Continue with Google" and "Continue with GitHub" buttons above the form divider
- Buttons call `GET /auth/oauth/:provider`, redirect to backend

### Callback Page (`/auth/callback`)
- On load: read `token` + `user` from URL params, store in AuthContext, redirect to dashboard
- On `error` param: show toast/alert with error message, redirect to login

### Settings Page
- "Linked Accounts" section
- Show Google/GitHub account status (linked / not linked)
- "Connect Google" / "Connect GitHub" button → calls `POST /auth/link-account` → redirects to OAuth flow
- On callback, Account linked to current user → refresh settings UI

---

## 6. Error Handling

| Error | Behavior |
|-------|----------|
| Invalid/missing state | 400 — "Invalid OAuth state" |
| Token exchange fails | Redirect to frontend with `?error=oauth_failed` |
| Provider returns error (e.g., user denied) | Redirect to frontend with `?error=access_denied` |
| Network failure on user info fetch | 500 — retry once |

---

## 7. Files to Create/Modify

### Backend
- `apps/api/src/routes/auth.ts` — add OAuth endpoints
- `apps/api/prisma/schema.prisma` — add Account model
- `apps/api/src/db.ts` — add Account to Prisma client export (if needed)
- `apps/api/src/middleware/auth.ts` — no changes needed (existing JWT middleware works as-is)
- `apps/api/src/types.ts` — add Account type

### Frontend
- `apps/web/src/pages/AuthCallbackPage/index.tsx` — new callback page
- `apps/web/src/App.tsx` — add `/auth/callback` route
- `apps/web/src/api/auth.ts` — add OAuth redirect functions
- `apps/web/src/pages/LoginPage/index.tsx` — add OAuth buttons
- `apps/web/src/pages/SettingsPage/index.tsx` — add linked accounts section

---

## 8. Testing Checklist

- [ ] Google OAuth flow: new user → creates account + logs in
- [ ] Google OAuth flow: existing password user with same email → auto-links + logs in
- [ ] Google OAuth flow: returning OAuth user → logs in
- [ ] GitHub OAuth flow: same as above
- [ ] CSRF state validation: tampered state → rejected
- [ ] Account linking from settings: authenticated user links new OAuth account
- [ ] Frontend callback page: token stored, redirects to dashboard
- [ ] Error state: invalid code → error message shown, redirected to login
