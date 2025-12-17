import mongoose from "mongoose";
import { logger, dbConnectionGauge } from "../observability";

export async function connectDatabase(mongoUri: string): Promise<void> {
  if (!mongoUri) {
    logger.error("FATAL: MONGODB_URI environment variable not set. Please set MONGODB_URI in your .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });

    logger.info("MongoDB connected successfully", {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      port: mongoose.connection.port,
    });

    dbConnectionGauge.set({ state: "connected" }, 1);

    registerConnectionHandlers();
  } catch (error: any) {
    logger.error("FATAL: Failed to connect to MongoDB", {
      error: error.message,
      stack: error.stack,
    });
    dbConnectionGauge.set({ state: "error" }, 1);
    process.exit(1);
  }
}

function registerConnectionHandlers(): void {
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB error", { error: err.message, stack: err.stack });
    dbConnectionGauge.set({ state: "error" }, 1);
    dbConnectionGauge.set({ state: "connected" }, 0);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    dbConnectionGauge.set({ state: "connected" }, 0);
    dbConnectionGauge.set({ state: "disconnected" }, 1);
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
    dbConnectionGauge.set({ state: "connected" }, 1);
    dbConnectionGauge.set({ state: "disconnected" }, 0);
  });
}
