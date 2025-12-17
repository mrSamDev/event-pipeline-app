import { Express } from 'express';
import { EventRepository } from './repositories/event.repository';
import { EventIngestionService } from './services/eventIngestion.service';
import { EventsController } from './controllers/events.controller';
import { AuthController } from './controllers/auth.controller';
import { authMiddleware } from './middleware/auth.middleware';

export function registerRoutes(app: Express): EventIngestionService {
  const repository = new EventRepository();
  const service = new EventIngestionService(repository);
  const controller = new EventsController(service, repository);
  const authController = new AuthController();

  console.log('[Routes] Registering application routes...');

  app.all(/^\/api\/auth\/.*/, (req, res) => authController.handleAuth(req, res));
  app.get('/session', (req, res) => authController.getSession(req, res));

  // Public event ingestion endpoint - no auth required for maximum performance
  // Note: This route is registered BEFORE sessionMiddleware is applied in index.ts
  app.post('/events', (req, res) => controller.ingestEvent(req, res));

  // Protected routes requiring authentication
  app.get('/users/:userId/journey', authMiddleware, (req, res) => controller.getUserJourney(req, res));
  app.get('/users', authMiddleware, (req, res) => controller.getUsers(req, res));
  app.get('/stats', authMiddleware, (req, res) => controller.getStats(req, res));

  console.log('[Routes] Routes registered:');
  console.log('  POST /events - Ingest events (public, high-performance)');
  console.log('  GET /users/:userId/journey - Get user journey (protected)');
  console.log('  GET /users - List all users with metrics (protected)');
  console.log('  GET /stats - Get analytics statistics (protected)');
  console.log('  ALL /api/auth/* - Better Auth endpoints (sign-up, sign-in, sign-out, etc.)');
  console.log('  GET /session - Get current session');

  return service;
}
