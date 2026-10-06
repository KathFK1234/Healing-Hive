// Shared test harness: an in-memory MongoDB and the real Express app.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.MONGO_URI = "mongodb://placeholder/overridden-below";
process.env.ANTHROPIC_API_KEY = "";

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";

const { createApp } = await import("../src/app.js");
const { connectDb, disconnectDb } = await import("../src/config/db.js");

let mongo;

export async function start() {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
    await mongoose.connection.syncIndexes();
    return request(createApp());
}

export async function stop() {
    await disconnectDb();
    await mongo.stop();
}

export async function reset() {
    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.deleteMany({});
    }
}

let counter = 0;

// Registers a person and returns their token, with a helper for signed requests.
export async function signUp(api, overrides = {}) {
    counter++;
    const details = { fullName: `Person ${counter}`, email: `person${counter}@example.com`, password: "correct-horse-1", ...overrides };
    const res = await api.post("/api/v1/auth/register").send(details);
    if (res.status !== 201) throw new Error(`signUp failed: ${JSON.stringify(res.body)}`);
    return { ...res.body, password: details.password, auth: { Authorization: `Bearer ${res.body.token}` } };
}

export async function makeAdmin(api) {
    const person = await signUp(api);
    await mongoose.model("User").updateOne({ _id: person.user._id }, { role: "admin" });
    return person;
}

// Applies as a professional and has an admin approve it.
export async function makeProfessional(api, admin, overrides = {}) {
    const person = await signUp(api);
    const application = await api.post("/api/v1/professionals/apply").set(person.auth).send({
        type: "therapist",
        licenseNumber: "KCPA-0001",
        title: "Counselling Psychologist",
        specialties: ["Anxiety"],
        languages: ["English", "Swahili"],
        rate: { amount: 3000 },
        // every day, 08:00 to 18:00, so there is always an open slot
        availability: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start: 480, end: 1080 })),
        ...overrides,
    });
    if (application.status !== 201) throw new Error(`apply failed: ${JSON.stringify(application.body)}`);
    await api.patch(`/api/v1/admin/applications/${application.body._id}`).set(admin.auth).send({ status: "approved" });
    return { ...person, profileId: application.body._id };
}
