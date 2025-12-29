import { ValidationError } from "../../errors/AppError";
import type { VideoPausePayload, VideoPlayPayload } from "../payloads";
import { isNumber, isObject, isString } from "./common";

export function validateVideoPlayPayload(payload: unknown): VideoPlayPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.videoId)) {
		throw new ValidationError(
			"VideoPlay payload must contain a valid videoId string",
		);
	}

	const validated: VideoPlayPayload = { videoId: payload.videoId };

	if (payload.videoTitle !== undefined) {
		if (!isString(payload.videoTitle)) {
			throw new ValidationError("VideoPlay videoTitle must be a string");
		}
		validated.videoTitle = payload.videoTitle;
	}

	if (payload.duration !== undefined) {
		if (!isNumber(payload.duration) || payload.duration < 0) {
			throw new ValidationError(
				"VideoPlay duration must be a non-negative number",
			);
		}
		validated.duration = payload.duration;
	}

	if (payload.currentTime !== undefined) {
		if (!isNumber(payload.currentTime) || payload.currentTime < 0) {
			throw new ValidationError(
				"VideoPlay currentTime must be a non-negative number",
			);
		}
		validated.currentTime = payload.currentTime;
	}

	return validated;
}

export function validateVideoPausePayload(payload: unknown): VideoPausePayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.videoId)) {
		throw new ValidationError(
			"VideoPause payload must contain a valid videoId string",
		);
	}

	if (!isNumber(payload.currentTime) || payload.currentTime < 0) {
		throw new ValidationError(
			"VideoPause currentTime must be a non-negative number",
		);
	}

	const validated: VideoPausePayload = {
		videoId: payload.videoId,
		currentTime: payload.currentTime,
	};

	if (payload.percentWatched !== undefined) {
		if (
			!isNumber(payload.percentWatched) ||
			payload.percentWatched < 0 ||
			payload.percentWatched > 100
		) {
			throw new ValidationError(
				"VideoPause percentWatched must be a number between 0 and 100",
			);
		}
		validated.percentWatched = payload.percentWatched;
	}

	return validated;
}
