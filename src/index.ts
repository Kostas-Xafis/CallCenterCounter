import { getRepository } from "./db";
import { appPage, loginPage, statsPage } from "./pages";
import { hashPassword, randomToken, sha256Hex } from "./security";
import type { Env } from "./types";

const SESSION_DAYS = 30;

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

async function getCurrentUser(request: Request, env: Env): Promise<{ id: number; email: string; } | null> {
    const cookies = parseCookies(request);
    const token = cookies[getCookieName(env)];
    if (!token) {
        return null;
    }

    const tokenHash = await sha256Hex(token);
    const repo = getRepository(env);
    return repo.getUserBySessionTokenHash(tokenHash);
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

        const user = await getCurrentUser(request, env);
        if (!user) {
            if (path.startsWith("/api/")) {
                return json({ error: "Unauthorized" }, 401);
            }
            return redirect("/login");
        }

        const repo = getRepository(env);

        if (path === "/app" && method === "GET") {
            return html(appPage(user.email));
        }

        if (path === "/stats" && method === "GET") {
            return html(statsPage(user.email));
        }

        if (path === "/api/me" && method === "GET") {
            const summary = await repo.getUserSummary(user.id);
            return json({ user: { id: user.id, email: user.email }, summary });
        }

        if (path === "/api/calls/increment" && method === "POST") {
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
