import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    // One review per session, which also proves the session happened
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
        required: true,
        unique: true
    },
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    professional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional",
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: String,
},
{
    timestamps: true,
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
