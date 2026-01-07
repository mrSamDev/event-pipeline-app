import { ValidationError } from "../../errors/AppError";
import type { SessionStartPayload } from "../payloads";
import { isObject, isString } from "./common";

export function validateSessionStartPayload(
	payload: unknown,
): SessionStartPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	const validated: SessionStartPayload = {};

	if (payload.deviceType !== undefined) {
		if (!isString(payload.deviceType)) {
			throw new ValidationError("SessionStart deviceType must be a string");
		}
		validated.deviceType = payload.deviceType;
	}

	if (payload.browser !== undefined) {
		if (!isString(payload.browser)) {
			throw new ValidationError("SessionStart browser must be a string");
		}
		validated.browser = payload.browser;
	}

	if (payload.os !== undefined) {
		if (!isString(payload.os)) {
			throw new ValidationError("SessionStart os must be a string");
		}
		validated.os = payload.os;
	}

	if (payload.screenResolution !== undefined) {
		if (!isString(payload.screenResolution)) {
			throw new ValidationError(
				"SessionStart screenResolution must be a string",
			);
		}
		validated.screenResolution = payload.screenResolution;
	}

	if (payload.timezone !== undefined) {
		if (!isString(payload.timezone)) {
			throw new ValidationError("SessionStart timezone must be a string");
		}
		validated.timezone = payload.timezone;
	}

	if (payload.language !== undefined) {
		if (!isString(payload.language)) {
			throw new ValidationError("SessionStart language must be a string");
		}
		validated.language = payload.language;
	}

	return validated;
}
