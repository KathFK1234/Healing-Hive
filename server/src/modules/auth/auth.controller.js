import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import User from "../users/user.model.js";
import Professional from "../professionals/professional.model.js";
import env from "../../config/env.js";
import { sendMail } from "../../utils/mailer.js";
import ApiError from "../../utils/ApiError.js";
import { signToken } from "../../middleware/auth.js";

async function register(req, res) {
    const { fullName, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw ApiError.conflict("An account with that email already exists");

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, phone, password: hashedPassword });

    // Signing up also signs you in, so there is no second form to fill.
    res.status(201).json({ token: signToken(user), user });
}

// Professionals sign up and apply in one step, so nobody ends up with a
// half-made account: either both the account and the application exist, or neither.
async function registerProfessional(req, res) {
    const { fullName, email, password, phone, application } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) throw ApiError.conflict("An account with that email already exists. Sign in and apply from Settings instead");

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, phone, password: hashedPassword, accountType: "professional" });
    try {
        await Professional.create({ ...application, user: user._id, status: "pending" });
    } catch (err) {
        await User.deleteOne({ _id: user._id });
        throw err;
    }

    await sendMail({
        to: user.email,
        subject: "We received your Healing Hive application",
        text: `Hello ${user.fullName},\n\nThank you for applying to join Healing Hive. We review every application before listing anyone, and we will email you as soon as there is a decision.\n\nYou can check or update your application any time:\n${env.clientUrl}/apply`,
    });
    res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    // Same answer whether the email or the password is wrong, so the form
    // cannot be used to find out who has an account.
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;
    if (!isMatch) throw ApiError.unauthorized("Incorrect email or password");

    res.json({ token: signToken(user), user });
}

async function getProfile(req, res) {
    res.json(req.user);
}

async function updateProfile(req, res) {
    Object.assign(req.user, req.body);
    await req.user.save();
    res.json(req.user);
}

async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw ApiError.badRequest("Your current password is incorrect");

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: "Password updated" });
}

const RESET_MINUTES = 60;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Always answers the same way, so this cannot be used to find out who has an account.
async function forgotPassword(req, res) {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
        const token = crypto.randomBytes(32).toString("base64url");
        user.passwordReset = { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000) };
        await user.save();
        await sendMail({
            to: user.email,
            subject: "Reset your Healing Hive password",
            text: `Hello ${user.fullName},\n\nSomeone asked to reset the password for this Healing Hive account. If that was you, choose a new password here:\n\n${env.clientUrl}/reset-password?token=${token}\n\nThe link works once and expires in ${RESET_MINUTES} minutes. If you did not ask for this, you can ignore this email and your password stays the same.`,
        });
    }
    res.json({ message: "If an account uses that email, we have sent it a link to reset the password" });
}

async function resetPassword(req, res) {
    const user = await User.findOne({
        "passwordReset.tokenHash": hashToken(req.body.token),
        "passwordReset.expiresAt": { $gt: new Date() },
    });
    if (!user) throw ApiError.badRequest("This reset link has expired or was already used. Please ask for a new one");

    user.password = await bcrypt.hash(req.body.newPassword, 12);
    user.passwordReset = undefined;
    await user.save();

    // Resetting also signs you in, the same as signing up does.
    res.json({ token: signToken(user), user });
}

export default {
    register, registerProfessional, login, getProfile, updateProfile, changePassword, forgotPassword, resetPassword
}
