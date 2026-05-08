import mongoose from "mongoose";
import { config } from "../config";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("[mongodb] connected to", config.mongoUri);
  } catch (err) {
    console.error("[mongodb] connection failed:", err);
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () =>
    console.warn("[mongodb] disconnected")
  );
  mongoose.connection.on("reconnected", () =>
    console.log("[mongodb] reconnected")
  );
}
