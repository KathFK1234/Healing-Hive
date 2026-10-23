import { z } from "zod";
import { PROFESSIONAL_TYPES } from "./professional.model.js";
import { webLink } from "../../middleware/validate.js";

const tags = z.array(z.string().trim().min(1).max(40)).max(12);

const availability = z.array(z.object({
    day: z.number().int().min(0).max(6),
    start: z.number().int().min(0).max(1439),
    end: z.number().int().min(1).max(1440),
}).refine((window) => window.end > window.start, "End time must be after start time")).max(21);

// Fields a professional may change about themselves at any time.
export const profileFields = {
    title: z.string().trim().max(80).optional(),
    organisationName: z.string().trim().max(120).optional(),
    bio: z.string().trim().max(1500).optional(),
    specialties: tags.optional(),
    languages: tags.optional(),
    location: z.string().trim().max(80).optional(),
    // null (an emptied box) removes it; undefined is what unsets a field on save
    yearsExperience: z.number().int().min(0).max(70).nullable().transform((value) => value ?? undefined).optional(),
    rate: z.object({ amount: z.number().min(0).max(1000000) }).optional(),
    sessionMinutes: z.number().int().min(15).max(180).optional(),
    availability: availability.optional(),
    meetingLink: webLink(300).or(z.literal("")).optional(),
};

export const applySchema = z.object({
    type: z.enum(PROFESSIONAL_TYPES),
    licenseNumber: z.string().trim().max(60).optional(),
    ...profileFields,
}).superRefine((value, context) => {
    if (value.type === "therapist" && !value.licenseNumber) {
        context.addIssue({ code: "custom", path: ["licenseNumber"], message: "Enter your licence number so we can verify it" });
    }
    if (value.type === "institution" && !value.organisationName) {
        context.addIssue({ code: "custom", path: ["organisationName"], message: "Enter the name of your institution" });
    }
});

export const updateSchema = z.object(profileFields);
