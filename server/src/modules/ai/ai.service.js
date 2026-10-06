import env from "../../config/env.js";
import ApiError from "../../utils/ApiError.js";

const SYSTEM_PROMPT = `You are the Healing Hive companion, a supportive listener for young people in Kenya (roughly 18 to 35).

How to respond:
- Be warm, plain-spoken and brief: usually two to five sentences. Listen first and reflect back what you heard before offering anything.
- Ask one gentle open question at a time. Do not interrogate.
- Offer practical, evidence-based coping ideas (grounding, breathing, sleep, movement, reaching out to someone trusted) only when the person seems to want them.
- Respect Kenyan culture, family, faith and community without assuming any of them. Reply in the language the person writes in, including Swahili or Sheng.

Limits you must keep:
- You are not a therapist or doctor. Never diagnose, and never advise on starting, stopping or dosing medication.
- When someone needs more than a listener, encourage them to book a licensed therapist or peer counsellor on Healing Hive.
- If the person mentions suicide, self-harm, harming someone else, abuse or being in danger: respond with care, take it seriously, and clearly tell them to contact emergency services on 999 or 112, Befrienders Kenya on +254 722 178 177, or the Kenya Red Cross on 1199. Encourage them to tell a trusted person nearby. Never provide methods or details that could help someone hurt themselves.
- Do not claim to be human, and do not promise confidentiality beyond what an app can offer.`;

export function isAiConfigured() {
    return Boolean(env.OPENAI_API_KEY);
}

// `history` is [{ role: "user" | "assistant", content }], oldest first.
// Talks to any OpenAI-compatible chat completions endpoint, so the provider can
// be changed through AI_BASE_URL and AI_MODEL without touching this code.
export async function generateReply(history) {
    if (!isAiConfigured()) {
        throw new ApiError(503, "AI_NOT_CONFIGURED", "The AI companion is not switched on yet");
    }

    let response;
    try {
        response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: env.AI_MODEL,
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
                max_tokens: 400,
                temperature: 0.7,
            }),
            signal: AbortSignal.timeout(30000),
        });
    } catch (err) {
        console.error("AI request failed:", err.message);
        throw new ApiError(502, "AI_UNAVAILABLE", "The AI companion could not be reached. Please try again in a moment");
    }

    if (!response.ok) {
        // Log the status only. The body can echo the conversation back.
        console.error("AI request rejected with status", response.status);
        throw new ApiError(502, "AI_UNAVAILABLE", "The AI companion could not be reached. Please try again in a moment");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new ApiError(502, "AI_UNAVAILABLE", "The AI companion did not answer. Please try again");
    return reply;
}
