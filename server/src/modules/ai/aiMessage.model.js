import mongoose from "mongoose";

const aiMessageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    role: {
        type: String,
        enum: ["user", "assistant"],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Set when the message that prompted this reply looked like a crisis
    crisis: {
        type: Boolean,
        default: false
    },
},
{
    timestamps: true,
});

aiMessageSchema.index({ user: 1, createdAt: 1 });

const AiMessage = mongoose.model("AiMessage", aiMessageSchema);
export default AiMessage;
