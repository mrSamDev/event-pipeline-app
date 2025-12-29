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
		throw new ValidationError(
			"Search payload must contain a valid query string",
		);
	}

	const validated: SearchPayload = { query: payload.query };

	if (payload.resultsCount !== undefined) {
		if (!isNumber(payload.resultsCount) || payload.resultsCount < 0) {
			throw new ValidationError(
				"Search resultsCount must be a non-negative number",
			);
		}
		validated.resultsCount = payload.resultsCount;
	}

	if (payload.filters !== undefined) {
		if (!isObject(payload.filters)) {
			throw new ValidationError("Search filters must be an object");
		}
		validated.filters = payload.filters as Record<
			string,
			string | number | boolean
		>;
	}

	return validated;
}

export function validateButtonClickPayload(
	payload: unknown,
): ButtonClickPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	const validated: ButtonClickPayload = {};

	if (payload.buttonId !== undefined) {
		if (!isString(payload.buttonId)) {
			throw new ValidationError("ButtonClick buttonId must be a string");
		}
		validated.buttonId = payload.buttonId;
	}

	if (payload.buttonText !== undefined) {
		if (!isString(payload.buttonText)) {
			throw new ValidationError("ButtonClick buttonText must be a string");
		}
		validated.buttonText = payload.buttonText;
	}

	if (payload.elementClass !== undefined) {
		if (!isString(payload.elementClass)) {
			throw new ValidationError("ButtonClick elementClass must be a string");
		}
		validated.elementClass = payload.elementClass;
	}

	if (payload.targetUrl !== undefined) {
		if (!isString(payload.targetUrl)) {
			throw new ValidationError("ButtonClick targetUrl must be a string");
		}
		validated.targetUrl = payload.targetUrl;
	}

	return validated;
}

export function validateFormSubmitPayload(payload: unknown): FormSubmitPayload {
	if (!isObject(payload)) {
		throw new ValidationError("Payload must be an object");
	}

	if (!isString(payload.formId)) {
		throw new ValidationError(
			"FormSubmit payload must contain a valid formId string",
		);
	}

	const validated: FormSubmitPayload = { formId: payload.formId };

	if (payload.formName !== undefined) {
		if (!isString(payload.formName)) {
			throw new ValidationError("FormSubmit formName must be a string");
		}
		validated.formName = payload.formName;
	}

	if (payload.fields !== undefined) {
		if (!isObject(payload.fields)) {
			throw new ValidationError("FormSubmit fields must be an object");
		}
		validated.fields = payload.fields;
	}

	return validated;
}
