import mongoose from "mongoose";

export const REMINDER_CHANNELS = ["app", "email", "sms"];

const reminderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true
    },
    // Minutes after midnight, East Africa Time
    time: {
        type: Number,
        required: true
    },
    // Days it repeats on. 0 = Sunday ... 6 = Saturday
    days: [Number],
    channels: {
        type: [String],
        enum: REMINDER_CHANNELS,
        default: ["app"]
    },
    enabled: {
        type: Boolean,
        default: true
    },
},
{
    timestamps: true,
});

const Reminder = mongoose.model("Reminder", reminderSchema);
export default Reminder;
