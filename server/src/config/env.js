import "dotenv/config";
import { z } from "zod";

// Every setting the server reads lives here, so a missing or weak value stops
// the server at startup instead of failing on some later request.
const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(7002),
    MONGO_URI: z.string().min(1, "MONGO_URI is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
    OPENAI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().default("gpt-4o-mini"),
    AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
}

const env = {
    ...parsed.data,
    clientOrigins: parsed.data.CLIENT_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
    isProduction: parsed.data.NODE_ENV === "production",
    isTest: parsed.data.NODE_ENV === "test",
};

export default env;
