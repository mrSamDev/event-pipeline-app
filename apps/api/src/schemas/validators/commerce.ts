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
		throw new ValidationError(
			"Purchase payload must contain a valid orderId string",
		);
	}

	if (!isNumber(payload.revenue) || payload.revenue < 0) {
		throw new ValidationError("Purchase revenue must be a non-negative number");
	}

	if (!isString(payload.currency) || payload.currency.length !== 3) {
		throw new ValidationError(
			"Purchase currency must be a valid 3-letter currency code",
		);
	}

	if (!isArray(payload.items) || payload.items.length === 0) {
		throw new ValidationError("Purchase items must be a non-empty array");
	}

	const items = payload.items.map((item, index) => {
		if (!isObject(item)) {
			throw new ValidationError(
				`Purchase item at index ${index} must be an object`,
			);
		}

		if (!isString(item.productId)) {
			throw new ValidationError(
				`Purchase item at index ${index} must have a valid productId`,
			);
		}

		if (!isString(item.name)) {
			throw new ValidationError(
				`Purchase item at index ${index} must have a valid name`,
			);
		}

		if (!isNumber(item.quantity) || item.quantity <= 0) {
			throw new ValidationError(
				`Purchase item at index ${index} must have a positive quantity`,
			);
		}

		if (!isNumber(item.price) || item.price < 0) {
			throw new ValidationError(
				`Purchase item at index ${index} must have a non-negative price`,
			);
		}

		return {
			productId: item.productId as string,
			name: item.name as string,
			quantity: item.quantity as number,
			price: item.price as number,
		};
	});

	return {
		orderId: payload.orderId,
		revenue: payload.revenue,
		currency: payload.currency,
		items,
	};
}

export function validateAddToCartPayload(payload: unknown): AddToCartPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.productId)) {
		throw new ValidationError(
			"AddToCart payload must contain a valid productId string",
		);
	}

	if (!isString(payload.name)) {
		throw new ValidationError(
			"AddToCart payload must contain a valid name string",
		);
	}

	if (!isNumber(payload.price) || payload.price < 0) {
		throw new ValidationError("AddToCart price must be a non-negative number");
	}

	if (!isNumber(payload.quantity) || payload.quantity <= 0) {
		throw new ValidationError("AddToCart quantity must be a positive number");
	}

	const validated: AddToCartPayload = {
		productId: payload.productId,
		name: payload.name,
		price: payload.price,
		quantity: payload.quantity,
	};

	if (payload.currency !== undefined) {
		if (!isString(payload.currency) || payload.currency.length !== 3) {
			throw new ValidationError(
				"AddToCart currency must be a valid 3-letter currency code",
			);
		}
		validated.currency = payload.currency;
	}

	return validated;
}

export function validateRemoveFromCartPayload(
	payload: unknown,
): RemoveFromCartPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.productId)) {
		throw new ValidationError(
			"RemoveFromCart payload must contain a valid productId string",
		);
	}

	if (!isNumber(payload.quantity) || payload.quantity <= 0) {
		throw new ValidationError(
			"RemoveFromCart quantity must be a positive number",
		);
	}

	return {
		productId: payload.productId,
		quantity: payload.quantity,
	};
}
