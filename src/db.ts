import { D1Database } from "@cloudflare/workers-types";
import type { AllTimeStats, DailyPoint, Env, User, WeeklyPoint } from "./types";

interface DatabaseAdapter {
    getUserByEmail(email: string): Promise<User | null>;
    getUserBySessionTokenHash(tokenHash: string): Promise<{ id: number; email: string; first_name: string; last_name: string; } | null>;
    createUser(email: string, firstName: string, lastName: string, passwordHash: string): Promise<void>;
    createSession(userId: number, tokenHash: string, expiresAt: string): Promise<void>;
    deleteSession(tokenHash: string): Promise<void>;
    cleanupExpiredInvites(): Promise<void>;
    createSignupInvite(email: string, tokenHash: string, expiresAt: string): Promise<void>;
    getSignupInviteByTokenHash(tokenHash: string): Promise<{ id: number; email: string; expires_at: string; used_at: string | null; } | null>;
    deleteSignupInviteById(id: number): Promise<void>;
    getSecondsUntilNextCall(userId: number): Promise<number>;
    insertCall(userId: number): Promise<void>;
    getUserSummary(userId: number): Promise<{ todayCalls: number; totalCalls: number; }>;
    getDailyStats(scope: "user" | "total", userId: number): Promise<DailyPoint[]>;
    getWeeklyStats(scope: "user" | "total", userId: number): Promise<WeeklyPoint[]>;
    getAllTimeStats(scope: "user" | "total", userId: number): Promise<AllTimeStats>;
}

interface Queryable {
    first<T>(sql: string, args?: unknown[]): Promise<T | null>;
    all<T>(sql: string, args?: unknown[]): Promise<T[]>;
    run(sql: string, args?: unknown[]): Promise<void>;
}

class D1Queryable implements Queryable {
    constructor(private readonly db: D1Database) { }

    async first<T>(sql: string, args: unknown[] = []): Promise<T | null> {
        const statement = this.db.prepare(sql).bind(...args);
        const row = await statement.first<T>();
        return row ?? null;
    }

    async all<T>(sql: string, args: unknown[] = []): Promise<T[]> {
        const statement = this.db.prepare(sql).bind(...args);
        const result = await statement.all<T>();
        return result.results;
    }

    async run(sql: string, args: unknown[] = []): Promise<void> {
        const statement = this.db.prepare(sql).bind(...args);
        await statement.run();
    }
}

class CallsRepository implements DatabaseAdapter {
    constructor(private readonly queryable: Queryable) { }

    getUserByEmail(email: string): Promise<User | null> {
        return this.queryable.first<User>(
            `SELECT id, email, first_name, last_name, password_hash
       FROM users
       WHERE email = ?`,
            [email],
        );
    }

    getUserBySessionTokenHash(tokenHash: string): Promise<{ id: number; email: string; first_name: string; last_name: string; } | null> {
        return this.queryable.first<{ id: number; email: string; first_name: string; last_name: string; }>(
            `SELECT u.id, u.email, u.first_name, u.last_name
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND datetime(s.expires_at) > datetime('now')`,
            [tokenHash],
        );
    }

    createUser(email: string, firstName: string, lastName: string, passwordHash: string): Promise<void> {
        return this.queryable.run(
            `INSERT INTO users (email, first_name, last_name, password_hash)
       VALUES (?, ?, ?, ?)`,
            [email, firstName, lastName, passwordHash],
        );
    }

    createSession(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
        return this.queryable.run(
            `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES (?, ?, ?)`,
            [userId, tokenHash, expiresAt],
        );
    }

    deleteSession(tokenHash: string): Promise<void> {
        return this.queryable.run(`DELETE FROM sessions WHERE token_hash = ?`, [tokenHash]);
    }

    cleanupExpiredInvites(): Promise<void> {
        return this.queryable.run(
            `DELETE FROM signup_invites
       WHERE datetime(expires_at) <= datetime('now')
          OR used_at IS NOT NULL`,
        );
    }

    async createSignupInvite(email: string, tokenHash: string, expiresAt: string): Promise<void> {
        await this.queryable.run(`DELETE FROM signup_invites WHERE email = ?`, [email]);
        await this.queryable.run(
            `INSERT INTO signup_invites (email, token_hash, expires_at)
       VALUES (?, ?, ?)`,
            [email, tokenHash, expiresAt],
        );
    }

