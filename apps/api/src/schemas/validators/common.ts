export function isString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

export function isNumber(value: unknown): value is number {
	return (
		typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value)
	);
}

export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

export function isValidUUID(uuid: unknown): uuid is string {
	if (!isString(uuid)) {
		return false;
	}

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

export function isValidDate(date: unknown): date is Date {
	if (date instanceof Date) {
		return !Number.isNaN(date.getTime());
	}

	if (isString(date)) {
		const parsed = new Date(date);
		return !Number.isNaN(parsed.getTime());
	}

	return false;
}
