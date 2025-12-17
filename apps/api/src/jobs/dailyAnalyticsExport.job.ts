import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import cron from "node-cron";
import { Event } from "../models/Event";
import { logger } from "../observability";
import { EventRepository } from "../repositories/event.repository";

const S3_BUCKET = "wbd-analytics-exports";
const S3_REGION = "ap-south-1";

let isJobRunning = false;

const s3Client = new S3Client({
	region: S3_REGION,
});

interface ExportPayload {
	generatedAt: string;
	date: string;
	summary: {
		totalUsers: number;
		totalEvents: number;
	};
	eventsByType: Record<string, number>;
	eventsByHour: Array<{ hour: number; count: number }>;
}

async function generateAnalyticsExport(): Promise<ExportPayload> {
	const [totalUsers, totalEvents, eventsByType, eventsByHour] =
		await Promise.all([
			Event.distinct("userId").then((users) => users.length),
			Event.countDocuments(),
			Event.aggregate([
				{
					$group: {
						_id: "$type",
						count: { $sum: 1 },
					},
				},
			]),
			Event.aggregate([
				{
					$project: {
						hour: { $hour: "$occurredAt" },
					},
				},
				{
					$group: {
						_id: "$hour",
						count: { $sum: 1 },
					},
				},
				{
					$sort: { _id: 1 },
				},
			]),
		]);

	const eventsByTypeMap: Record<string, number> = {};
	eventsByType.forEach((item: any) => {
		eventsByTypeMap[item._id] = item.count;
	});

	const eventsByHourArray = eventsByHour.map((item: any) => ({
		hour: item._id,
		count: item.count,
	}));

	const now = new Date();
	const dateStr = now.toISOString().split("T")[0];

	return {
		generatedAt: now.toISOString(),
		date: dateStr,
		summary: {
			totalUsers,
			totalEvents,
		},
		eventsByType: eventsByTypeMap,
		eventsByHour: eventsByHourArray,
	};
}

function buildS3Key(): string {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, "0");
	const day = String(now.getUTCDate()).padStart(2, "0");
	const hour = String(now.getUTCHours()).padStart(2, "0");
	const minute = String(now.getUTCMinutes()).padStart(2, "0");

	return `exports/analytics-${year}-${month}-${day}-${hour}-${minute}-UTC.json`;
}

async function uploadToS3(payload: ExportPayload): Promise<void> {
	const key = buildS3Key();

	const command = new PutObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
		Body: JSON.stringify(payload, null, 2),
		ContentType: "application/json",
	});

	await s3Client.send(command);

	logger.info("[DailyAnalyticsExportJob] Upload successful", {
		bucket: S3_BUCKET,
		key,
		totalUsers: payload.summary.totalUsers,
		totalEvents: payload.summary.totalEvents,
	});
}

async function runExportJob(): Promise<void> {
	if (isJobRunning) {
		logger.warn(
			"[DailyAnalyticsExportJob] Skipping execution - previous job still running",
		);
		return;
	}

	isJobRunning = true;
	logger.info("[DailyAnalyticsExportJob] Starting daily analytics export");

	try {
		const payload = await generateAnalyticsExport();
		await uploadToS3(payload);

		logger.info("[DailyAnalyticsExportJob] Job completed successfully", {
			totalUsers: payload.summary.totalUsers,
			totalEvents: payload.summary.totalEvents,
		});
	} catch (error: any) {
		logger.error("[DailyAnalyticsExportJob] Job failed", {
			error: error.message,
			stack: error.stack,
		});
	} finally {
		isJobRunning = false;
	}
}

export function startDailyAnalyticsExportJob(): void {
	const cronExpression = "0 10 * * *";

	cron.schedule(cronExpression, runExportJob, {
		timezone: "UTC",
	});

	logger.info("[DailyAnalyticsExportJob] Scheduled daily export at 10:00 UTC", {
		cronExpression,
		timezone: "UTC",
	});
}
