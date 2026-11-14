import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

test("missing or wrong settings are named before anything starts", () => {
    const missing = runSeed({ JWT_SECRET: undefined });
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /MONGO_URI: MONGO_URI is required/);
    assert.match(missing.stderr, /JWT_SECRET: JWT_SECRET is required/);

    const notMongo = runSeed({ MONGO_URI: "https://example.com" });
    assert.equal(notMongo.status, 1);
    assert.match(notMongo.stderr, /MONGO_URI must start with mongodb:\/\/ or mongodb\+srv:\/\//);
});

test("Railway's MONGO_URL is used when MONGO_URI is not set", () => {
    const result = runSeed({ MONGO_URL: "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=500" });
    assert.equal(result.status, 1);
    // Got past the settings check and tried that address
    assert.doesNotMatch(result.stderr, /Invalid environment configuration/);
    assert.match(result.stderr, /Could not connect to the database: .*127\.0\.0\.1:1/);
});

// Railway, the root `npm start` and the server's own `npm start` must start the
// API the same way: node itself (an npm parent stays resident, about 85 MB),
// with a heap limit sized for the API (V8's default follows the machine's
// memory, so the heap grows far past the ~35 MB the API keeps live). #197
test("every start command runs node directly with the same memory limits", () => {
    const read = (path) => JSON.parse(readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8"));
    // Railway and the root script run from the repository root, the server's
    // own script from server/: each must name the entry file from where it runs.
    const commands = [
        [read("../railway.json").deploy.startCommand, "server/src/server.js"],
        [read("../package.json").scripts.start, "server/src/server.js"],
        [read("package.json").scripts.start, "src/server.js"],
    ];
    const flags = commands.map(([command, entry]) => {
        const match = command.match(/^node((?: --[a-z-]+=\d+)+) (\S+)$/);
        assert.ok(match, `starts node directly: ${command}`);
        assert.equal(match[2], entry, command);
        assert.match(match[1], /--max-old-space-size=\d+/);
        assert.match(match[1], /--max-semi-space-size=\d+/);
        return match[1];
    });
    assert.equal(flags[1], flags[0]);
    assert.equal(flags[2], flags[0]);
});
