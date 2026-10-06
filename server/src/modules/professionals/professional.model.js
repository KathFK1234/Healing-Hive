import mongoose from "mongoose";

export const PROFESSIONAL_TYPES = ["therapist", "peer", "institution"];
export const APPLICATION_STATUSES = ["pending", "approved", "rejected"];

// One model for licensed therapists, peer counsellors and institutions. It
// doubles as the application: a profile starts as `pending` and is only listed
// publicly once an admin approves it.
const professionalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: PROFESSIONAL_TYPES,
        required: true
    },
    status: {
        type: String,
        enum: APPLICATION_STATUSES,
        default: "pending",
        index: true
    },
    reviewNote: String,
    title: String,
    // Required for therapists. Checked by an admin, never shown publicly.
    licenseNumber: {
        type: String,
        select: false
    },
    bio: String,
    specialties: [String],
    languages: [String],
    location: String,
    yearsExperience: Number,
    rate: {
        currency: {
            type: String,
            default: "KES"
        },
        amount: {
            type: Number,
            default: 0
        }
    },
    sessionMinutes: {
        type: Number,
        default: 50
    },
    // Weekly working hours in East Africa Time. day: 0 = Sunday ... 6 = Saturday,
    // start/end are minutes after midnight.
    availability: [{
        _id: false,
        day: Number,
        start: Number,
        end: Number
    }],
},
{
    timestamps: true,
});

professionalSchema.index({ status: 1, type: 1 });
professionalSchema.index({ specialties: 1 });

professionalSchema.set("toJSON", {
    transform(doc, ret) {
        delete ret.__v;
        return ret;
    },
});

const Professional = mongoose.model("Professional", professionalSchema);
export default Professional;
