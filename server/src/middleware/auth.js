import jwt from "jsonwebtoken";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import User from "../modules/users/user.model.js";

// Other short-lived tokens are signed with the same secret (the Google
// connect flow's `state`), so a sign-in token says what it is for and only
// that kind is accepted here.
const PURPOSE = "session";

export function signToken(user) {
    return jwt.sign({ sub: user._id.toString(), purpose: PURPOSE }, env.JWT_SECRET, { algorithm: "HS256", expiresIn: env.JWT_EXPIRES_IN });
}

async function userFromRequest(req) {
    const [scheme, token] = (req.header("Authorization") || "").split(" ");
    if (scheme !== "Bearer" || !token) return null;

    let payload;
    try {
        payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
        throw ApiError.unauthorized("Your session has expired. Please sign in again");
    }
    if (payload.purpose !== PURPOSE) throw ApiError.unauthorized("Your session has expired. Please sign in again");

    // The role is read from the database on every request rather than from the
    // token, so approving or removing a professional takes effect immediately.
    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized();
    return user;
}

export async function authenticate(req, res, next) {
    const user = await userFromRequest(req);
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
}

// For public pages that show a little extra to signed-in people.
export async function optionalAuth(req, res, next) {
    try {
        req.user = await userFromRequest(req);
    } catch {
        req.user = null;
    }
    next();
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) throw ApiError.forbidden();
        next();
    };
}
