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
    // Institutions only: the name people see
    organisationName: String,
    // A therapist or peer counsellor can belong to one institution. It starts
    // as an invitation that the professional has to accept.
    institution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional"
    },
    institutionStatus: {
        type: String,
        enum: ["invited", "active"]
    },
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
    // Kept up to date from reviews, so the directory can sort without a join
    ratingAverage: {
        type: Number,
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    // The professional's own standing meeting room, if they prefer one
    meetingLink: String,
    // Google Calendar connection. The token is encrypted and never returned.
    calendarConnected: {
        type: Boolean,
        default: false
    },
    google: {
        type: {
            _id: false,
            refreshToken: String,
            email: String
        },
        select: false
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
        delete ret.google;
        return ret;
    },
});

const Professional = mongoose.model("Professional", professionalSchema);
export default Professional;
