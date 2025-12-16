import winston from "winston";
import LokiTransport from "winston-loki";

/**
 * Create a structured logger with Loki support
 * Logs are sent to Loki for centralized log aggregation in Grafana
 */
export function createLogger() {
  const lokiHost = process.env.LOKI_HOST || "http://localhost:3100";
  const isProduction = process.env.NODE_ENV === "production";

  // Base format: timestamp + level + message + metadata
  const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    winston.format.json()
  );

  const transports: winston.transport[] = [];

  // Console transport for development
  if (!isProduction) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
            return `${timestamp} [${level}] ${message} ${metaStr}`;
          })
        ),
      })
    );
  }

  // Loki transport for production (or if LOKI_HOST is set)
  if (isProduction || process.env.LOKI_HOST) {
    transports.push(
      new LokiTransport({
        host: lokiHost,
        labels: {
          service: "martech-api",
          environment: process.env.NODE_ENV || "development",
        },
        json: true,
        format: baseFormat,
        replaceTimestamp: true,
        onConnectionError: (err) => {
          console.error("[Logger] Failed to connect to Loki:", err);
        },
      })
    );
    console.log(`[Logger] Loki transport configured: ${lokiHost}`);
  }

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: baseFormat,
    transports,
    defaultMeta: {
      service: "martech-api",
    },
  });

  return logger;
}

// Create and export singleton logger instance
export const logger = createLogger();
