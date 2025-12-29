import type { Request } from "express";
import { InternalServerError } from "../../errors/AppError";

function isString(value: unknown): value is string {
	return typeof value === "string";
}

export function convertToWebRequest(req: Request): globalThis.Request {
	const forwardedProto = req.headers["x-forwarded-proto"];
	const protocol = isString(forwardedProto)
		? forwardedProto
		: req.protocol || "http";
	const host = req.headers.host;

	if (!host) {
		throw new InternalServerError("Missing host header in request");
	}

	const url = new URL(req.url, `${protocol}://${host}`);

	const headersObj: Record<string, string> = {};
	for (const [key, value] of Object.entries(req.headers)) {
		if (value !== undefined) {
			headersObj[key] = Array.isArray(value) ? value.join(", ") : value;
		}
	}

	return new globalThis.Request(url, {
		method: req.method,
		headers: headersObj,
		body:
			req.method !== "GET" && req.method !== "HEAD"
				? JSON.stringify(req.body)
				: undefined,
	});
}
