import AiMessage from "./aiMessage.model.js";
import { generateReply, isAiConfigured } from "./ai.service.js";
import { looksLikeCrisis, CRISIS_REPLY, CRISIS_CONTACTS } from "../../utils/crisis.js";

// How many earlier messages are sent along for context
const HISTORY_LIMIT = 20;

async function sendAiMessage(req, res) {
    const { message } = req.body;
    const user = req.user._id;
    const crisis = looksLikeCrisis(message);

    let replyText;
    if (crisis && !isAiConfigured()) {
        // The safety reply never depends on the AI provider being up.
        replyText = CRISIS_REPLY;
    } else {
        const recent = await AiMessage.find({ user }).sort({ createdAt: -1 }).limit(HISTORY_LIMIT);
        const history = recent.reverse().map((m) => ({ role: m.role, content: m.message }));
        try {
            replyText = await generateReply([...history, { role: "user", content: message }]);
        } catch (err) {
            if (!crisis) throw err;
            replyText = CRISIS_REPLY;
        }
    }

    //save both sides only once there is a reply, so a failed request can be retried cleanly
    const now = Date.now();
    const [userMessage, reply] = await AiMessage.create([
        { user, role: "user", message, createdAt: new Date(now) },
        { user, role: "assistant", message: replyText, crisis, createdAt: new Date(now + 1) },
    ], { ordered: true });

    res.status(201).json({
        userMessage,
        reply,
        crisis,
        contacts: crisis ? CRISIS_CONTACTS : undefined,
    });
}

async function getAiMessages(req, res) {
    const messages = await AiMessage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(200);
    res.json({ available: isAiConfigured(), messages: messages.reverse() });
}

// People can wipe their conversation whenever they want.
async function clearAiMessages(req, res) {
    await AiMessage.deleteMany({ user: req.user._id });
    res.json({ message: "Conversation cleared" });
}

export default {
    sendAiMessage,
    getAiMessages,
    clearAiMessages
}
