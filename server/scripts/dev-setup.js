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
    ].join("\n"));
    console.log("Created server/.env for local development.");
    console.log(`  Admin sign-in: admin@healinghive.local / ${adminPassword}`);
}
