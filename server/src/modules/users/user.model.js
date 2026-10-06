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
        delete ret.__v;
        return ret;
    },
});

const User = mongoose.model("User", userSchema);
export default User;
