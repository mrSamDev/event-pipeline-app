import swaggerJsdoc from "swagger-jsdoc";
import { SwaggerDefinition } from "swagger-jsdoc";

/**
 * Swagger/OpenAPI Configuration
 *
 * This file defines the OpenAPI specification for the API.
 * It provides interactive documentation accessible at /api-docs
 */

const swaggerDefinition: SwaggerDefinition = {
	openapi: "3.0.0",
	info: {
		title: "MarTech Event Ingestion & Auth API",
		version: "1.0.0",
		description: `
A production-grade event ingestion pipeline with user authentication.

## Features
- **Event Ingestion**: High-volume event pipeline with buffered batch processing
- **Authentication**: Email/password auth with session management via Better Auth
- **User Journeys**: Query user event timelines with filtering
- **MongoDB Storage**: Optimized indexes for read/write performance

## Architecture
- Write-optimized: Batches 500 events, bulk inserts
- Read-optimized: Compound MongoDB indexes
- Dual-trigger flushing: Size (500 events) OR Time (1000ms)
- Graceful shutdown with buffer flush
    `,
		contact: {
			name: "API Support",
			email: "dev.sijo.sam@gmail.com",
		},
		license: {
			name: "MIT",
			url: "https://opensource.org/licenses/MIT",
		},
	},
	servers: [
		{
			url: "http://localhost:3000",
			description: "Development server",
		},
		{
			url: "https://api-veritas.mrsamdev.xyz",
			description: "Production server",
		},
	],
	tags: [
		{
			name: "Authentication",
			description:
				"User authentication and session management endpoints (Better Auth)",
		},
		{
			name: "Events",
			description: "Event ingestion and user journey endpoints",
		},
		{
			name: "Monitoring",
			description: "Health checks and system statistics",
		},
	],
	components: {
		securitySchemes: {
			cookieAuth: {
				type: "apiKey",
				in: "cookie",
				name: "better-auth.session_token",
				description: "Session token cookie set by Better Auth after login",
			},
		},
		schemas: {
			User: {
				type: "object",
				properties: {
					id: {
						type: "string",
						description: "Unique user identifier (UUID)",
						example: "550e8400-e29b-41d4-a716-446655440000",
					},
					email: {
						type: "string",
						format: "email",
						description: "User's email address",
						example: "user@example.com",
					},
					name: {
						type: "string",
						description: "User's full name",
						example: "John Doe",
					},
					emailVerified: {
						type: "boolean",
						description: "Whether the email has been verified",
						example: false,
					},
					createdAt: {
						type: "string",
						format: "date-time",
						description: "Account creation timestamp",
						example: "2025-12-15T10:30:00.000Z",
					},
				},
			},
			Session: {
				type: "object",
				properties: {
					token: {
						type: "string",
						description: "Session token",
						example: "session-token-here",
					},
					userId: {
						type: "string",
						description: "User ID associated with this session",
						example: "550e8400-e29b-41d4-a716-446655440000",
					},
					expiresAt: {
						type: "string",
						format: "date-time",
						description: "Session expiration timestamp",
						example: "2025-12-22T10:30:00.000Z",
					},
				},
			},
			Event: {
				type: "object",
				required: ["userId", "sessionId", "type"],
				properties: {
					eventId: {
						type: "string",
						description: "Unique event identifier (UUID, auto-generated)",
						example: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
					},
					userId: {
						type: "string",
						description: "User identifier",
						example: "user123",
					},
					sessionId: {
						type: "string",
						description: "Session identifier",
						example: "sess456",
					},
					type: {
						type: "string",
						enum: [
							"session_start",
							"page_view",
							"search",
							"purchase",
							"add_to_cart",
							"remove_from_cart",
							"button_click",
							"form_submit",
							"video_play",
							"video_pause",
						],
						description: "Event type",
						example: "page_view",
					},
					payload: {
						type: "object",
						description: "Event-specific data",
						example: { url: "/products/123", referrer: "https://google.com" },
					},
					occurredAt: {
						type: "string",
						format: "date-time",
						description:
							"When the event occurred (ISO 8601). Defaults to current time if not provided.",
						example: "2025-12-15T10:30:00Z",
					},
					receivedAt: {
						type: "string",
						format: "date-time",
						description: "When the server received the event (auto-generated)",
						example: "2025-12-15T10:30:01.234Z",
					},
				},
			},
			Error: {
				type: "object",
				properties: {
					error: {
						type: "string",
						description: "Error type",
						example: "Validation Error",
					},
					message: {
						type: "string",
						description: "Error message",
						example: "Missing required fields",
					},
					details: {
						type: "object",
						description: "Additional error details",
					},
				},
			},
		},
	},
};

