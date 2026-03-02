import { D1Database } from "@cloudflare/workers-types";

export interface Env {
    APP_ENV: "development" | "production";
    SESSION_COOKIE_NAME?: string;
    AUTH_PEPPER?: string;
    DB: D1Database;
}

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    password_hash: string;
}

export interface Session {
    user_id: number;
    token_hash: string;
    expires_at: string;
}

export interface DailyPoint {
    period: string;
    count: number;
}

export interface WeeklyPoint {
    year_week: string;
    count: number;
}

export interface AllTimeStats {
    total_calls: number;
    active_days: number;
    first_call_at: string | null;
    last_call_at: string | null;
}
