# Copilot instructions for CallCenterCounter

## Big picture architecture
- This is a single Cloudflare Worker app (no framework) with request routing in `src/index.ts`.
- `src/index.ts` owns HTTP routes, auth gates, and business rules; data access is delegated to `getRepository(env)` from `src/db.ts`.
- `src/db.ts` implements a repository over D1 (`CallsRepository`) and centralizes SQL. Keep SQL there, not in route handlers.
- `src/pages.ts` returns server-rendered HTML strings plus inline browser scripts that call `/api/*` endpoints.
- Types for Worker env and API/domain shapes are in `src/types.ts`.

## Data and security model
- Passwords are SHA-256 of `password:pepper` (`hashPassword` in `src/security.ts`), not bcrypt/argon.
- Session cookies store a raw random token, but DB stores only `sha256(token)` (`sessions.token_hash`).
- Signup invites follow the same pattern: raw token in URL, hashed token in DB (`signup_invites.token_hash`).
- Auth cookie name comes from `SESSION_COOKIE_NAME`; cookie is `Secure` only when `APP_ENV === "production"`.

## Request flow conventions
- Unauthenticated page requests redirect to `/login`; unauthenticated API requests return JSON `401`.
- Use helper response style from `src/index.ts`: `json(...)`, `html(...)`, `redirect(...)`.
- Keep email handling normalized with `normalizeEmail(...)` before DB lookups.
- Admin-only invite generation is controlled by `ADMIN_EMAIL` constant in `src/index.ts`.
- Counter increment is restricted by:
  - Call-center time window check (`isWithinCallCenterHours`, GMT+2, 07:00–14:30).
  - Per-user cooldown from `repo.getSecondsUntilNextCall(...)` (10 seconds).

## Stats and UI coupling
- `/api/stats?scope=user|total` returns `{ scope, daily, weekly, allTime }` from repository methods.
- Stats pages in `src/pages.ts` expect specific field names:
  - daily points: `{ period, count }`
  - weekly points: `{ year_week, count }`
  - all-time: `{ total_calls, active_days, first_call_at, last_call_at }`
- When changing API payload shapes, update the corresponding inline scripts in `src/pages.ts` in the same change.

## Developer workflows
- Install deps: `npm install`
- Type-check: `npm run typecheck`
- Local dev server: `npm run dev`
- Local DB reset/migrate:
  - `npm run db:delete:local`
  - `npm run db:migrate:local`
- Deploy: `npm run deploy`
- Generate password hash for seeding/manual user creation: `npm run hash:password -- <password> <pepper>`

## D1/Wrangler integration notes
- Worker bindings and env vars are defined in `wrangler.toml` (`DB`, `APP_ENV`, `SESSION_COOKIE_NAME`).
- Production secrets (like `AUTH_PEPPER`) are expected via Wrangler secrets, not committed values.
- `package.json` script `db:migrate:prod` currently points to `db/schema_prod.sql`, but repo currently has `db/schema.sql` only. Treat this as an existing workflow mismatch when touching migrations.

## Change guidance for AI agents
- Prefer minimal, surgical edits: route logic in `src/index.ts`, SQL in `src/db.ts`, markup/client behavior in `src/pages.ts`.
- Preserve existing response semantics and status codes used by current UI scripts.
- If you add a protected page, mirror the current auth pattern (redirect for page routes, JSON 401 for `/api/*`).
- If you add DB columns/tables, update `db/schema.sql` and keep repository return types aligned in `src/types.ts`.
