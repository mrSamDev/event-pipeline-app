import { ValidationError } from "../../errors/AppError";
import type {
	AddToCartPayload,
	PurchasePayload,
	RemoveFromCartPayload,
} from "../payloads";
import { isArray, isNumber, isObject, isString } from "./common";

export function validatePurchasePayload(payload: unknown): PurchasePayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.orderId)) {
		throw new ValidationError("Purchase requires orderId string");
	}

	if (!isNumber(payload.revenue) || payload.revenue < 0) {
		throw new ValidationError("Purchase revenue must be a non-negative number");
	}

	if (!isString(payload.currency) || payload.currency.length !== 3) {
		throw new ValidationError("Purchase currency must be a 3-letter code");
	}

	if (!isArray(payload.items) || payload.items.length === 0) {
		throw new ValidationError("Purchase items must be a non-empty array");
	}

	payload.items.forEach((item, index) => {
		if (!isObject(item)) {
			throw new ValidationError(`Purchase item at index ${index} must be an object`);
		}

		if (!isString(item.productId)) {
			throw new ValidationError(`Purchase item at index ${index} requires productId`);
		}

		if (!isString(item.name)) {
			throw new ValidationError(`Purchase item at index ${index} requires name`);
		}

		if (!isNumber(item.quantity) || item.quantity <= 0) {
			throw new ValidationError(`Purchase item at index ${index} quantity must be positive`);
		}

		if (!isNumber(item.price) || item.price < 0) {
			throw new ValidationError(`Purchase item at index ${index} price must be non-negative`);
		}
	});

	return payload as PurchasePayload;
}

export function validateAddToCartPayload(payload: unknown): AddToCartPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.productId)) {
		throw new ValidationError("AddToCart requires productId string");
	}

	if (!isString(payload.name)) {
		throw new ValidationError("AddToCart requires name string");
	}

	if (!isNumber(payload.price) || payload.price < 0) {
		throw new ValidationError("AddToCart price must be non-negative");
	}

	if (!isNumber(payload.quantity) || payload.quantity <= 0) {
		throw new ValidationError("AddToCart quantity must be positive");
	}

	if (payload.currency !== undefined && (!isString(payload.currency) || payload.currency.length !== 3)) {
		throw new ValidationError("AddToCart currency must be a 3-letter code");
	}

	return payload as AddToCartPayload;
}

export function validateRemoveFromCartPayload(
	payload: unknown,
): RemoveFromCartPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.productId)) {
		throw new ValidationError("RemoveFromCart requires productId string");
	}

	if (!isNumber(payload.quantity) || payload.quantity <= 0) {
		throw new ValidationError("RemoveFromCart quantity must be positive");
	}

	return payload as RemoveFromCartPayload;
}
