import { ValidationError } from "../../errors/AppError";
import type {
	ButtonClickPayload,
	FormSubmitPayload,
	SearchPayload,
} from "../payloads";
import { isNumber, isObject, isString } from "./common";

export function validateSearchPayload(payload: unknown): SearchPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.query)) {
		throw new ValidationError("Search requires query string");
	}

	if (payload.resultsCount !== undefined && (!isNumber(payload.resultsCount) || payload.resultsCount < 0)) {
		throw new ValidationError("Search resultsCount must be a non-negative number");
	}

	if (payload.filters !== undefined && !isObject(payload.filters)) {
		throw new ValidationError("Search filters must be an object");
	}

	return payload as SearchPayload;
}

export function validateButtonClickPayload(
	payload: unknown,
): ButtonClickPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (payload.buttonId !== undefined && !isString(payload.buttonId)) {
		throw new ValidationError("ButtonClick buttonId must be a string");
	}

	if (payload.buttonText !== undefined && !isString(payload.buttonText)) {
		throw new ValidationError("ButtonClick buttonText must be a string");
	}

	if (payload.elementClass !== undefined && !isString(payload.elementClass)) {
		throw new ValidationError("ButtonClick elementClass must be a string");
	}

	if (payload.targetUrl !== undefined && !isString(payload.targetUrl)) {
		throw new ValidationError("ButtonClick targetUrl must be a string");
	}

	return payload as ButtonClickPayload;
}

export function validateFormSubmitPayload(payload: unknown): FormSubmitPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.formId)) {
		throw new ValidationError("FormSubmit requires formId string");
	}

	if (payload.formName !== undefined && !isString(payload.formName)) {
		throw new ValidationError("FormSubmit formName must be a string");
	}

	if (payload.fields !== undefined && !isObject(payload.fields)) {
		throw new ValidationError("FormSubmit fields must be an object");
	}

	return payload as FormSubmitPayload;
}
