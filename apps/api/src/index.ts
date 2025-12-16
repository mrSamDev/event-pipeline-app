import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { registerRoutes } from "./routes";
import { EventIngestionService } from "./services/eventIngestion.service";
import { swaggerSpec } from "./swagger";
import { initializeTelemetry, logger, startMetricsCollection, bufferSizeGauge } from "./observability";
import { observabilityMiddleware } from "./middleware/observability.middleware";
import { sessionMiddleware } from "./middleware/auth.middleware";
import { connectDatabase } from "./database/connection";
import { gracefulShutdown } from "./utils/shutdown";
import { startDailyAnalyticsExportJob } from "./jobs/dailyAnalyticsExport.job";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

initializeTelemetry();
startMetricsCollection();

const app = express();
const PORT = process.env.PORT || 3000;

let server: ReturnType<typeof app.listen>;
let ingestionService: EventIngestionService;

function initializeApp(): void {
  const isDevelopment = process.env.NODE_ENV !== "production";

  app.use(
    cors({
      origin: isDevelopment ? ["http://localhost:5173", "http://localhost:3000"] : process.env.ALLOWED_ORIGINS?.split(",") || [],
      credentials: true,
    })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(observabilityMiddleware);
  app.use(sessionMiddleware);

  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "MarTech API Documentation",
    })
  );

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  logger.info("Swagger documentation available at /api-docs");

  app.get("/health", (_req, res) => {
    const bufferSize = ingestionService?.getBufferSize() || 0;
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      bufferSize,
    };

    bufferSizeGauge.set(bufferSize);

    const statusCode = health.database === "connected" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  ingestionService = registerRoutes(app);

  logger.info("Express application initialized");
}

async function bootstrap(): Promise<void> {
  logger.info("Starting application...", {
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
  });

  try {
    const mongoUri = process.env.MONGODB_URI || "";
    await connectDatabase(mongoUri);

    initializeApp();

    server = app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`, {
        port: PORT,
        healthCheck: `http://localhost:${PORT}/health`,
        metrics: `http://localhost:${process.env.PROMETHEUS_PORT || 9464}/metrics`,
        apiDocs: `http://localhost:${PORT}/api-docs`,
        allowedOrigins: process.env.ALLOWED_ORIGINS || "Not set",
      });

      // Start daily analytics export job after server is ready
      startDailyAnalyticsExportJob();
    });

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server, ingestionService));
    process.on("SIGINT", () => gracefulShutdown("SIGINT", server, ingestionService));

    process.on("uncaughtException", (error) => {
      logger.error("FATAL: Uncaught exception", {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown("uncaughtException", server, ingestionService);
    });

    process.on("unhandledRejection", (reason) => {
      logger.error("FATAL: Unhandled promise rejection", { reason });
      gracefulShutdown("unhandledRejection", server, ingestionService);
    });
  } catch (error: any) {
    logger.error("FATAL: Application startup failed", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the application
bootstrap();
