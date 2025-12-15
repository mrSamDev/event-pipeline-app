import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { registerRoutes } from "./routes";
import { EventIngestionService } from "./services/eventIngestion.service";
import { swaggerSpec } from "./swagger";

// Load environment variables from .env file
dotenv.config({});

// Express application instance
const app = express();
const PORT = process.env.PORT || 3000;

// Reference to HTTP server (needed for graceful shutdown)
let server: ReturnType<typeof app.listen>;

// Reference to ingestion service (needed for graceful shutdown buffer flush)
let ingestionService: EventIngestionService;

/**
 * Connect to MongoDB with optimized connection pooling
 * Fail fast on connection errors - don't start server if DB is unavailable
 */
async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("[Database] FATAL: MONGODB_URI environment variable not set");
    console.error("[Database] Please set MONGODB_URI in your .env file");
    process.exit(1);
  }

  try {
    // Connection options optimized for write-heavy workload
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // Max 10 concurrent connections (tune based on load)
      minPoolSize: 2, // Keep 2 connections warm (reduce connection overhead)
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB unavailable (5s timeout)
      socketTimeoutMS: 45000, // Socket timeout for long operations (45s)
      retryWrites: true, // Automatic retry for transient write errors
    });

    console.log("[Database] MongoDB connected successfully:", {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      port: mongoose.connection.port,
    });

    // Connection event handlers for monitoring
    mongoose.connection.on("error", (err) => {
      console.error("[Database] MongoDB error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[Database] MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("[Database] MongoDB reconnected");
    });
  } catch (error: any) {
    console.error("[Database] FATAL: Failed to connect to MongoDB:", error.message);
    console.error("[Database] Error details:", error);
    process.exit(1); // Fail fast - don't start server without database
  }
}

/**
 * Initialize Express application with middleware and routes
 */
function initializeApp(): void {
  // CORS middleware - allow cross-origin requests
  // In production, configure with specific origins
  app.use(cors());

  // JSON body parser middleware
  // Limit payload size to prevent memory exhaustion attacks
  app.use(express.json({ limit: "10mb" }));

  // Swagger UI Documentation
  // Interactive API documentation available at /api-docs
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "MarTech API Documentation",
  }));

  // Swagger JSON endpoint for OpenAPI spec
  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("[App] Swagger documentation available at /api-docs");

  // Health check endpoint
  // Enhanced with database status and buffer size for monitoring
  app.get("/health", (_req, res) => {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      bufferSize: ingestionService?.getBufferSize() || 0,
    };

    // Return 503 if database is disconnected
    const statusCode = health.database === "connected" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Register application routes
  // This returns the ingestion service for graceful shutdown access
  ingestionService = registerRoutes(app);

  console.log("[App] Express application initialized");
}

/**
 * Graceful shutdown handler
 * Ensures no events are lost when process is terminated
 *
 * Shutdown sequence:
 * 1. Stop accepting new HTTP connections
 * 2. Wait for in-flight requests to complete (10s timeout)
 * 3. Flush buffer to database (persist all buffered events)
 * 4. Close database connection cleanly
 * 5. Exit process
 *
 * @param signal - Signal that triggered shutdown (SIGTERM, SIGINT, etc.)
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Shutdown] Graceful shutdown initiated by signal: ${signal}`);

  try {
    // Step 1: Stop accepting new connections
    // server.close() stops accepting new connections but allows existing ones to complete
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log("[Shutdown] HTTP server closed (no new connections)");
          resolve();
        });

        // Force close after 10s if connections don't drain
        setTimeout(() => {
          console.warn("[Shutdown] Force closing HTTP server after timeout");
          resolve();
        }, 10000);
      });
    }

    // Step 2: Flush buffer - CRITICAL: don't lose buffered events
    if (ingestionService) {
      console.log("[Shutdown] Flushing buffer before shutdown...");
      await ingestionService.forceFlush();
      console.log("[Shutdown] Buffer flushed successfully");
    }

    // Step 3: Close database connection cleanly
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false); // false = don't force
      console.log("[Shutdown] Database connection closed");
    }

    console.log("[Shutdown] Graceful shutdown completed successfully");
    process.exit(0);
  } catch (error: any) {
    console.error("[Shutdown] Error during graceful shutdown:", error);
    console.error("[Shutdown] Forcing exit...");
    process.exit(1);
  }
}

/**
 * Bootstrap application
 * Main entry point for the service
 */
async function bootstrap(): Promise<void> {
  console.log("[Bootstrap] Starting application...");
  console.log("[Bootstrap] Node version:", process.version);
  console.log("[Bootstrap] Environment:", process.env.NODE_ENV || "development");

  try {
    // Step 1: Connect to database (fail fast if unavailable)
    await connectDatabase();

    // Step 2: Initialize Express app with middleware and routes
    initializeApp();

    // Step 3: Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`[Bootstrap] Server listening on port ${PORT}`);
      console.log(`[Bootstrap] Health check: http://localhost:${PORT}/health`);
      console.log(`[Bootstrap] API ready to accept events`);
    });

    // Step 4: Register signal handlers for graceful shutdown
    // SIGTERM: Kubernetes/Docker sends this for graceful shutdown
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    // SIGINT: Ctrl+C in terminal
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Uncaught exception handler (last resort)
    process.on("uncaughtException", (error) => {
      console.error("[Bootstrap] FATAL: Uncaught exception:", error);
      gracefulShutdown("uncaughtException");
    });

    // Unhandled promise rejection handler
    process.on("unhandledRejection", (reason) => {
      console.error("[Bootstrap] FATAL: Unhandled promise rejection:", reason);
      gracefulShutdown("unhandledRejection");
    });
  } catch (error: any) {
    console.error("[Bootstrap] FATAL: Application startup failed:", error);
    process.exit(1);
  }
}

// Start the application
bootstrap();
