import winston from "winston";
import WinstonCloudWatch from "winston-cloudwatch";

/**
 * Create a structured logger with CloudWatch support
 * Logs are sent to CloudWatch Logs when running on AWS EC2
 */
export function createLogger() {
	const awsRegion = process.env.AWS_REGION || "ap-south-1";
	const enableCloudWatch = process.env.ENABLE_CLOUDWATCH_LOGS === "true";

	// Base format: timestamp + level + message + metadata
	const baseFormat = winston.format.combine(
		winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
		winston.format.errors({ stack: true }),
		winston.format.metadata(),
		winston.format.json(),
	);

	const transports: winston.transport[] = [];

	// Console transport (always enabled for visibility)
	transports.push(
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(({ timestamp, level, message, ...meta }) => {
					const metaStr = Object.keys(meta).length
						? JSON.stringify(meta, null, 2)
						: "";
					return `${timestamp} [${level}] ${message} ${metaStr}`;
				}),
			),
		}),
	);

	// CloudWatch transport for AWS EC2 deployments
	if (enableCloudWatch) {
		transports.push(
			new WinstonCloudWatch({
				logGroupName: "/aws/ec2/martech-api",
				logStreamName: `api-${new Date().toISOString().split("T")[0]}`,
				awsRegion: awsRegion,
				messageFormatter: ({ level, message, ...meta }) => {
					return JSON.stringify({ level, message, ...meta });
				},
			}),
		);
		console.log(`[Logger] CloudWatch transport configured: ${awsRegion}`);
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
