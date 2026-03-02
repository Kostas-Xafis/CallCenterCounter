import { getRepository } from "./db";
import {
    appPage,
    inviteGeneratorPage,
    inviteInvalidPage,
    inviteSignupPage,
    inviteVerifyEmailPage,
    loginPage,
    statsAllTimePage,
    statsMonthlyPage,
    statsTotalPage,
    statsWeeklyPage,
} from "./pages";
import { hashPassword, randomToken, sha256Hex } from "./security";
import type { Env } from "./types";

const SESSION_DAYS = 30;
const SIGNUP_INVITE_DAYS = 5;
const ADMIN_EMAIL = "koxafis@gmail.com";
const CALL_WINDOW_START_MINUTES = 7 * 60;
const CALL_WINDOW_END_MINUTES = 14 * 60 + 30;
const CALL_CENTER_UTC_OFFSET_MINUTES = 2 * 60;

function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function redirect(location: string): Response {
    return new Response(null, {
        status: 302,
        headers: { Location: location },
    });
}

function html(content: string, status = 200): Response {
    return new Response(content, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

function parseCookies(request: Request): Record<string, string> {
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

function getCookieName(env: Env): string {
    return env.SESSION_COOKIE_NAME || "cc_session";
}

function setSessionCookie(token: string, env: Env): string {
    const isSecure = env.APP_ENV === "production" ? "Secure; " : "";
    return `${getCookieName(env)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; ${isSecure}Max-Age=${SESSION_DAYS * 24 * 60 * 60}`;
}

function clearSessionCookie(env: Env): string {
    const isSecure = env.APP_ENV === "production" ? "Secure; " : "";
    return `${getCookieName(env)}=; Path=/; HttpOnly; SameSite=Lax; ${isSecure}Max-Age=0`;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function isWithinCallCenterHours(now: Date): boolean {
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const localMinutes = (utcMinutes + CALL_CENTER_UTC_OFFSET_MINUTES + 24 * 60) % (24 * 60);
    return localMinutes >= CALL_WINDOW_START_MINUTES && localMinutes <= CALL_WINDOW_END_MINUTES;
}

async function getCurrentUser(request: Request, env: Env): Promise<{ id: number; email: string; first_name: string; last_name: string; } | null> {
    const cookies = parseCookies(request);
    const token = cookies[getCookieName(env)];
    if (!token) {
        return null;
    }

    const tokenHash = await sha256Hex(token);
    const repo = getRepository(env);
    return repo.getUserBySessionTokenHash(tokenHash);
}

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

function isAdminEmail(email: string): boolean {
    return normalizeEmail(email) === ADMIN_EMAIL;
}

function isValidSignupInvitePayload(firstName?: string, lastName?: string, password?: string): boolean {
    return Boolean(firstName?.trim() && lastName?.trim() && password && password.length >= 8);
}

async function getValidInvite(rawToken: string | null, env: Env): Promise<{ id: number; email: string; } | null> {
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

async function handleLogin(request: Request, env: Env): Promise<Response> {
    const payload = (await request.json().catch(() => null)) as { email?: string; password?: string; } | null;
    const email = payload?.email?.trim().toLowerCase();
    const password = payload?.password;

    if (!email || !password) {
        return json({ error: "Email and password are required" }, 400);
    }

    const repo = getRepository(env);
    const user = await repo.getUserByEmail(email);
    if (!user) {
        return json({ error: "Invalid credentials" }, 401);
    }

    const pepper = env.AUTH_PEPPER || "development-pepper";
    const incomingHash = await hashPassword(password, pepper);
    console.log(`Incoming hash: ${incomingHash}`);
    console.log(`Stored hash: ${user.password_hash}`);
    if (incomingHash !== user.password_hash) {
        return json({ error: "Invalid credentials" }, 401);
    }

    const rawToken = randomToken();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = addDays(new Date(), SESSION_DAYS).toISOString();

    await repo.createSession(user.id, tokenHash, expiresAt);

    return new Response(null, {
        status: 204,
        headers: {
            "Set-Cookie": setSessionCookie(rawToken, env),
        },
    });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
    const cookies = parseCookies(request);
    const token = cookies[getCookieName(env)];

    if (token) {
        const tokenHash = await sha256Hex(token);
        const repo = getRepository(env);
        await repo.deleteSession(tokenHash);
    }

    return new Response(null, {
        status: 204,
        headers: {
            "Set-Cookie": clearSessionCookie(env),
        },
    });
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (path === "/" && method === "GET") {
            const user = await getCurrentUser(request, env);
            return user ? redirect("/app") : redirect("/login");
        }

        if (path === "/login" && method === "GET") {
            const user = await getCurrentUser(request, env);
            if (user) {
                return redirect("/app");
            }
            return html(loginPage());
        }

        if (path === "/api/login" && method === "POST") {
            return handleLogin(request, env);
        }

        if (path === "/api/logout" && method === "POST") {
            return handleLogout(request, env);
        }

        if (path === "/signup/verify" && method === "GET") {
            const token = url.searchParams.get("token");
            const invite = await getValidInvite(token, env);

            if (!invite || !token) {
                return html(inviteInvalidPage("This signup link is invalid or has expired."), 410);
            }

            return html(inviteVerifyEmailPage(token));
        }

        if (path === "/signup/register" && method === "GET") {
            const token = url.searchParams.get("token");
            const email = normalizeEmail(url.searchParams.get("email") || "");
            const invite = await getValidInvite(token, env);

            if (!invite || !token || !email || normalizeEmail(invite.email) !== email) {
                return html(inviteInvalidPage("This signup link is invalid or has expired."), 410);
            }

            return html(inviteSignupPage(token, invite.email));
        }

        if (path === "/api/signup/verify-invite" && method === "POST") {
            const payload = (await request.json().catch(() => null)) as { token?: string; email?: string; } | null;
            const token = payload?.token?.trim() || null;
            const email = normalizeEmail(payload?.email || "");

            if (!token || !email) {
                return json({ error: "Token and email are required" }, 400);
            }

            const invite = await getValidInvite(token, env);
            if (!invite) {
                return json({ error: "Invite is invalid or expired" }, 410);
            }

            if (normalizeEmail(invite.email) !== email) {
                return json({ error: "This invite does not belong to this email" }, 403);
            }

            return json({ redirectTo: `/signup/register?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}` });
        }

        if (path === "/api/signup/complete" && method === "POST") {
            const payload = (await request.json().catch(() => null)) as {
                token?: string;
                firstName?: string;
                lastName?: string;
                password?: string;
            } | null;

            const token = payload?.token?.trim() || null;
            const firstName = payload?.firstName?.trim();
            const lastName = payload?.lastName?.trim();
            const password = payload?.password;

            if (!token || !isValidSignupInvitePayload(firstName, lastName, password)) {
                return json({ error: "Valid first name, last name, and password (min 8 chars) are required" }, 400);
            }

            const invite = await getValidInvite(token, env);
            if (!invite) {
                return json({ error: "Invite is invalid or expired" }, 410);
            }

            const repo = getRepository(env);
            const existingUser = await repo.getUserByEmail(normalizeEmail(invite.email));
            if (existingUser) {
                await repo.deleteSignupInviteById(invite.id);
                return json({ error: "An account with this email already exists" }, 409);
            }

            const pepper = env.AUTH_PEPPER || "development-pepper";
            const passwordHash = await hashPassword(password!, pepper);

            await repo.createUser(normalizeEmail(invite.email), firstName!, lastName!, passwordHash);
            await repo.deleteSignupInviteById(invite.id);

            return new Response(null, { status: 204 });
        }

        const user = await getCurrentUser(request, env);
        if (!user) {
            if (path.startsWith("/api/")) {
                return json({ error: "Unauthorized" }, 401);
            }
            return redirect("/login");
        }

        const repo = getRepository(env);
        const userDisplayName = `${user.first_name} ${user.last_name}`.trim() || user.email;
        const isAdminUser = isAdminEmail(user.email);

        if (path === "/admin/invites" && method === "GET") {
            if (!isAdminUser) {
                return new Response("Forbidden", { status: 403 });
            }
            return html(inviteGeneratorPage(userDisplayName, isAdminUser));
        }

        if (path === "/api/admin/invites" && method === "POST") {
            if (!isAdminUser) {
                return json({ error: "Forbidden" }, 403);
            }

            const payload = (await request.json().catch(() => null)) as { email?: string; } | null;
            const invitedEmail = normalizeEmail(payload?.email || "");

            if (!invitedEmail || !invitedEmail.includes("@")) {
                return json({ error: "A valid email is required" }, 400);
            }

            await repo.cleanupExpiredInvites();

            const existingUser = await repo.getUserByEmail(invitedEmail);
            if (existingUser) {
                return json({ error: "User already exists with this email" }, 409);
            }

            const rawToken = randomToken();
            const tokenHash = await sha256Hex(rawToken);
            const expiresAt = addDays(new Date(), SIGNUP_INVITE_DAYS).toISOString();

            await repo.createSignupInvite(invitedEmail, tokenHash, expiresAt);

            return json({
                inviteUrl: `${url.origin}/signup/verify?token=${encodeURIComponent(rawToken)}`,
                expiresAt,
            });
        }

        if (path === "/app" && method === "GET") {
            return html(appPage(userDisplayName, isAdminUser));
        }

        if (path === "/stats" && method === "GET") {
            return redirect("/stats/weekly");
        }

        if (path === "/stats/weekly" && method === "GET") {
            return html(statsWeeklyPage(userDisplayName, isAdminUser));
        }

        if (path === "/stats/monthly" && method === "GET") {
            return html(statsMonthlyPage(userDisplayName, isAdminUser));
        }

        if (path === "/stats/all-time" && method === "GET") {
            return html(statsAllTimePage(userDisplayName, isAdminUser));
        }

        if (path === "/stats/total" && method === "GET") {
            return html(statsTotalPage(userDisplayName, isAdminUser));
        }

        if (path === "/api/me" && method === "GET") {
            const summary = await repo.getUserSummary(user.id);
            return json({
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                },
                summary,
            });
        }

        if (path === "/api/calls/increment" && method === "POST") {
            if (!isWithinCallCenterHours(new Date())) {
                return json(
                    {
                        error: "Calls can be recorded only between 07:00 and 14:30 (GMT+2).",
                    },
                    403,
                );
            }

            const secondsRemaining = await repo.getSecondsUntilNextCall(user.id);
            if (secondsRemaining > 0) {
                return json(
                    {
                        error: `Please wait ${secondsRemaining}s before adding another call.`,
                        retryAfterSeconds: secondsRemaining,
                    },
                    429,
                );
            }

            await repo.insertCall(user.id);
            const summary = await repo.getUserSummary(user.id);
            return json({ ok: true, summary });
        }

        if (path === "/api/stats" && method === "GET") {
            const scope = url.searchParams.get("scope") === "total" ? "total" : "user";
            const [daily, weekly, allTime] = await Promise.all([
                repo.getDailyStats(scope, user.id),
                repo.getWeeklyStats(scope, user.id),
                repo.getAllTimeStats(scope, user.id),
            ]);
            return json({ scope, daily, weekly, allTime });
        }

        return new Response("Not Found", { status: 404 });
    },
};
