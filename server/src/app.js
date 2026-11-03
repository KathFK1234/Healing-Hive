import express from "express";
import cors from "cors";
import helmet from "helmet";
import env from "./config/env.js";
import routes from "./routes.js";
import { notFound, errorHandler } from "./middleware/error.js";

// Builds the Express app without starting it, so tests can drive it directly.
export function createApp() {
    const app = express();

    // Behind a host's proxy (Render, Railway, nginx) the real client address is
    // in X-Forwarded-For; rate limiting needs it.
    if (env.isProduction) app.set("trust proxy", 1);

    // Middleware
    app.use(helmet());
    app.use(cors({ origin: env.clientOrigins }));
    app.use(express.json({ limit: "100kb" }));

    // A signed-in answer can hold someone's journal, chats or sessions. Keep it
    // out of the browser's cache, which outlives signing out on a shared
    // computer. Public answers keep their ETag, so they can still be revalidated.
    app.use((req, res, next) => {
        if (req.headers.authorization) res.set("Cache-Control", "no-store");
        next();
    });

    // Routes. Versioned so the API can change later without breaking old clients.
    app.use("/api/v1", routes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
}
