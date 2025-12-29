import { EventType } from "@martech/types";
import { ValidationError } from "../errors/AppError";
import type { EventPayload } from "./payloads";
import {
	validateAddToCartPayload,
	validatePurchasePayload,
	validateRemoveFromCartPayload,
} from "./validators/commerce";
import { isString } from "./validators/common";
import {
	validateButtonClickPayload,
	validateFormSubmitPayload,
	validateSearchPayload,
} from "./validators/interaction";
import {
	validateVideoPausePayload,
	validateVideoPlayPayload,
} from "./validators/media";
import { validatePageViewPayload } from "./validators/pageView";
import { validateSessionStartPayload } from "./validators/session";

export type { EventPayload } from "./payloads";
export { isValidDate, isValidUUID } from "./validators/common";

export function isValidEventType(type: unknown): type is EventType {
	return isString(type) && Object.values(EventType).includes(type as EventType);
}

export function validateEventPayload(
	type: EventType,
	payload: unknown,
): EventPayload {
	if (payload === null || payload === undefined) {
		throw new ValidationError("Event payload is required");
	}

	switch (type) {
		case EventType.PAGE_VIEW:
			return validatePageViewPayload(payload);
		case EventType.SEARCH:
			return validateSearchPayload(payload);
		case EventType.PURCHASE:
			return validatePurchasePayload(payload);
		case EventType.ADD_TO_CART:
			return validateAddToCartPayload(payload);
		case EventType.REMOVE_FROM_CART:
			return validateRemoveFromCartPayload(payload);
		case EventType.BUTTON_CLICK:
			return validateButtonClickPayload(payload);
		case EventType.FORM_SUBMIT:
			return validateFormSubmitPayload(payload);
		case EventType.VIDEO_PLAY:
			return validateVideoPlayPayload(payload);
		case EventType.VIDEO_PAUSE:
			return validateVideoPausePayload(payload);
		case EventType.SESSION_START:
			return validateSessionStartPayload(payload);
		default:
			if (
				typeof payload !== "object" ||
				payload === null ||
				Array.isArray(payload)
			) {
				throw new ValidationError("Event payload must be an object");
			}
			return payload as Record<string, unknown>;
	}
}
