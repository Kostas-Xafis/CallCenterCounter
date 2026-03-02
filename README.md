# Call Center Counter (Cloudflare Workers)

A Cloudflare Workers website for call center agents to:

- Sign in with email/password
- Increment personal incoming-call counter
- View charts for personal and global stats

## Architecture

- **Runtime**: Cloudflare Workers
- **Development DB**: Cloudflare D1 (SQLite)
- **Production DB**: Turso (libSQL)

The app automatically uses:

- D1 when `APP_ENV=development`
- Turso when `APP_ENV=production`

## Database schema

Schema file: `db/schema.sql`

Includes:

- `users` (`email`, `password_hash`)
- `sessions`
- `calls`

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
- `TURSO_DATABASE_URL` (production)
- `TURSO_AUTH_TOKEN` (production)

For production secrets, use Wrangler secrets:

```bash
wrangler secret put AUTH_PEPPER
wrangler secret put TURSO_AUTH_TOKEN
```

Deploy:

```bash
npm run deploy
```
