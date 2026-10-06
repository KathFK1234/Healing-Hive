// The local development database: a real MongoDB that keeps its data in
// server/.data between runs. Started by `npm run dev`. Nothing to install.
//
// If server/.env points MONGO_URI somewhere else (for example MongoDB Atlas),
// this does nothing and the API uses that database instead.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import { serverDir, LOCAL_DB_PORT, LOCAL_DB_URI } from "./dev-setup.js";

const idle = () => setInterval(() => {}, 1 << 30);

if (process.env.MONGO_URI !== LOCAL_DB_URI) {
    console.log("Using the database from server/.env; the local one is not needed.");
    idle();
} else {
    const dbPath = path.join(serverDir, ".data", "db");
    fs.mkdirSync(dbPath, { recursive: true });

    const mongo = await MongoMemoryServer.create({
        instance: { port: LOCAL_DB_PORT, dbPath, storageEngine: "wiredTiger" },
    });
    console.log(`Local database ready on port ${LOCAL_DB_PORT} (data kept in server/.data)`);

    // Starter nuggets, the admin account and sample professionals. Skips
    // anything already there, so it is safe on every start.
    const { seed } = await import("./seed.js");
    await seed({ demo: true });

    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, async () => {
            await mongo.stop({ doCleanup: false });
            process.exit(0);
        });
    }
    idle();
}
