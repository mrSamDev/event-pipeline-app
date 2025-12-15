import { Express } from 'express';
import { EventRepository } from './repositories/event.repository';
import { EventIngestionService } from './services/eventIngestion.service';
import { EventsController } from './controllers/events.controller';
import { AuthController } from './controllers/auth.controller';

/**
 * Register all application routes
 *
 * This function sets up dependency injection and route registration:
 * 1. Instantiate repository (data access layer)
 * 2. Instantiate service with repository (business logic layer)
 * 3. Instantiate controller with service and repository (HTTP layer)
 * 4. Register routes with Express app
 *
 * All instances are singletons (one per process) to ensure:
 * - Single buffer for all requests
 * - Shared database connection pool
 * - Consistent state management
 *
 * @param app - Express application instance
 * @returns EventIngestionService - Exposed for graceful shutdown access
 */
export function registerRoutes(app: Express): EventIngestionService {
  // Instantiate layers (dependency injection)
  const repository = new EventRepository();
  const service = new EventIngestionService(repository);
  const controller = new EventsController(service, repository);
  const authController = new AuthController();

  console.log('[Routes] Registering application routes...');

  /**
   * @swagger
   * /events:
   *   post:
   *     tags:
   *       - Events
   *     summary: Ingest one or more events
   *     description: |
   *       Accepts single event or array of events for ingestion into the pipeline.
   *       Events are buffered in memory and flushed to MongoDB when buffer reaches 500 events or after 1000ms.
   *       Returns 202 Accepted immediately - processing is asynchronous.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             oneOf:
   *               - $ref: '#/components/schemas/Event'
   *               - type: array
   *                 items:
   *                   $ref: '#/components/schemas/Event'
   *           examples:
   *             singleEvent:
   *               summary: Single event
   *               value:
   *                 userId: "user123"
   *                 sessionId: "sess456"
   *                 type: "page_view"
   *                 payload:
   *                   url: "/products/123"
   *                   referrer: "https://google.com"
   *             batchEvents:
   *               summary: Batch of events
   *               value:
   *                 - userId: "user123"
   *                   sessionId: "sess456"
   *                   type: "page_view"
   *                   payload:
   *                     url: "/home"
   *                 - userId: "user123"
   *                   sessionId: "sess456"
   *                   type: "button_click"
   *                   payload:
   *                     button: "add_to_cart"
   *     responses:
   *       202:
   *         description: Events accepted for processing
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Events accepted for processing"
   *                 count:
   *                   type: integer
   *                   example: 2
   *                 eventIds:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: ["uuid-1", "uuid-2"]
   *       400:
   *         description: Invalid request payload
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       503:
   *         description: Buffer overflow - service unavailable
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post('/events', (req, res) => controller.ingestEvent(req, res));

  /**
   * @swagger
   * /users/{userId}/journey:
   *   get:
   *     tags:
   *       - Events
   *     summary: Get user event journey
   *     description: Retrieve a user's event timeline with optional date range filtering and pagination
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: User identifier
   *         example: "user123"
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date-time
   *         description: Start date (ISO 8601 format)
   *         example: "2025-12-01T00:00:00Z"
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date-time
   *         description: End date (ISO 8601 format)
   *         example: "2025-12-15T23:59:59Z"
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 1000
   *           default: 100
   *         description: Maximum number of events to return
   *     responses:
   *       200:
   *         description: User journey retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 userId:
   *                   type: string
   *                   example: "user123"
   *                 count:
   *                   type: integer
   *                   example: 50
   *                 events:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Event'
   *       400:
   *         description: Invalid query parameters
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get('/users/:userId/journey', (req, res) => controller.getUserJourney(req, res));

  /**
   * @swagger
   * /stats:
   *   get:
   *     tags:
   *       - Monitoring
   *     summary: Get buffer statistics
   *     description: Returns current buffer state and statistics for monitoring purposes
   *     responses:
   *       200:
   *         description: Buffer statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 bufferSize:
   *                   type: integer
   *                   description: Current number of events in buffer
   *                   example: 150
   *                 isFlushingInProgress:
   *                   type: boolean
   *                   description: Whether a flush operation is currently running
   *                   example: false
   *                 maxBufferSize:
   *                   type: integer
   *                   description: Buffer size threshold that triggers flush
   *                   example: 500
   *                 emergencyThreshold:
   *                   type: integer
   *                   description: Emergency threshold where events start getting dropped
   *                   example: 5000
   *                 bufferUtilization:
   *                   type: number
   *                   description: Buffer usage percentage
   *                   example: 30
   */
  app.get('/stats', (req, res) => controller.getStats(req, res));

  /**
   * @swagger
   * /api/auth/sign-up/email:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Register a new user
   *     description: Create a new user account with email and password
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 minLength: 8
   *                 example: "securepass123"
   *               name:
   *                 type: string
   *                 example: "John Doe"
   *     responses:
   *       200:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 session:
   *                   $ref: '#/components/schemas/Session'
   *       400:
   *         description: Invalid input or email already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *
   * @swagger
   * /api/auth/sign-in/email:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Login with email and password
   *     description: Authenticate user and create a session
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "user@example.com"
   *               password:
   *                 type: string
   *                 format: password
   *                 example: "securepass123"
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 session:
   *                   $ref: '#/components/schemas/Session'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *
   * @swagger
   * /api/auth/sign-out:
   *   post:
   *     tags:
   *       - Authentication
   *     summary: Logout
   *     description: Invalidate current session
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   *       401:
   *         description: Not authenticated
   *
   * @swagger
   * /api/auth/get-session:
   *   get:
   *     tags:
   *       - Authentication
   *     summary: Get current session
   *     description: Retrieve information about the current authenticated session
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Session retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 session:
   *                   $ref: '#/components/schemas/Session'
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Not authenticated
   */
  // Better Auth routes - use regex to match all /api/auth/* paths
  app.all(/^\/api\/auth\/.*/, (req, res) => authController.handleAuth(req, res));

  /**
   * @swagger
   * /session:
   *   get:
   *     tags:
   *       - Authentication
   *     summary: Check current session
   *     description: Convenience endpoint to verify authentication status
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Authenticated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 session:
   *                   $ref: '#/components/schemas/Session'
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Not authenticated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.get('/session', (req, res) => authController.getSession(req, res));

  /**
   * @swagger
   * /users:
   *   get:
   *     tags:
   *       - Authentication
   *     summary: List all users
   *     description: |
   *       Get a list of all registered users.
   *       **WARNING**: This endpoint should be protected with proper authorization in production.
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/User'
   */
  app.get('/users', (req, res) => authController.listUsers(req, res));

  console.log('[Routes] Routes registered:');
  console.log('  POST /events - Ingest events');
  console.log('  GET /users/:userId/journey - Get user journey');
  console.log('  GET /stats - Get buffer statistics');
  console.log('  ALL /api/auth/* - Better Auth endpoints (sign-up, sign-in, sign-out, etc.)');
  console.log('  GET /session - Get current session');
  console.log('  GET /users - List all users');

  // Return service for graceful shutdown access
  return service;
}
