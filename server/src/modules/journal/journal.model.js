import mongoose from "mongoose";

const journalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: String,
    content: {
        type: String,
        required: true
    },
    // Optional 1-5 mood score for the entry
    mood: {
        type: Number,
        min: 1,
        max: 5
    },
},
{
    timestamps: true,
});

journalSchema.index({ user: 1, createdAt: -1 });

const Journal = mongoose.model("Journal", journalSchema);
export default Journal;
