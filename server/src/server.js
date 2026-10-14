import env from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { createApp } from "./app.js";

try {
    await connectDb();
} catch (error) {
    console.error("Could not connect to the database:", error.message);
    process.exit(1);
}

if (env.isProduction && !env.SMTP_HOST) {
    console.warn("Email is not configured (SMTP_HOST is empty): password resets, booking and application emails will not be sent.");
}

// Start the server
const server = createApp().listen(env.PORT, () => {
    console.log(`Server is running at port ${env.PORT}`);
});

// Finish in-flight requests before exiting when the host restarts the process.
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
        server.close(async () => {
            await disconnectDb();
            process.exit(0);
        });
    });
}
