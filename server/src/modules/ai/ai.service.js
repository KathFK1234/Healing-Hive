import Anthropic from "@anthropic-ai/sdk";
import env from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";

const SYSTEM_PROMPT = `You are the Healing Hive companion, a supportive listener for young people in Kenya (roughly 18 to 35).

How to respond:
- Be warm, plain-spoken and brief: usually two to five sentences. Listen first and reflect back what you heard before offering anything.
- Ask one gentle open question at a time. Do not interrogate.
- Offer practical, evidence-based coping ideas (grounding, breathing, sleep, movement, reaching out to someone trusted) only when the person seems to want them.
- Respect Kenyan culture, family, faith and community without assuming any of them. Reply in the language the person writes in, including Swahili or Sheng.
- Write plain conversational text. No headings, bullet lists or bold.

Limits you must keep:
- You are not a therapist or doctor. Never diagnose, and never advise on starting, stopping or dosing medication.
- When someone needs more than a listener, encourage them to book a licensed therapist or peer counsellor on Healing Hive.
- If the person mentions suicide, self-harm, harming someone else, abuse or being in danger: respond with care, take it seriously, and clearly tell them to contact emergency services on 999 or 112, or the Kenya Red Cross free counselling line on 1199, which answers at any hour. Befrienders Kenya (+254 722 178 177) is also available on weekdays from 9am to 5pm. Encourage them to tell a trusted person nearby. Never provide methods or details that could help someone hurt themselves.
- Do not claim to be human, and do not promise confidentiality beyond what an app can offer.`;

// Shown when Claude declines to answer. Still points the person somewhere useful.
const DECLINED_REPLY =
    "I'm not able to help with that one, but I don't want to leave you without support. " +
    "You can book a therapist or peer counsellor here on Healing Hive, and if things feel urgent, " +
    "the Kenya Red Cross counselling line on 1199 is free and answers at any hour.";

const unavailable = (message = "The AI companion could not be reached. Please try again in a moment") =>
    new ApiError(502, "AI_UNAVAILABLE", message);

// Created on first use, so the server starts without a key.
let client;
function getClient() {
    client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60 * 1000 });
    return client;
}

export function isAiConfigured() {
    return Boolean(env.ANTHROPIC_API_KEY);
}

// `history` is [{ role: "user" | "assistant", content }], oldest first, ending
// with the message to answer.
export async function generateReply(history) {
    if (!isAiConfigured()) {
        throw new ApiError(503, "AI_NOT_CONFIGURED", "The AI companion is not switched on yet");
    }

    // The API needs the conversation to open with the person, not the companion.
    const firstUser = history.findIndex((message) => message.role === "user");
    const messages = history.slice(firstUser);

    let response;
    try {
        response = await getClient().beta.messages.create({
            model: env.AI_MODEL,
            // Room for the model's thinking as well as the short reply itself
            max_tokens: 16000,
            // Replies are short and conversational, so low effort keeps them quick
            output_config: { effort: "low" },
            system: SYSTEM_PROMPT,
            messages,
            // If the model declines a message for safety reasons, let Anthropic
            // retry it on a fallback model before we give up on the turn.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
        });
    } catch (err) {
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
            console.error("AI request rejected: check ANTHROPIC_API_KEY");
            throw unavailable("The AI companion is not set up correctly yet");
        }
        if (err instanceof Anthropic.RateLimitError) {
            throw unavailable("The AI companion is busy right now. Please try again in a minute");
        }
        if (err instanceof Anthropic.APIError) {
            // Status and error type only: the message can echo the conversation back.
            console.error("AI request failed:", err.status, err.name);
            throw unavailable();
        }
        throw err;
    }

    // Check why the model stopped before trusting the content.
    if (response.stop_reason === "refusal") return DECLINED_REPLY;

    const reply = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();
    if (!reply) throw unavailable("The AI companion did not answer. Please try again");
    return reply;
}
