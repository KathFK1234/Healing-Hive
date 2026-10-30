import env from "./config/env.js";
import { connectDbOrExit, disconnectDb } from "./config/db.js";
import { createApp } from "./app.js";

await connectDbOrExit();

if (env.isProduction && !env.BREVO_API_KEY && !env.SMTP_HOST) {
    console.warn("Email is not configured (BREVO_API_KEY and SMTP_HOST are empty): password resets, booking and application emails will not be sent.");
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
