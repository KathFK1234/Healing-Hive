// Runs before `npm run dev`. Creates server/.env for local development if there
// isn't one, so a fresh clone starts without any manual setup. An existing
// .env is never touched.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const LOCAL_DB_PORT = 27027;
export const LOCAL_DB_URI = `mongodb://127.0.0.1:${LOCAL_DB_PORT}/healing-hive`;

const envPath = path.join(serverDir, ".env");

if (!fs.existsSync(envPath)) {
    const adminPassword = crypto.randomBytes(9).toString("base64url");
    fs.writeFileSync(envPath, [
        "# Created by `npm run dev` for local development. Not for production.",
        "# See .env.example for every setting.",
        "NODE_ENV=development",
        "PORT=7002",
        "",
        "# The local database started by `npm run dev`. Replace with a MongoDB Atlas",
        "# URI to use a hosted database instead.",
        `MONGO_URI=${LOCAL_DB_URI}`,
        `JWT_SECRET=${crypto.randomBytes(48).toString("hex")}`,
        "",
        "# Your local admin account",
        "ADMIN_EMAIL=admin@healinghive.local",
        `ADMIN_PASSWORD=${adminPassword}`,
        "",
        "# Paste a key from https://console.anthropic.com to switch the AI companion on",
        "ANTHROPIC_API_KEY=",
        "",
    ].join("\n"), { mode: 0o600 });
    console.log("Created server/.env for local development.");
    // Not printed: terminal scrollback, screen shares and recordings keep it
    console.log("  Admin sign-in: admin@healinghive.local, password in server/.env (ADMIN_PASSWORD)");
}

// .env holds JWT_SECRET (enough to sign in as anyone) and the admin password,
// and .data holds everyone's journals: readable by this user only. Also fixes
// copies made before this check, which were readable by every account here.
for (const [file, mode] of [[envPath, 0o600], [path.join(serverDir, ".data"), 0o700]]) {
    if (fs.existsSync(file) && (fs.statSync(file).mode & 0o077)) {
        fs.chmodSync(file, mode);
        console.log(`Made ${path.relative(serverDir, file)} private to your user account.`);
    }
}
