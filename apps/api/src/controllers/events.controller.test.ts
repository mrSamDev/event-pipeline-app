import { EventType } from "@martech/types";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRepository } from "../repositories/event.repository";
import type { EventIngestionService } from "../services/eventIngestion.service";
import { EventsController } from "./events.controller";

describe("EventsController", () => {
	let controller: EventsController;
	let mockIngestionService: EventIngestionService;
	let mockRepository: EventRepository;
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;
	let jsonMock: ReturnType<typeof vi.fn>;
	let statusMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockIngestionService = {
			canAcceptEvent: vi.fn().mockReturnValue(true),
			addEvent: vi.fn().mockResolvedValue(undefined),
			forceFlush: vi.fn(),
			getBufferSize: vi.fn(),
			getStats: vi.fn(),
		} as any;

		mockRepository = {
			bulkInsert: vi.fn(),
			getUserJourney: vi.fn(),
			getAnalyticsStats: vi.fn(),
			getUserMetrics: vi.fn(),
		} as any;

		controller = new EventsController(mockIngestionService, mockRepository);

		jsonMock = vi.fn();
		statusMock = vi.fn();
		mockResponse = {
			status: statusMock,
			json: jsonMock,
		} as any;
		statusMock.mockReturnValue(mockResponse);
	});

	describe("ingestEvent", () => {
		it("accepts valid single event", async () => {
			mockRequest = {
				body: {
					userId: "user123",
					sessionId: "session456",
					type: EventType.PAGE_VIEW,
					payload: { url: "/home" },
				},
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(202);
			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Events accepted for processing",
					count: 1,
					eventIds: expect.any(Array),
				}),
			);
		});

		it("accepts valid batch of events", async () => {
			mockRequest = {
				body: [
					{
						userId: "user123",
						sessionId: "session456",
						type: "page_view",
					},
					{
						userId: "user123",
						sessionId: "session456",
						type: "button_click",
					},
				],
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(202);
			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					count: 2,
				}),
			);
		});

		it("rejects when buffer is full", async () => {
			mockIngestionService.canAcceptEvent = vi.fn().mockReturnValue(false);
			mockRequest = {
				body: {
					userId: "user123",
					sessionId: "session456",
					type: EventType.PAGE_VIEW,
				},
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(429);
			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Too Many Requests",
				}),
			);
		});

		it("rejects event with missing userId", async () => {
			mockRequest = {
				body: {
					sessionId: "session456",
					type: EventType.PAGE_VIEW,
				},
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Bad Request",
				}),
			);
		});

		it("rejects event with invalid type", async () => {
			mockRequest = {
				body: {
					userId: "user123",
					sessionId: "session456",
					type: "INVALID_TYPE",
				},
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});

		it("rejects event with invalid occurredAt", async () => {
			mockRequest = {
				body: {
					userId: "user123",
					sessionId: "session456",
					type: EventType.PAGE_VIEW,
					occurredAt: "invalid-date",
				},
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});

		it("handles service errors", async () => {
			mockIngestionService.addEvent = vi
				.fn()
				.mockRejectedValue(new Error("Service error"));
			mockRequest = {
				body: {
					userId: "user123",
					sessionId: "session456",
					type: EventType.PAGE_VIEW,
				},
			};

			await controller.ingestEvent(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(500);
			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					error: "Internal Server Error",
				}),
			);
		});
	});

	describe("getUserJourney", () => {
		it("fetches user journey with valid params", async () => {
			const mockEvents = [
				{ eventId: "1", type: EventType.PAGE_VIEW, occurredAt: new Date() },
			];
			mockRepository.getUserJourney = vi.fn().mockResolvedValue(mockEvents);

			mockRequest = {
				params: { userId: "user123" },
				query: {},
			};

			await controller.getUserJourney(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(200);
			expect(jsonMock).toHaveBeenCalledWith({
				userId: "user123",
				count: 1,
				events: mockEvents,
			});
		});

		it("validates from date parameter", async () => {
			mockRequest = {
				params: { userId: "user123" },
				query: { from: "invalid-date" },
			};

			await controller.getUserJourney(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
			expect(jsonMock).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Invalid "from" date format'),
				}),
			);
		});

		it("validates to date parameter", async () => {
			mockRequest = {
				params: { userId: "user123" },
				query: { to: "invalid-date" },
			};

			await controller.getUserJourney(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});

		it("validates limit parameter", async () => {
			mockRequest = {
				params: { userId: "user123" },
				query: { limit: "5000" },
			};

			await controller.getUserJourney(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});

		it("rejects invalid userId", async () => {
			mockRequest = {
				params: {},
				query: {},
			};

			await controller.getUserJourney(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});
	});

	describe("getStats", () => {
		it("returns analytics stats", async () => {
			const mockStats = {
				totalEvents: 1000,
				totalUsers: 50,
			};
			mockRepository.getAnalyticsStats = vi.fn().mockResolvedValue(mockStats);

			mockRequest = {};

			await controller.getStats(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(200);
			expect(jsonMock).toHaveBeenCalledWith(mockStats);
		});

		it("handles errors", async () => {
			mockRepository.getAnalyticsStats = vi
				.fn()
				.mockRejectedValue(new Error("DB error"));

			mockRequest = {};

			await controller.getStats(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(500);
		});
	});

	describe("getUsers", () => {
		it("returns paginated users with defaults", async () => {
			const mockResult = {
				users: [],
				pagination: { page: 1, pageSize: 10, total: 0 },
			};
			mockRepository.getUserMetrics = vi.fn().mockResolvedValue(mockResult);

			mockRequest = {
				query: {},
			};

			await controller.getUsers(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(mockRepository.getUserMetrics).toHaveBeenCalledWith({
				page: 1,
				pageSize: 10,
			});
			expect(statusMock).toHaveBeenCalledWith(200);
		});

		it("accepts custom pagination params", async () => {
			const mockResult = {
				users: [],
				pagination: { page: 2, pageSize: 20, total: 0 },
			};
			mockRepository.getUserMetrics = vi.fn().mockResolvedValue(mockResult);

			mockRequest = {
				query: { page: "2", pageSize: "20" },
			};

			await controller.getUsers(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(mockRepository.getUserMetrics).toHaveBeenCalledWith({
				page: 2,
				pageSize: 20,
			});
		});

		it("rejects invalid page param", async () => {
			mockRequest = {
				query: { page: "0" },
			};

			await controller.getUsers(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});

		it("rejects invalid pageSize param", async () => {
			mockRequest = {
				query: { pageSize: "200" },
			};

			await controller.getUsers(
				mockRequest as Request,
				mockResponse as Response,
			);

			expect(statusMock).toHaveBeenCalledWith(400);
		});
	});
});
