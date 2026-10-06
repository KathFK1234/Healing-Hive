import mongoose from "mongoose";
import env from "./env.js";

export async function connectDb(uri = env.MONGO_URI) {
    // Reject queries on fields that are not in the schema instead of silently
    // dropping the filter and matching every document.
    mongoose.set("strictQuery", true);
    const connect = await mongoose.connect(uri);
    if (!env.isTest) {
        console.log(`Database connected: ${connect.connection.host}, ${connect.connection.name}`);
    }
    return connect;
}

export async function disconnectDb() {
    await mongoose.disconnect();
}
