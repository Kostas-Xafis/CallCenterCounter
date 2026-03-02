import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
function printUsage() {
	console.log("Usage:");
	console.log("  npm run hash:password -- <password> <pepper>");
	console.log("  AUTH_PEPPER=<pepper> npm run hash:password -- <password>");
	console.log("");
	console.log("Hash format: SHA-256(password:pepper)");
}

async function askMissingValues(): Promise<{ password: string; pepper: string; }> {
	const rl = readline.createInterface({ input, output });
	let password = process.argv[2]?.trim() ?? "";
	let pepper = (process.argv[3] ?? process.env.AUTH_PEPPER ?? "").trim();

	try {
		if (!password) {
			password = (await rl.question("Password: ")).trim();
		}

		if (!pepper) {
			pepper = (await rl.question("Pepper (AUTH_PEPPER): ")).trim();
		}
	} finally {
		rl.close();
	}

	return { password, pepper };
}

const { password, pepper } = await askMissingValues();

if (!password || !pepper) {
	printUsage();
	process.exit(1);
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export async function sha256Hex(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
	return bytesToHex(new Uint8Array(digest));
}

export async function hashPassword(password: string, pepper: string): Promise<string> {
	return sha256Hex(`${password}:${pepper}`);
}

console.log(`Hash password ${password} with pepper ${pepper}...`);
const hash = await hashPassword(password, pepper);
console.log(`Resulting hash: ${hash}`);

