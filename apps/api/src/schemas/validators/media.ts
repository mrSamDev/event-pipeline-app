import { ValidationError } from "../../errors/AppError";
import type { VideoPausePayload, VideoPlayPayload } from "../payloads";
import { isNumber, isObject, isString } from "./common";

export function validateVideoPlayPayload(payload: unknown): VideoPlayPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.videoId)) {
		throw new ValidationError("VideoPlay requires videoId string");
	}

	if (payload.videoTitle !== undefined && !isString(payload.videoTitle)) {
		throw new ValidationError("VideoPlay videoTitle must be a string");
	}

	if (payload.duration !== undefined && (!isNumber(payload.duration) || payload.duration < 0)) {
		throw new ValidationError("VideoPlay duration must be non-negative");
	}

	if (payload.currentTime !== undefined && (!isNumber(payload.currentTime) || payload.currentTime < 0)) {
		throw new ValidationError("VideoPlay currentTime must be non-negative");
	}

	return payload as VideoPlayPayload;
}

export function validateVideoPausePayload(payload: unknown): VideoPausePayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.videoId)) {
		throw new ValidationError("VideoPause requires videoId string");
	}

	if (!isNumber(payload.currentTime) || payload.currentTime < 0) {
		throw new ValidationError("VideoPause currentTime must be non-negative");
	}

	if (payload.percentWatched !== undefined && (!isNumber(payload.percentWatched) || payload.percentWatched < 0 || payload.percentWatched > 100)) {
		throw new ValidationError("VideoPause percentWatched must be between 0 and 100");
	}

	return payload as VideoPausePayload;
}
