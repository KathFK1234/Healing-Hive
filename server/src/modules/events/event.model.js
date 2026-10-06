import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    speaker: String,
    eventDate: {
        type: Date,
        required: true,
        index: true
    },
    durationMinutes: {
        type: Number,
        default: 60
    },
    // KES. 0 means free.
    price: {
        type: Number,
        default: 0
    },
    capacity: Number,
    // Where to join. Only sent to people who have registered.
    joinLink: String,
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
},
{
    timestamps: true,
});

const Event = mongoose.model("Event", eventSchema);
export default Event;
