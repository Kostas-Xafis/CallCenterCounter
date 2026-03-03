# Call Center Counter (Astro + Cloudflare Workers)

A Cloudflare Workers website for call center agents to:

- Sign in with email/password
- Increment personal incoming-call counter
- View charts for personal and global stats
- Generate secure, expiring invite links for new-user signup

## Architecture

- **UI Framework**: Astro
- **Adapter**: `@astrojs/cloudflare`
- **Runtime**: Cloudflare Workers (Astro pages + Worker API)
- **Development DB**: Cloudflare D1 (SQLite)
- **Production DB**: Cloudflare D1

The app uses D1 in both development and production.

Current responsibility split:

- `src/pages/**/*.astro`: SSR page routes (login, app, stats, signup, admin)
- `src/pages/api/[...path].ts`: forwards `/api/*` requests to Worker handler
- `src/index.ts`: API/auth business rules and JSON responses
- `src/db.ts`: D1 repository and SQL queries

## Database schema

Schema file: `db/schema.sql`

Includes:

- `users` (`email`, `password_hash`)
- `sessions`
- `calls`
- `signup_invites` (hashed token + 5-day expiry)

You can insert your own users later by generating password hashes using the same logic as `src/security.ts` (`SHA-256(password + ':' + AUTH_PEPPER)`).

## Setup

```bash
npm install
```

Run local DB migration (D1 local/SQLite):

```bash
npm run db:migrate:local
```

Run locally (Astro dev server with Cloudflare platform bindings):

```bash
npm run dev
```

Typecheck Astro + TypeScript:

```bash
npm run typecheck
```

Build for Cloudflare Workers:

```bash
npm run build
```

Preview Worker output locally:

```bash
npm run preview
```

## Environment values

In `wrangler.toml` (and later your env/secrets), configure:

- `APP_ENV` (`development` or `production`)
- `AUTH_PEPPER`
- `SESSION_COOKIE_NAME`

For secrets, use Wrangler secrets:

```bash
wrangler secret put AUTH_PEPPER
```

Deploy:

```bash
npm run deploy
```

## Invite-only signup flow

- Only the signed-in account `koxafis@gmail.com` can access `/admin/invites`.
- That page generates a one-time invite URL for a target email.
- Invite links expire after 5 days and expired/used invites are deleted automatically.
- The invited user opens the link, confirms the invited email, and then completes signup (first name, last name, password).

## API overview

Primary endpoints (all under `/api/*`):

- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `POST /api/calls/increment`
- `POST /api/calls/remove-last`
- `GET /api/stats?scope=user|total`
- `POST /api/admin/invites` (admin only)
- `POST /api/signup/verify-invite`
- `POST /api/signup/complete`

Authentication behavior:

- Unauthenticated API requests return `401` JSON.
- Unauthenticated page requests redirect to `/login`.

Call window behavior:

- Production enforces 07:00–14:30 (GMT+2) for call increments.
- Development allows increments at any time.
