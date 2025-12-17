import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { NodeSDK } from "@opentelemetry/sdk-node";

/**
 * Initialize OpenTelemetry with Prometheus metrics exporter
 * This enables automatic instrumentation for:
 * - HTTP requests (Express)
 * - MongoDB operations
 * - DNS lookups
 * - Network calls
 */
export function initializeTelemetry() {
	// Prometheus exporter configuration
	// Exposes metrics on /metrics endpoint (default port 9464)
	const prometheusExporter = new PrometheusExporter(
		{
			port: Number(process.env.PROMETHEUS_PORT) || 9464,
			endpoint: "/metrics",
		},
		() => {
			console.log(
				"[Telemetry] Prometheus metrics available at http://localhost:" +
					(process.env.PROMETHEUS_PORT || 9464) +
					"/metrics",
			);
		},
	);

	// Initialize OpenTelemetry SDK with auto-instrumentation
	const sdk = new NodeSDK({
		serviceName: "martech-api",
		metricReader: prometheusExporter,
		instrumentations: [
			getNodeAutoInstrumentations({
				// Fine-tune auto-instrumentation
				"@opentelemetry/instrumentation-fs": {
					enabled: false, // Disable filesystem instrumentation (too noisy)
				},
				"@opentelemetry/instrumentation-express": {
					enabled: true,
				},
				"@opentelemetry/instrumentation-http": {
					enabled: true,
				},
				"@opentelemetry/instrumentation-mongodb": {
					enabled: true,
				},
			}),
		],
	});

	// Start the SDK
	sdk.start();

	console.log(
		"[Telemetry] OpenTelemetry initialized with auto-instrumentation",
	);

	// Graceful shutdown
	process.on("SIGTERM", () => {
		sdk
			.shutdown()
			.then(() => console.log("[Telemetry] SDK shut down successfully"))
			.catch((error) =>
				console.error("[Telemetry] Error shutting down SDK", error),
			);
	});

	return sdk;
}
