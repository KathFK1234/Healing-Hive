import bcrypt from "bcryptjs";
import User from "../users/user.model.js";
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

export default {
    register, login, getProfile, updateProfile, changePassword
}
