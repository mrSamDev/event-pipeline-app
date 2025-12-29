import { EventType, IEvent } from "@martech/types";
import mongoose, { type Document, Schema } from "mongoose";

// Mongoose document interface
// Note: We use a custom _id (string) instead of ObjectId for eventId
export interface IEventDocument extends Omit<Document, "_id"> {
	_id: string; // Using eventId as _id (string instead of ObjectId)
	userId: string;
	sessionId: string;
	type: EventType;
	payload: Record<string, any>;
	occurredAt: Date;
	receivedAt: Date;
}

// Mongoose schema definition
const eventSchema = new Schema<IEventDocument>(
	{
		// Use eventId as _id to save 12 bytes per document (no separate _id field)
		_id: {
			type: String,
			required: true,
		},
		userId: {
			type: String,
			required: true,
			index: true, // Part of compound index
		},
		sessionId: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			enum: Object.values(EventType),
			required: true,
		},
		payload: {
			type: Schema.Types.Mixed,
			required: true,
			default: {},
		},
		occurredAt: {
			type: Date,
			required: true,
		},
		receivedAt: {
			type: Date,
			required: true,
			default: () => new Date(),
		},
	},
	{
		// Disable __v field (not needed for append-only collection)
		versionKey: false,
		// Disable automatic timestamps (we manage receivedAt manually)
		timestamps: false,
		// Enforce schema validation strictly
		strict: true,
		// Collection name
		collection: "events",
	},
);

// Critical indexes for performance

// Primary index: User journey queries - userId + occurredAt descending
// Supports efficient queries like: GET /users/:userId/journey?from=X&to=Y&limit=100
// Compound index with high cardinality (userId) first, then low cardinality (occurredAt)
// Descending on occurredAt for recent-first queries
eventSchema.index({ userId: 1, occurredAt: -1 });

// Uniqueness index: eventId is already the primary key (_id), so it's automatically unique
// This prevents duplicate event ingestion and enables idempotent retries

// Optional: TTL index for data retention (90 days)
// Uncomment if you want automatic deletion of old events
// eventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 7776000 });

// Optional: Analytics index for event-type based queries
// Only add if you need to query by event type frequently
// eventSchema.index({ type: 1, occurredAt: -1 });

// Create and export the model
export const Event = mongoose.model<IEventDocument>("Event", eventSchema);
