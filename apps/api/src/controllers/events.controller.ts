import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { EventIngestionService } from '../services/eventIngestion.service';
import { EventRepository, NormalizedEvent } from '../repositories/event.repository';
import { EventType } from '../models/Event';

/**
 * Raw event shape from client
 * This is what clients send - we normalize it to NormalizedEvent
 */
interface RawEvent {
  userId: string;
  sessionId: string;
  type: string;
  payload?: Record<string, any>;
  occurredAt?: string | Date;  // Client can send ISO string or Date
}

/**
 * Events Controller
 *
 * Handles HTTP request/response for event ingestion and user journey queries
 * Responsibilities:
 * - Input validation
 * - Event normalization (add eventId, receivedAt)
 * - HTTP status code handling
 * - Error responses
 */
export class EventsController {
  constructor(
    private ingestionService: EventIngestionService,
    private repository: EventRepository
  ) {}

  /**
   * POST /events
   * Ingest one or more events into the pipeline
   *
   * Accepts:
   * - Single event: { userId, sessionId, type, payload, occurredAt }
   * - Array of events: [{ ... }, { ... }]
   *
   * Returns:
   * - 202 Accepted: Event(s) buffered successfully
   * - 400 Bad Request: Invalid payload
   * - 503 Service Unavailable: Buffer overflow
   * - 500 Internal Server Error: Unexpected error
   *
   * Note: 202 response means event is buffered, NOT persisted yet
   * This sets correct expectations with clients about async processing
   */
  async ingestEvent(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      // Accept both single event and array of events
      const rawEvents: RawEvent[] = Array.isArray(body) ? body : [body];

      // Validate and normalize each event
      const normalizedEvents: NormalizedEvent[] = [];

      for (const rawEvent of rawEvents) {
        // Validate required fields
        if (!rawEvent.userId || typeof rawEvent.userId !== 'string') {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Missing or invalid required field: userId',
          });
          return;
        }

        if (!rawEvent.sessionId || typeof rawEvent.sessionId !== 'string') {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Missing or invalid required field: sessionId',
          });
          return;
        }

        if (!rawEvent.type || typeof rawEvent.type !== 'string') {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Missing or invalid required field: type',
          });
          return;
        }

        // Validate event type is in enum
        if (!Object.values(EventType).includes(rawEvent.type as EventType)) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Invalid event type: ${rawEvent.type}. Must be one of: ${Object.values(EventType).join(', ')}`,
          });
          return;
        }

        // Normalize event: add server-side fields
        const normalized: NormalizedEvent = {
          eventId: randomUUID(),  // Generate UUID v4 for uniqueness
          userId: rawEvent.userId,
          sessionId: rawEvent.sessionId,
          type: rawEvent.type as EventType,
          payload: rawEvent.payload || {},
          // Parse occurredAt if provided, otherwise use current time
          occurredAt: rawEvent.occurredAt
            ? new Date(rawEvent.occurredAt)
            : new Date(),
          // Always set receivedAt to server time (authoritative)
          receivedAt: new Date(),
        };

        // Validate occurredAt is a valid date
        if (isNaN(normalized.occurredAt.getTime())) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid occurredAt timestamp format',
          });
          return;
        }

        normalizedEvents.push(normalized);
      }

      // Add all normalized events to buffer
      // Note: We don't await individual adds - they're fire-and-forget
      const addPromises = normalizedEvents.map((event) =>
        this.ingestionService.addEvent(event)
      );

      await Promise.all(addPromises);

      // Return 202 Accepted (not 200 OK)
      // 202 indicates the request has been accepted for processing, but processing is not complete
      // This is the correct HTTP semantics for async ingestion
      res.status(202).json({
        message: 'Events accepted for processing',
        count: normalizedEvents.length,
        eventIds: normalizedEvents.map((e) => e.eventId),
      });

    } catch (error: any) {
      console.error('[EventsController] ingestEvent error:', error);

      // Check if buffer overflow (emergency threshold hit)
      if (error.message?.includes('Buffer overflow') || error.message?.includes('EMERGENCY')) {
        // 503 Service Unavailable with Retry-After header
        res.status(503).json({
          error: 'Service Unavailable',
          message: 'Event ingestion temporarily unavailable due to high load',
          retryAfter: 1,  // Suggest retry after 1 second
        });
        return;
      }

      // Generic 500 for unexpected errors
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while processing events',
      });
    }
  }

  /**
   * GET /users/:userId/journey
   * Retrieve a user's event journey with optional filtering
   *
   * Query parameters:
   * - from: ISO date string (start of date range)
   * - to: ISO date string (end of date range)
   * - limit: number (max events to return, default 100)
   *
   * Returns:
   * - 200 OK: Array of events sorted by occurredAt descending (recent first)
   * - 400 Bad Request: Invalid parameters
   * - 500 Internal Server Error: Database error
   *
   * Example: GET /users/user123/journey?from=2025-01-01T00:00:00Z&to=2025-01-31T23:59:59Z&limit=50
   */
  async getUserJourney(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { from, to, limit } = req.query;

      // Validate userId
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid userId parameter',
        });
        return;
      }

      // Parse query parameters
      const options: {
        from?: Date;
        to?: Date;
        limit?: number;
      } = {};

      // Parse 'from' date
      if (from) {
        const fromDate = new Date(from as string);
        if (isNaN(fromDate.getTime())) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid "from" date format. Use ISO 8601 format (e.g., 2025-01-01T00:00:00Z)',
          });
          return;
        }
        options.from = fromDate;
      }

      // Parse 'to' date
      if (to) {
        const toDate = new Date(to as string);
        if (isNaN(toDate.getTime())) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid "to" date format. Use ISO 8601 format (e.g., 2025-01-31T23:59:59Z)',
          });
          return;
        }
        options.to = toDate;
      }

      // Parse 'limit'
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid "limit" parameter. Must be a number between 1 and 1000',
          });
          return;
        }
        options.limit = limitNum;
      }

      // Fetch user journey from repository
      const events = await this.repository.getUserJourney(userId, options);

      // Return 200 OK with events
      res.status(200).json({
        userId,
        count: events.length,
        events,
      });

    } catch (error: any) {
      console.error('[EventsController] getUserJourney error:', error);

      // Return 500 for database errors
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching user journey',
      });
    }
  }

  /**
   * GET /stats
   * Get buffer statistics (useful for monitoring)
   *
   * Returns current buffer state and configuration
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.ingestionService.getStats();
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('[EventsController] getStats error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching statistics',
      });
    }
  }
}
