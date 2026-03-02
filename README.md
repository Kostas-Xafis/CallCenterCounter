# Call Center Counter (Cloudflare Workers)

A Cloudflare Workers website for call center agents to:

- Sign in with email/password
- Increment personal incoming-call counter
- View charts for personal and global stats
- Generate secure, expiring invite links for new-user signup

## Architecture

- **Runtime**: Cloudflare Workers
- **Development DB**: Cloudflare D1 (SQLite)
- **Production DB**: Cloudflare D1

The app uses D1 in both development and production.

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

Run locally:

```bash
npm run dev
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
