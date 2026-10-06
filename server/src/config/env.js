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
    // Public addresses, used in links inside emails and in the Google sign-in flow
    CLIENT_URL: z.string().url().optional(),
    API_URL: z.string().url().optional(),

    // AI companion (Claude). Empty key = companion switched off.
    ANTHROPIC_API_KEY: z.string().optional(),
    AI_MODEL: z.string().default("claude-opus-5-5"),

    // Outgoing email. Empty host = emails are printed to the server log instead.
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().default(465),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default("Healing Hive <no-reply@healinghive.local>"),

    // Google Calendar and Meet for professionals. Empty = that option is hidden
    // and video sessions use a Jitsi room instead.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
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
    clientUrl: (parsed.data.CLIENT_URL || parsed.data.CLIENT_ORIGIN.split(",")[0]).trim().replace(/\/$/, ""),
    apiUrl: (parsed.data.API_URL || `http://localhost:${parsed.data.PORT}`).replace(/\/$/, ""),
    googleEnabled: Boolean(parsed.data.GOOGLE_CLIENT_ID && parsed.data.GOOGLE_CLIENT_SECRET),
    isProduction: parsed.data.NODE_ENV === "production",
    isTest: parsed.data.NODE_ENV === "test",
};

export default env;
