import mongoose from "mongoose";
import env from "./env.js";

export async function connectDb(uri = env.MONGO_URI) {
    // Reject queries on fields that are not in the schema instead of silently
    // dropping the filter and matching every document.
    mongoose.set("strictQuery", true);
    // Fail in seconds rather than hang: a person is waiting on every query
    const connect = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10 * 1000, socketTimeoutMS: 20 * 1000 });
    if (!env.isTest) {
        console.log(`Database connected: ${connect.connection.host}, ${connect.connection.name}`);
    }
    return connect;
}

// What to check when the database cannot be reached. Printed in the host's
// logs (Railway's Deploy Logs), so it names settings, never their values.
function hint(error) {
    const message = error.message || "";
    if (/ENOTFOUND|EAI_AGAIN/.test(message)) return "the host in MONGO_URI was not found: check it points at the database service";
    if (/ECONNREFUSED|ETIMEDOUT|timed out/i.test(message)) return "nothing answered at the address in MONGO_URI: check the database is running and reachable";
    if (/Authentication failed|bad auth/i.test(message)) return "the database refused the user name or password in MONGO_URI";
    return "check MONGO_URI";
}

// For the server and the seed script: connect, or say why not and stop.
export async function connectDbOrExit() {
    try {
        return await connectDb();
    } catch (error) {
        console.error(`Could not connect to the database: ${error.message} (${hint(error)})`);
        process.exit(1);
    }
}

// Mongoose builds each schema's indexes in the background and drops any
// failure silently. A unique index that can't be built (because stored data
// already breaks it) stops guarding anything: one account per email, no double
// booking. So say which one failed. The code only: the message repeats the
// duplicate value, such as an email address.
export async function reportIndexFailures(models = mongoose.models, log = console.error) {
    const failed = [];
    await Promise.all(Object.entries(models).map(async ([name, model]) => {
        try {
            await model.init();
        } catch (err) {
            failed.push(name);
            log(`Database indexes for ${name} could not be built (${err.codeName || err.code || err.name}): its rules, such as unique fields, are not enforced. Check that collection for duplicate data`);
        }
    }));
    return failed;
}

export async function disconnectDb() {
    await mongoose.disconnect();
}
