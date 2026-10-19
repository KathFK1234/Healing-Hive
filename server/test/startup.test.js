import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The seed runs before every deploy (railway.json preDeployCommand), so what
// it prints when it cannot start is what the host's Deploy Logs show.
const serverDir = fileURLToPath(new URL("..", import.meta.url));

function runSeed(env) {
    return spawnSync(process.execPath, ["scripts/seed.js"], {
        cwd: serverDir,
        encoding: "utf8",
        timeout: 20000,
        // DOTENV_CONFIG_PATH: never read a local server/.env
        env: { PATH: process.env.PATH, DOTENV_CONFIG_PATH: "/nonexistent", NODE_ENV: "production", JWT_SECRET: "x".repeat(32), ...env },
    });
}

test("the seed says in one line why it could not reach the database", () => {
    // Port 1: nothing listens there; the short timeout keeps the test quick
    const result = runSeed({ MONGO_URI: "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Could not connect to the database: .*ECONNREFUSED.*\(nothing answered at the address in MONGO_URI/m);
    assert.doesNotMatch(result.stderr, /node_modules/, "no stack trace");
});
