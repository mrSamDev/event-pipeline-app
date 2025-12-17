import type { AuthSession, AuthUser } from "@martech/types";
import type { NextFunction, Request, Response } from "express";
import { getAuth } from "../auth";

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser | null;
			session?: AuthSession | null;
		}
	}
}

export async function sessionMiddleware(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const auth = getAuth();
		const session = await auth.api.getSession({ headers: req.headers as any });

		if (!session) {
			req.user = null;
			req.session = null;
			return next();
		}

		req.user = session.user as AuthUser;
		req.session = session.session as AuthSession;
		next();
	} catch (error: any) {
		console.error("[Auth] Error getting session:", error);
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
		res.status(401).json({
			error: "Unauthorized",
			message: "Authentication required",
		});
		return;
	}

	next();
}
