import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";

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
        error = ApiError.badRequest("Invalid value");
    } else if (err?.code === 11000) {
        error = ApiError.conflict("That already exists");
    } else if (err?.type === "entity.parse.failed") {
        error = ApiError.badRequest("The request body is not valid JSON");
    } else if (err?.type === "entity.too.large") {
        error = new ApiError(413, "TOO_LARGE", "That is too large to send");
    }

    if (!(error instanceof ApiError)) {
        if (!env.isTest) console.error(err);
        error = new ApiError(500, "SERVER_ERROR", "Something went wrong on our side. Please try again");
    }

    res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
    });
}
