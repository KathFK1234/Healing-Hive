import express from "express";
import Certificate from "./certificate.model.js";
import ApiError from "../../utils/ApiError.js";

export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;

// What a certificate may be, and how each kind of file starts. The first
// bytes are checked as well as the declared type, so a renamed file of
// another kind is turned away.
const SIGNATURES = {
    "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

// The file arrives as the request body itself, not as JSON
export const readCertificate = express.raw({ type: Object.keys(SIGNATURES), limit: CERTIFICATE_MAX_BYTES });

const TYPE_MESSAGE = "Upload your certificate as a PDF, JPEG or PNG file";

// Checks the uploaded body and returns what to store
export function certificateFromRequest(req) {
    const contentType = (req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const signature = SIGNATURES[contentType];
    if (!signature || !Buffer.isBuffer(req.body)) throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", TYPE_MESSAGE);
    if (!req.body.length) throw ApiError.badRequest("That file is empty. Choose your certificate again");
    if (!signature.every((byte, i) => req.body[i] === byte)) throw ApiError.badRequest(`That file isn't a real ${contentType === "application/pdf" ? "PDF" : contentType.split("/")[1].toUpperCase()}. ${TYPE_MESSAGE}`);

    let filename = "certificate";
    try {
        filename = decodeURIComponent(req.headers["x-filename"] || "") || filename;
    } catch {
        // A garbled name is not worth refusing the file over
    }
    // Only the last part of a path, without control characters, kept short
    filename = filename.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 120) || "certificate";

    return { filename, contentType, size: req.body.length, data: req.body };
}

// Name, type, size and when: everything but the file
export const certificateSummary = (certificate) => certificate && {
    filename: certificate.filename,
    contentType: certificate.contentType,
    size: certificate.size,
    uploadedAt: certificate.updatedAt,
};

export async function saveCertificate(professionalId, file) {
    const certificate = await Certificate.findOneAndUpdate(
        { professional: professionalId },
        file,
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    return certificateSummary(certificate);
}

// Sends the file as a download: it was made by someone else, so it is never
// shown inside the API's own address, and never kept in a cache.
export async function sendCertificate(res, professionalId) {
    const certificate = await Certificate.findOne({ professional: professionalId }).select("+data");
    if (!certificate) throw ApiError.notFound("Certificate");
    res.set({
        "Content-Type": certificate.contentType,
        "Content-Disposition": `attachment; filename="certificate"; filename*=UTF-8''${encodeURIComponent(certificate.filename)}`,
        "Cache-Control": "private, no-store",
    });
    res.send(certificate.data);
}