    getSignupInviteByTokenHash(tokenHash: string): Promise<{ id: number; email: string; expires_at: string; used_at: string | null; } | null> {
        return this.queryable.first<{ id: number; email: string; expires_at: string; used_at: string | null; }>(
            `SELECT id, email, expires_at, used_at
       FROM signup_invites
       WHERE token_hash = ?`,
            [tokenHash],
        );
    }

    deleteSignupInviteById(id: number): Promise<void> {
        return this.queryable.run(`DELETE FROM signup_invites WHERE id = ?`, [id]);
    }

    async getSecondsUntilNextCall(userId: number): Promise<number> {
        const row = await this.queryable.first<{ seconds_remaining: number; }>(
            `SELECT MAX(
          0,
          10 - (
            strftime('%s', 'now') - COALESCE(strftime('%s', MAX(created_at)), strftime('%s', 'now') - 10)
          )
        ) AS seconds_remaining
       FROM calls
       WHERE user_id = ?`,
            [userId],
        );

        return Number(row?.seconds_remaining ?? 0);
    }

    insertCall(userId: number): Promise<void> {
        return this.queryable.run(`INSERT INTO calls (user_id) VALUES (?)`, [userId]);
    }

    async getUserSummary(userId: number): Promise<{ todayCalls: number; totalCalls: number; }> {
        const row = await this.queryable.first<{ today_calls: number; total_calls: number; }>(
            `SELECT
         SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) AS today_calls,
         COUNT(*) AS total_calls
       FROM calls
       WHERE user_id = ?`,
            [userId],
        );

        return {
            todayCalls: Number(row?.today_calls ?? 0),
            totalCalls: Number(row?.total_calls ?? 0),
        };
    }

    async getDailyStats(scope: "user" | "total", userId: number): Promise<DailyPoint[]> {
        const whereClause = scope === "user" ? "AND user_id = ?" : "";
        const args = scope === "user" ? [userId] : [];

        const rows = await this.queryable.all<{ period: string; count: number; }>(
            `SELECT date(created_at) AS period, COUNT(*) AS count
       FROM calls
       WHERE date(created_at) >= date('now', '-6 days') ${whereClause}
       GROUP BY date(created_at)
       ORDER BY date(created_at) ASC`,
            args,
        );

        return rows.map((row) => ({ period: row.period, count: Number(row.count) }));
    }

    async getWeeklyStats(scope: "user" | "total", userId: number): Promise<WeeklyPoint[]> {
        const whereClause = scope === "user" ? "AND user_id = ?" : "";
        const args = scope === "user" ? [userId] : [];

        const rows = await this.queryable.all<{ year_week: string; count: number; }>(
            `SELECT strftime('%Y-W%W', created_at) AS year_week, COUNT(*) AS count
       FROM calls
       WHERE date(created_at) >= date('now', '-27 days') ${whereClause}
       GROUP BY strftime('%Y-W%W', created_at)
       ORDER BY year_week ASC`,
            args,
        );

        return rows.map((row) => ({ year_week: row.year_week, count: Number(row.count) }));
    }

    async getAllTimeStats(scope: "user" | "total", userId: number): Promise<AllTimeStats> {
        const whereClause = scope === "user" ? "WHERE user_id = ?" : "";
        const args = scope === "user" ? [userId] : [];

        const row = await this.queryable.first<AllTimeStats>(
            `SELECT
         COUNT(*) AS total_calls,
         COUNT(DISTINCT date(created_at)) AS active_days,
         MIN(created_at) AS first_call_at,
         MAX(created_at) AS last_call_at
       FROM calls
       ${whereClause}`,
            args,
        );

        return {
            total_calls: Number(row?.total_calls ?? 0),
            active_days: Number(row?.active_days ?? 0),
            first_call_at: row?.first_call_at ?? null,
            last_call_at: row?.last_call_at ?? null,
        };
    }
}

function getQueryable(env: Env): Queryable {
    return new D1Queryable(env.DB);
}

export function getRepository(env: Env): DatabaseAdapter {
    return new CallsRepository(getQueryable(env));
}
