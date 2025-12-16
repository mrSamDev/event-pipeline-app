import { Request, Response } from "express";
import { getAuth } from "../auth";

/**
 * Auth Controller
 *
 * Handles authentication endpoints using Better Auth.
 * Better Auth provides built-in handlers for common auth operations,
 * so we just need to proxy requests to the Better Auth handler.
 */
export class AuthController {
  /**
   * Handle all Better Auth requests
   * Better Auth provides a single handler that manages all auth routes
   *
   * Routes handled by Better Auth:
   * - POST /api/auth/sign-up/email - Register with email/password
   * - POST /api/auth/sign-in/email - Login with email/password
   * - POST /api/auth/sign-out - Logout
   * - GET /api/auth/get-session - Get current session
   * - POST /api/auth/forget-password - Request password reset
   * - POST /api/auth/reset-password - Reset password with token
   * - POST /api/auth/verify-email - Verify email address
   * - And many more...
   */
  async handleAuth(req: Request, res: Response): Promise<void> {
    try {
      const auth = getAuth();

      // Better Auth handler expects a Web Request object
      // Convert Express request to Web Request
      // Use x-forwarded-proto to detect if request came through HTTPS (from nginx/ALB)
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const url = new URL(req.url, `${protocol}://${req.headers.host}`);
      const webRequest = new globalThis.Request(url, {
        method: req.method,
        headers: req.headers as any,
        body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
      });

      // Better Auth handler returns a Response object
      const response = await auth.handler(webRequest);

      // Set status code
      res.status(response.status);

      // Set headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // Send body
      const body = await response.text();
      res.send(body);
    } catch (error: any) {
      console.error("[Auth] Error handling auth request:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  /**
   * Get current user session
   * Convenience endpoint to check if user is authenticated
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const auth = getAuth();

      // Better Auth provides a session object from the request
      const session = await auth.api.getSession({
        headers: req.headers as any,
      });

      if (!session) {
        res.status(401).json({
          error: "Unauthorized",
          message: "No active session",
        });
        return;
      }

      res.status(200).json({
        session: session.session,
        user: session.user,
      });
    } catch (error: any) {
      console.error("[Auth] Error getting session:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }

  /**
   * List all users (for testing/admin purposes)
   * WARNING: This should be protected with proper authorization in production
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      // Better Auth doesn't expose a built-in listUsers API
      // You would need to query the MongoDB users collection directly
      // For now, return a message indicating this needs custom implementation
      res.status(501).json({
        error: "Not Implemented",
        message: "User listing requires direct database access. Implement using MongoDB query if needed.",
      });
    } catch (error: any) {
      console.error("[Auth] Error listing users:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }
}
