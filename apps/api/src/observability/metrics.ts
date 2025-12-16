import { Counter, Gauge, Histogram, register } from "prom-client";

/**
 * Custom application metrics for business logic monitoring
 * These complement the auto-instrumented OpenTelemetry metrics
 */

// Event ingestion metrics
export const eventIngestionCounter = new Counter({
  name: "martech_events_ingested_total",
  help: "Total number of events ingested",
  labelNames: ["event_type", "status"],
});

export const eventIngestionDuration = new Histogram({
  name: "martech_event_ingestion_duration_seconds",
  help: "Duration of event ingestion operations",
  labelNames: ["event_type", "operation"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const bufferSizeGauge = new Gauge({
  name: "martech_buffer_size",
  help: "Current size of the event buffer",
});

export const bufferFlushCounter = new Counter({
  name: "martech_buffer_flushes_total",
  help: "Total number of buffer flush operations",
  labelNames: ["status"],
});

// Database metrics
export const dbConnectionGauge = new Gauge({
  name: "martech_db_connections",
  help: "Current number of database connections",
  labelNames: ["state"],
});

export const dbOperationDuration = new Histogram({
  name: "martech_db_operation_duration_seconds",
  help: "Duration of database operations",
  labelNames: ["operation", "collection"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

// HTTP metrics (custom ones, in addition to auto-instrumented)
export const httpRequestsTotal = new Counter({
  name: "martech_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
});

export const activeRequestsGauge = new Gauge({
  name: "martech_http_active_requests",
  help: "Number of HTTP requests currently being processed",
});

// System metrics
export const systemMemoryGauge = new Gauge({
  name: "martech_system_memory_bytes",
  help: "System memory usage",
  labelNames: ["type"],
});

// Export Prometheus registry for custom endpoints
export { register };

/**
 * Start collecting default metrics (CPU, memory, etc.)
 */
export function startMetricsCollection() {
  // Collect default metrics every 10 seconds
  const collectDefaultMetrics = require("prom-client").collectDefaultMetrics;
  collectDefaultMetrics({
    prefix: "martech_",
    register,
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  });

  console.log("[Metrics] Started collecting default Prometheus metrics");
}
