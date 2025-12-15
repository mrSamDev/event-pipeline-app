import { Request, Response } from 'express';
import { EventIngestionService } from '../services/eventIngestion.service';
import { EventRepository, NormalizedEvent } from '../repositories/event.repository';
import { RawEvent, validateRawEvent, validateDate, validateLimit } from '../validators/event.validator';
import { normalizeEvent } from '../utils/eventNormalizer';

export class EventsController {
  constructor(
    private ingestionService: EventIngestionService,
    private repository: EventRepository
  ) {}

  async ingestEvent(req: Request, res: Response): Promise<void> {
    try {
      if (!this.ingestionService.canAcceptEvent()) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Event buffer at capacity, try again shortly',
          retryAfter: 1,
        });
        return;
      }

      const rawEvents: RawEvent[] = Array.isArray(req.body) ? req.body : [req.body];
      const normalizedEvents: NormalizedEvent[] = [];

      for (const rawEvent of rawEvents) {
        const validationError = validateRawEvent(rawEvent);
        if (validationError) {
          res.status(400).json(validationError);
          return;
        }

        const normalized = normalizeEvent(rawEvent);

        if (isNaN(normalized.occurredAt.getTime())) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid occurredAt timestamp format',
          });
          return;
        }

        normalizedEvents.push(normalized);
      }

      const addPromises = normalizedEvents.map((event) =>
        this.ingestionService.addEvent(event)
      );

      await Promise.all(addPromises);

      res.status(202).json({
        message: 'Events accepted for processing',
        count: normalizedEvents.length,
        eventIds: normalizedEvents.map((e) => e.eventId),
      });

    } catch (error: any) {
      console.error('[EventsController] ingestEvent error:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while processing events',
      });
    }
  }

  async getUserJourney(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { from, to, limit } = req.query;

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid userId parameter',
        });
        return;
      }

      const options: {
        from?: Date;
        to?: Date;
        limit?: number;
      } = {};

      if (from) {
        const fromDate = validateDate(from as string);
        if (!fromDate) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid "from" date format. Use ISO 8601 format (e.g., 2025-01-01T00:00:00Z)',
          });
          return;
        }
        options.from = fromDate;
      }

      if (to) {
        const toDate = validateDate(to as string);
        if (!toDate) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid "to" date format. Use ISO 8601 format (e.g., 2025-01-31T23:59:59Z)',
          });
          return;
        }
        options.to = toDate;
      }

      if (limit) {
        const limitNum = validateLimit(limit as string);
        if (limitNum === null) {
          res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid "limit" parameter. Must be a number between 1 and 1000',
          });
          return;
        }
        options.limit = limitNum;
      }

      const events = await this.repository.getUserJourney(userId, options);

      res.status(200).json({
        userId,
        count: events.length,
        events,
      });

    } catch (error: any) {
      console.error('[EventsController] getUserJourney error:', error);

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching user journey',
      });
    }
  }

  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.repository.getAnalyticsStats();
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('[EventsController] getStats error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching statistics',
      });
    }
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = req.query;

      const pageNum = page ? parseInt(page as string, 10) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize as string, 10) : 10;

      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid page parameter. Must be a positive integer',
        });
        return;
      }

      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid pageSize parameter. Must be between 1 and 100',
        });
        return;
      }

      const result = await this.repository.getUserMetrics({
        page: pageNum,
        pageSize: pageSizeNum
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('[EventsController] getUsers error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching users',
      });
    }
  }
}
