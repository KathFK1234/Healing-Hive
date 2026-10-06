import mongoose from "mongoose";

export const ROLES = ["user", "therapist", "peer", "institution", "admin"];

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: String,
    // Never returned by default. Queries that need it must ask with .select("+password")
    password: {
        type: String,
        required: true,
        select: false
    },
    // Only an admin approving a professional application changes this.
    role: {
        type: String,
        enum: ROLES,
        default: "user"
    },
    // Which experience the account gets: a person looking for support, or a
    // professional (therapist, peer counsellor, institution) offering it.
    accountType: {
        type: String,
        enum: ["client", "professional"],
        default: "client"
    },
    // Password reset: only a hash of the emailed token is stored.
    passwordReset: {
        type: {
            _id: false,
            tokenHash: String,
            expiresAt: Date
        },
        select: false
    },
    preferredLanguage: {
        type: String,
        default: "English"
    },
    savedNuggets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Nugget"
    }],
},
{
    timestamps: true,
});

userSchema.set("toJSON", {
    transform(doc, ret) {
        delete ret.password;
        delete ret.passwordReset;
        delete ret.__v;
        return ret;
    },
});

const User = mongoose.model("User", userSchema);
export default User;
