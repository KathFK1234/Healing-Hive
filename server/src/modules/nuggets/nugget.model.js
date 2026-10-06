import mongoose from "mongoose";

export const NUGGET_TYPES = ["myth", "tip", "affirmation", "educational"];
export const NUGGET_STATUSES = ["draft", "review", "published"];
export const NUGGET_TOPICS = [
    "Stigma & Myths",
    "Anxiety Management",
    "Daily Affirmations",
    "Mental Health Basics",
    "Cultural Context",
    "Coping Strategies",
];

const nuggetSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        enum: NUGGET_TOPICS,
        required: true
    },
    type: {
        type: String,
        enum: NUGGET_TYPES,
        default: "tip"
    },
    readMinutes: {
        type: Number,
        default: 1
    },
    // Therapists and peer counsellors submit for review; only admins publish.
    status: {
        type: String,
        enum: NUGGET_STATUSES,
        default: "review"
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    publishedAt: Date,
},
{
    timestamps: true,
});

nuggetSchema.index({ status: 1, topic: 1, publishedAt: -1 });

const Nugget = mongoose.model("Nugget", nuggetSchema);
export default Nugget;
