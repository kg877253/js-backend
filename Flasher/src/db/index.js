import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI.replace(/\/+$/, "");
        const conninstance = await mongoose.connect(`${uri}/${DB_NAME}`);
        console.log("MongoDB connected successfully");
        console.log(conninstance.connection.host, "host");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}

export default connectDB;