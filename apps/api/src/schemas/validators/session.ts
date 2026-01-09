import { ValidationError } from "../../errors/AppError";
import type { SessionStartPayload } from "../payloads";
import { isObject, isString } from "./common";

export function validateSessionStartPayload(
	payload: unknown,
): SessionStartPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (payload.deviceType !== undefined && !isString(payload.deviceType)) {
		throw new ValidationError("SessionStart deviceType must be a string");
	}

	if (payload.browser !== undefined && !isString(payload.browser)) {
		throw new ValidationError("SessionStart browser must be a string");
	}

	if (payload.os !== undefined && !isString(payload.os)) {
		throw new ValidationError("SessionStart os must be a string");
	}

	if (payload.screenResolution !== undefined && !isString(payload.screenResolution)) {
		throw new ValidationError("SessionStart screenResolution must be a string");
	}

	if (payload.timezone !== undefined && !isString(payload.timezone)) {
		throw new ValidationError("SessionStart timezone must be a string");
	}

	if (payload.language !== undefined && !isString(payload.language)) {
		throw new ValidationError("SessionStart language must be a string");
	}

	return payload as SessionStartPayload;
}
