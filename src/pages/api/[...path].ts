import type { APIRoute } from "astro";
import workerApp from "../../index";
import type { Env } from "../../types";

const handler: APIRoute = async ({ request, locals }) => {
    const env = locals.runtime?.env as Env | undefined;

    if (!env) {
        return new Response("Cloudflare runtime env not available", { status: 500 });
    }

    return workerApp.fetch(request, env);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
