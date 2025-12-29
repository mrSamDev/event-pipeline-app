import type { AuthSession, AuthUser } from "@martech/types";
import type { NextFunction, Request, Response } from "express";
import { getAuth } from "../auth";
import {
	AuthenticationError,
	getErrorMessage,
	isError,
} from "../errors/AppError";
import { logger } from "../observability/logger";

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser | null;
			session?: AuthSession | null;
		}
	}
}

function isAuthUser(user: unknown): user is AuthUser {
	if (!user || typeof user !== "object") {
		return false;
	}

	const u = user as Record<string, unknown>;
	return typeof u.id === "string" && typeof u.email === "string";
}

function isAuthSession(session: unknown): session is AuthSession {
	if (!session || typeof session !== "object") {
		return false;
	}

	const s = session as Record<string, unknown>;
	return typeof s.id === "string" && typeof s.userId === "string";
}

interface SessionResponse {
	user: unknown;
	session: unknown;
}

function isSessionResponse(response: unknown): response is SessionResponse {
	if (!response || typeof response !== "object") {
		return false;
	}

	const r = response as Record<string, unknown>;
	return "user" in r && "session" in r;
}

export async function sessionMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const auth = getAuth();

		const headersObj: Record<string, string> = {};
		for (const [key, value] of Object.entries(req.headers)) {
			if (value !== undefined) {
				headersObj[key] = Array.isArray(value) ? value.join(", ") : value;
			}
		}

		const sessionResponse = await auth.api.getSession({ headers: headersObj });

		if (!sessionResponse) {
			req.user = null;
			req.session = null;
			return next();
		}

		if (!isSessionResponse(sessionResponse)) {
			logger.warn("[Auth] Invalid session response structure", {
				response: sessionResponse,
			});
			req.user = null;
			req.session = null;
			return next();
		}

		if (isAuthUser(sessionResponse.user)) {
			req.user = sessionResponse.user;
		} else {
			logger.warn("[Auth] Invalid user structure in session response", {
				user: sessionResponse.user,
			});
			req.user = null;
		}

		if (isAuthSession(sessionResponse.session)) {
			req.session = sessionResponse.session;
		} else {
			logger.warn("[Auth] Invalid session structure in session response", {
				session: sessionResponse.session,
			});
			req.session = null;
		}

		next();
	} catch (error: unknown) {
		const errorMessage = getErrorMessage(error);
		const errorDetails = isError(error) ? { stack: error.stack } : {};

		logger.error("[Auth] Error getting session", {
			error: errorMessage,
			...errorDetails,
		});

		req.user = null;
		req.session = null;
		next();
	}
}

export function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const user = req.user;

	if (!user) {
		const error = new AuthenticationError("Authentication required");
		res.status(error.statusCode).json({
			error: error.name,
			message: error.message,
		});
		return;
	}

	next();
}
