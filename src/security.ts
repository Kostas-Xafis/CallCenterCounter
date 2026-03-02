const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
    return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string, pepper: string): Promise<string> {
    return sha256Hex(`${password}:${pepper}`);
}

export function randomToken(bytes = 32): string {
    const random = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...random))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}
