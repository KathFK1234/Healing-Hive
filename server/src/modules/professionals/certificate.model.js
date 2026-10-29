import mongoose from "mongoose";

// The certificate a therapist or peer counsellor uploads to be verified. Kept
// apart from the profile so listing professionals never loads the file, and
// the file itself (`data`) only when someone asks to download it.
const certificateSchema = new mongoose.Schema({
    professional: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professional",
        required: true,
        unique: true
    },
    filename: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    data: {
        type: Buffer,
        required: true,
        select: false
    },
},
{
    timestamps: true,
});

const Certificate = mongoose.model("Certificate", certificateSchema);
export default Certificate;
