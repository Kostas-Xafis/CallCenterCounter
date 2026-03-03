import { getRepository } from "../db";
import { sha256Hex } from "../security";
import type { Env } from "../types";

const ADMIN_EMAIL = "koxafis@gmail.com";

export interface CurrentUser {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
}

export function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function isAdminEmail(email: string): boolean {
    return normalizeEmail(email) === ADMIN_EMAIL;
}

export function parseCookies(request: Request): Record<string, string> {
    const header = request.headers.get("cookie");
    if (!header) {
        return {};
    }

    return Object.fromEntries(
        header
            .split(";")
            .map((cookie) => cookie.trim())
            .filter(Boolean)
            .map((cookie) => {
                const [key, ...valueParts] = cookie.split("=");
                return [key, decodeURIComponent(valueParts.join("="))];
            }),
    );
}

export function getCookieName(env: Env): string {
    return env.SESSION_COOKIE_NAME || "cc_session";
}

export async function getCurrentUser(request: Request, env: Env): Promise<CurrentUser | null> {
    const cookies = parseCookies(request);
    const token = cookies[getCookieName(env)];
    if (!token) {
        return null;
    }

    const tokenHash = await sha256Hex(token);
    const repo = getRepository(env);
    return repo.getUserBySessionTokenHash(tokenHash);
}

export async function getValidInvite(rawToken: string | null, env: Env): Promise<{ id: number; email: string; } | null> {
    if (!rawToken) {
        return null;
    }

    const repo = getRepository(env);
    await repo.cleanupExpiredInvites();

    const tokenHash = await sha256Hex(rawToken);
    const invite = await repo.getSignupInviteByTokenHash(tokenHash);

    if (!invite) {
        return null;
    }

    if (invite.used_at || new Date(invite.expires_at).getTime() <= Date.now()) {
        await repo.deleteSignupInviteById(invite.id);
        return null;
    }

    return { id: invite.id, email: invite.email };
}
