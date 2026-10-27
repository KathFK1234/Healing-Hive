import crypto from "node:crypto";
import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";

// What a unique index means to the person who hit it. The handlers check
// first; these catch two requests racing past that check together.
const duplicateMessages = {
    email: "An account with that email already exists",
    user: "You have already applied as a professional. Your application is with the team",
    session: "This session has already been rated",
};

export function notFound(req, res, next) {
    next(ApiError.notFound("Route"));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    let error = err;

    if (err?.name === "ValidationError") {
        const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        error = ApiError.badRequest(details[0]?.message || "Invalid data", details);
    } else if (err?.name === "CastError") {
        error = ApiError.badRequest(`The ${err.path} given is not valid`, [{ field: err.path, message: "Not a valid value" }]);
    } else if (err?.code === 11000) {
        const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
        error = ApiError.conflict(duplicateMessages[field] || "This was already saved, so it was not added again");
    } else if (err?.type === "entity.parse.failed") {
        error = ApiError.badRequest("The request body is not valid JSON");
    } else if (err?.type === "entity.too.large") {
        error = new ApiError(413, "TOO_LARGE", "That is too large to send");
    } else if (err?.expose && err.status >= 400 && err.status < 500) {
        // Any other body the JSON reader could not read (a broken compressed
        // body, an encoding or charset it doesn't know, an aborted request):
        // the sender's problem, not the server's.
        error = err.status === 415
            ? new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "This request's body can't be read: it is in a format the server doesn't accept")
            : ApiError.badRequest("This request's body can't be read. Please try again");
    }

    // Unexpected: keep the details in the log, and give the person a reference
    // that finds them there.
    if (!(error instanceof ApiError)) {
        const reference = crypto.randomBytes(4).toString("hex");
        if (!env.isTest) console.error(`Error ${reference}:`, err);
        error = new ApiError(500, "SERVER_ERROR", `The server hit a problem it did not expect, so this was not done. Please try again. If it keeps happening, the reference for this error is ${reference}`);
    }

    res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
    });
}
