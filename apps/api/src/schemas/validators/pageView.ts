import { ValidationError } from "../../errors/AppError";
import type { PageViewPayload } from "../payloads";
import { isObject, isString } from "./common";

export function validatePageViewPayload(payload: unknown): PageViewPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.url)) {
		throw new ValidationError("PageView requires url string");
	}

	if (payload.title !== undefined && !isString(payload.title)) {
		throw new ValidationError("PageView title must be a string");
	}

	if (payload.referrer !== undefined && !isString(payload.referrer)) {
		throw new ValidationError("PageView referrer must be a string");
	}

	return payload as PageViewPayload;
}
