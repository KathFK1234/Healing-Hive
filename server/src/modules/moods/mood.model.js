import mongoose from "mongoose";

const moodSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    // 1 = awful ... 5 = great
    score: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    note: String,
    tags: [String],
},
{
    timestamps: true,
});

moodSchema.index({ user: 1, createdAt: -1 });

const Mood = mongoose.model("Mood", moodSchema);
export default Mood;
