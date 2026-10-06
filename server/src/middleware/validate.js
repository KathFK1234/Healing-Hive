import { z } from "zod";
import ApiError from "../utils/ApiError.js";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// Parses the request against zod schemas and replaces req.body with the parsed
// result, so controllers only ever see fields the schema allows. This is what
// stops a client from setting fields such as `role` or `status` on create.
// Parsed query values go to req.filters (req.query is read-only in Express 5).
export function validate({ body, query } = {}) {
    return (req, res, next) => {
        if (body) req.body = parse(body, req.body ?? {});
        if (query) req.filters = parse(query, req.query ?? {});
        next();
    };
}

export function validateId(req, res, next) {
    if (!objectId.safeParse(req.params.id).success) throw ApiError.notFound();
    next();
}

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    throw ApiError.badRequest(details[0]?.message || "Invalid request", details);
}
