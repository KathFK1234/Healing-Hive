import mongoose from "mongoose";

export const SESSION_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
export const SESSION_MODES = ["video", "audio", "chat"];

const sessionSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    professional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional",
        required: true
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    durationMinutes: {
        type: Number,
        required: true
    },
    mode: {
        type: String,
        enum: SESSION_MODES,
        default: "video"
    },
    status: {
        type: String,
        enum: SESSION_STATUSES,
        default: "pending"
    },
    // True while the session holds its time slot (pending or confirmed).
    // Kept in step with `status` below; the unique index reads it.
    active: {
        type: Boolean,
        default: true
    },
    // What the client wants the professional to know beforehand
    clientNote: String,
    // The professional's own notes. Never sent to the client.
    privateNotes: {
        type: String,
        select: false
    },
    // Price at the time of booking, so later rate changes do not rewrite history
    price: {
        currency: {
            type: String,
            default: "KES"
        },
        amount: Number
    },
    paymentStatus: {
        type: String,
        enum: ["unpaid", "paid", "refunded"],
        default: "unpaid"
    },
},
{
    timestamps: true,
});

sessionSchema.pre("validate", function () {
    this.active = this.status === "pending" || this.status === "confirmed";
});

// The database, not application code, guarantees a professional cannot be
// double-booked: two people booking the same slot at once cannot both succeed.
sessionSchema.index(
    { professional: 1, scheduledAt: 1 },
    { unique: true, partialFilterExpression: { active: true } }
);
sessionSchema.index({ professional: 1, status: 1, scheduledAt: 1 });

const Session = mongoose.model("Session", sessionSchema);
export default Session;
