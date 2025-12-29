import type { Request, Response } from "express";
import { getAuth } from "../auth";
import { getErrorMessage, isError } from "../errors/AppError";
import { logger } from "../observability/logger";
import { convertToWebRequest } from "./helpers/requestConverter";

export class AuthController {
	async handleAuth(req: Request, res: Response): Promise<void> {
		try {
			const auth = getAuth();
			const webRequest = convertToWebRequest(req);

			logger.debug("[Auth] Request details", {
				method: req.method,
				path: req.url,
				origin: req.headers.origin,
			});

			const response = await auth.handler(webRequest);

			res.status(response.status);

			response.headers.forEach((value, key) => {
				res.setHeader(key, value);
				if (key.toLowerCase() === "set-cookie") {
					logger.debug("[Auth] Setting cookie", {
						cookieValue: value.substring(0, 50),
					});
				}
			});

			const body = await response.text();

			if (req.url.includes("session") || req.url.includes("sign-in")) {
				logger.debug("[Auth] Response body preview", {
					bodyPreview: body.substring(0, 200),
				});
			}

			res.send(body);
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const errorDetails = isError(error) ? { stack: error.stack } : {};

			logger.error("[Auth] Error handling auth request", {
				error: errorMessage,
				method: req.method,
				url: req.url,
				...errorDetails,
			});

			res.status(500).json({
				error: "Internal Server Error",
				message: "An error occurred during authentication",
			});
		}
	}

	async getSession(req: Request, res: Response): Promise<void> {
		try {
			const auth = getAuth();

			logger.debug("[Auth] getSession - Request headers", {
				hasCookie: !!req.headers.cookie,
				hasAuthorization: !!req.headers.authorization,
				origin: req.headers.origin,
			});

			const headersObj: Record<string, string> = {};
			for (const [key, value] of Object.entries(req.headers)) {
				if (value !== undefined) {
					headersObj[key] = Array.isArray(value) ? value.join(", ") : value;
				}
			}

			const session = await auth.api.getSession({
				headers: headersObj,
			});

			logger.debug("[Auth] getSession - Session result", {
				hasSession: !!session,
				userId: session?.user?.id,
				sessionId: session?.session?.id,
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
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const errorDetails = isError(error) ? { stack: error.stack } : {};

			logger.error("[Auth] Error getting session", {
				error: errorMessage,
				...errorDetails,
			});

			res.status(500).json({
				error: "Internal Server Error",
				message: "An error occurred while retrieving session",
			});
		}
	}

	async listUsers(_req: Request, res: Response): Promise<void> {
		try {
			res.status(501).json({
				error: "Not Implemented",
				message:
					"User listing requires direct database access. Implement using MongoDB query if needed.",
			});
		} catch (error: unknown) {
			const errorMessage = getErrorMessage(error);
			const errorDetails = isError(error) ? { stack: error.stack } : {};

			logger.error("[Auth] Error listing users", {
				error: errorMessage,
				...errorDetails,
			});

			res.status(500).json({
				error: "Internal Server Error",
				message: "An error occurred while listing users",
			});
		}
	}
}
