// An error that is safe to show to the person using the app. Anything that is
// not an ApiError is reported as a plain 500 so internals never leak.
export default class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    static badRequest(message, details) {
        return new ApiError(400, "BAD_REQUEST", message, details);
    }

    static unauthorized(message = "Please sign in to continue") {
        return new ApiError(401, "UNAUTHORIZED", message);
    }

    static forbidden(message = "You do not have access to this") {
        return new ApiError(403, "FORBIDDEN", message);
    }

    static notFound(what = "Resource") {
        return new ApiError(404, "NOT_FOUND", `${what} not found`);
    }

    static conflict(message) {
        return new ApiError(409, "CONFLICT", message);
    }
}