const options: swaggerJsdoc.Options = {
	definition: {
		...swaggerDefinition,
		paths: {
			"/events": {
				post: {
					tags: ["Events"],
					summary: "Ingest one or more events",
					description:
						"Accepts single event or array of events for ingestion into the pipeline. Events are buffered in memory and flushed to MongoDB when buffer reaches 500 events or after 1000ms. Returns 202 Accepted immediately - processing is asynchronous.",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									oneOf: [
										{ $ref: "#/components/schemas/Event" },
										{
											type: "array",
											items: { $ref: "#/components/schemas/Event" },
										},
									],
								},
								examples: {
									singleEvent: {
										summary: "Single event",
										value: {
											userId: "user123",
											sessionId: "sess456",
											type: "page_view",
											payload: {
												url: "/products/123",
												referrer: "https://google.com",
											},
										},
									},
									batchEvents: {
										summary: "Batch of events",
										value: [
											{
												userId: "user123",
												sessionId: "sess456",
												type: "page_view",
												payload: { url: "/home" },
											},
											{
												userId: "user123",
												sessionId: "sess456",
												type: "button_click",
												payload: { button: "add_to_cart" },
											},
										],
									},
								},
							},
						},
					},
					responses: {
						202: {
							description: "Events accepted for processing",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											message: {
												type: "string",
												example: "Events accepted for processing",
											},
											count: { type: "integer", example: 2 },
											eventIds: {
												type: "array",
												items: { type: "string" },
												example: ["uuid-1", "uuid-2"],
											},
										},
									},
								},
							},
						},
						400: {
							description: "Invalid request payload",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						503: {
							description: "Buffer overflow - service unavailable",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/users/{userId}/journey": {
				get: {
					tags: ["Events"],
					summary: "Get user event journey",
					description:
						"Retrieve a user's event timeline with optional date range filtering and pagination",
					security: [{ cookieAuth: [] }],
					parameters: [
						{
							in: "path",
							name: "userId",
							required: true,
							schema: { type: "string" },
							description: "User identifier",
							example: "user123",
						},
						{
							in: "query",
							name: "from",
							schema: { type: "string", format: "date-time" },
							description: "Start date (ISO 8601 format)",
							example: "2025-12-01T00:00:00Z",
						},
						{
							in: "query",
							name: "to",
							schema: { type: "string", format: "date-time" },
							description: "End date (ISO 8601 format)",
							example: "2025-12-15T23:59:59Z",
						},
						{
							in: "query",
							name: "limit",
							schema: {
								type: "integer",
								minimum: 1,
								maximum: 1000,
								default: 100,
							},
							description: "Maximum number of events to return",
						},
					],
					responses: {
						200: {
							description: "User journey retrieved successfully",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											userId: { type: "string", example: "user123" },
											count: { type: "integer", example: 50 },
											events: {
												type: "array",
												items: { $ref: "#/components/schemas/Event" },
											},
										},
									},
								},
							},
						},
						400: {
							description: "Invalid query parameters",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
						401: { description: "Not authenticated" },
					},
				},
			},
			"/stats": {
				get: {
					tags: ["Monitoring"],
					summary: "Get buffer statistics",
					description:
						"Returns current buffer state and statistics for monitoring purposes",
					security: [{ cookieAuth: [] }],
					responses: {
						200: {
							description: "Buffer statistics retrieved successfully",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											bufferSize: {
												type: "integer",
												description: "Current number of events in buffer",
												example: 150,
											},
											isFlushingInProgress: {
												type: "boolean",
												description:
													"Whether a flush operation is currently running",
												example: false,
											},
											maxBufferSize: {
												type: "integer",
												description:
													"Buffer size threshold that triggers flush",
												example: 500,
											},
											emergencyThreshold: {
												type: "integer",
												description:
													"Emergency threshold where events start getting dropped",
												example: 5000,
											},
											bufferUtilization: {
												type: "number",
												description: "Buffer usage percentage",
												example: 30,
											},
										},
									},
								},
							},
						},
						401: { description: "Not authenticated" },
					},
				},
			},
			"/health": {
				get: {
					tags: ["Monitoring"],
					summary: "Health check endpoint",
					description:
						"Returns service health status including database connection, uptime, memory usage, and buffer size",
					responses: {
						200: {
							description: "Service is healthy",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											status: { type: "string", example: "ok" },
											timestamp: {
												type: "string",
												format: "date-time",
												example: "2025-12-17T10:30:00.000Z",
											},
											uptime: {
												type: "number",
												description: "Process uptime in seconds",
												example: 3600,
											},
											memory: {
												type: "object",
												properties: {
													rss: {
														type: "number",
														description: "Resident Set Size",
													},
													heapTotal: {
														type: "number",
														description: "Total heap size",
													},
													heapUsed: {
														type: "number",
														description: "Used heap size",
													},
													external: {
														type: "number",
														description: "External memory",
													},
												},
											},
											database: {
												type: "string",
												enum: ["connected", "disconnected"],
												example: "connected",
											},
											bufferSize: {
												type: "integer",
												description: "Current events in buffer",
												example: 150,
											},
										},
									},
								},
							},
						},
						503: {
							description: "Service unavailable (database disconnected)",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											status: { type: "string", example: "ok" },
											database: { type: "string", example: "disconnected" },
										},
									},
								},
							},
						},
					},
				},
			},
			"/api/auth/sign-up/email": {
				post: {
					tags: ["Authentication"],
					summary: "Register a new user",
					description: "Create a new user account with email and password",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["email", "password"],
									properties: {
										email: {
											type: "string",
											format: "email",
											example: "user@example.com",
										},
										password: {
											type: "string",
											format: "password",
											minLength: 8,
											example: "securepass123",
										},
										name: { type: "string", example: "John Doe" },
									},
								},
							},
						},
					},
					responses: {
						200: {
							description: "User registered successfully",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											user: { $ref: "#/components/schemas/User" },
											session: { $ref: "#/components/schemas/Session" },
										},
									},
								},
							},
						},
						400: {
							description: "Invalid input or email already exists",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/api/auth/sign-in/email": {
				post: {
					tags: ["Authentication"],
					summary: "Login with email and password",
					description: "Authenticate user and create a session",
					requestBody: {
						required: true,
						content: {
							"application/json": {
								schema: {
									type: "object",
									required: ["email", "password"],
									properties: {
										email: {
											type: "string",
											format: "email",
											example: "user@example.com",
										},
										password: {
											type: "string",
											format: "password",
											example: "securepass123",
										},
									},
								},
							},
						},
					},
					responses: {
						200: {
							description: "Login successful",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											user: { $ref: "#/components/schemas/User" },
											session: { $ref: "#/components/schemas/Session" },
										},
									},
								},
							},
						},
						401: {
							description: "Invalid credentials",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/api/auth/sign-out": {
				post: {
					tags: ["Authentication"],
					summary: "Logout",
					description: "Invalidate current session",
					security: [{ cookieAuth: [] }],
					responses: {
						200: { description: "Logout successful" },
						401: { description: "Not authenticated" },
					},
				},
			},
			"/api/auth/get-session": {
				get: {
					tags: ["Authentication"],
					summary: "Get current session",
					description:
						"Retrieve information about the current authenticated session",
					security: [{ cookieAuth: [] }],
					responses: {
						200: {
							description: "Session retrieved successfully",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											session: { $ref: "#/components/schemas/Session" },
											user: { $ref: "#/components/schemas/User" },
										},
									},
								},
							},
						},
						401: { description: "Not authenticated" },
					},
				},
			},
			"/session": {
				get: {
					tags: ["Authentication"],
					summary: "Check current session",
					description: "Convenience endpoint to verify authentication status",
					security: [{ cookieAuth: [] }],
					responses: {
						200: {
							description: "Authenticated",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											session: { $ref: "#/components/schemas/Session" },
											user: { $ref: "#/components/schemas/User" },
										},
									},
								},
							},
						},
						401: {
							description: "Not authenticated",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/Error" },
								},
							},
						},
					},
				},
			},
			"/users": {
				get: {
					tags: ["Authentication"],
					summary: "List all users",
					description: "Get a list of all registered users with their metrics",
					security: [{ cookieAuth: [] }],
					responses: {
						200: {
							description: "Users retrieved successfully",
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											users: {
												type: "array",
												items: { $ref: "#/components/schemas/User" },
											},
										},
									},
								},
							},
						},
						401: { description: "Not authenticated" },
					},
				},
			},
		},
	},
	// No need to scan files anymore - all docs are in the definition above
	apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
