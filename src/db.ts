import { createClient, type Client, type InValue } from "@libsql/client/web";
import type { AllTimeStats, DailyPoint, Env, User, WeeklyPoint } from "./types";

interface DatabaseAdapter {
    getUserByEmail(email: string): Promise<User | null>;
    getUserBySessionTokenHash(tokenHash: string): Promise<{ id: number; email: string; } | null>;
    createSession(userId: number, tokenHash: string, expiresAt: string): Promise<void>;
    deleteSession(tokenHash: string): Promise<void>;
    getSecondsUntilNextCall(userId: number): Promise<number>;
    insertCall(userId: number): Promise<void>;
    getUserSummary(userId: number): Promise<{ todayCalls: number; totalCalls: number; }>;
    getDailyStats(scope: "user" | "total", userId: number): Promise<DailyPoint[]>;
    getWeeklyStats(scope: "user" | "total", userId: number): Promise<WeeklyPoint[]>;
    getAllTimeStats(scope: "user" | "total", userId: number): Promise<AllTimeStats>;
}

interface Queryable {
    first<T>(sql: string, args?: InValue[]): Promise<T | null>;
    all<T>(sql: string, args?: InValue[]): Promise<T[]>;
    run(sql: string, args?: InValue[]): Promise<void>;
}

class D1Queryable implements Queryable {
    constructor(private readonly db: D1Database) { }

    async first<T>(sql: string, args: InValue[] = []): Promise<T | null> {
        const statement = this.db.prepare(sql).bind(...args);
        const row = await statement.first<T>();
        return row ?? null;
    }

    async all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
        const statement = this.db.prepare(sql).bind(...args);
        const result = await statement.all<T>();
        return result.results;
    }

    async run(sql: string, args: InValue[] = []): Promise<void> {
        const statement = this.db.prepare(sql).bind(...args);
        await statement.run();
    }
}

class TursoQueryable implements Queryable {
    constructor(private readonly client: Client) { }

    async first<T>(sql: string, args: InValue[] = []): Promise<T | null> {
        const result = await this.client.execute({ sql, args });
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0] as T;
    }

    async all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
        const result = await this.client.execute({ sql, args });
        return result.rows as T[];
    }

    async run(sql: string, args: InValue[] = []): Promise<void> {
        await this.client.execute({ sql, args });
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

    getUserBySessionTokenHash(tokenHash: string): Promise<{ id: number; email: string; } | null> {
        return this.queryable.first<{ id: number; email: string; }>(
            `SELECT u.id, u.email
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?
         AND datetime(s.expires_at) > datetime('now')`,
            [tokenHash],
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
    if (env.APP_ENV === "production") {
        if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
            throw new Error("Production requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
        }
        const client = createClient({
            url: env.TURSO_DATABASE_URL,
            authToken: env.TURSO_AUTH_TOKEN,
        });
        return new TursoQueryable(client);
    }

    return new D1Queryable(env.DB);
}

export function getRepository(env: Env): DatabaseAdapter {
    return new CallsRepository(getQueryable(env));
}
