import { ValidationError } from "../../errors/AppError";
import type { PageViewPayload } from "../payloads";
import { isObject, isString } from "./common";

export function validatePageViewPayload(payload: unknown): PageViewPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.url)) {
		throw new ValidationError(
			"PageView payload must contain a valid url string",
		);
	}

	const validated: PageViewPayload = { url: payload.url };

	if (payload.title !== undefined) {
		if (!isString(payload.title)) {
			throw new ValidationError("PageView title must be a string");
		}
		validated.title = payload.title;
	}

	if (payload.referrer !== undefined) {
		if (!isString(payload.referrer)) {
			throw new ValidationError("PageView referrer must be a string");
		}
		validated.referrer = payload.referrer;
	}

	return validated;
}
