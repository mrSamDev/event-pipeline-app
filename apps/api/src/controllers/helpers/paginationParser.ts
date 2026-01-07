import { ValidationError } from "../../errors/AppError";

export interface PaginationParams {
	page: number;
	pageSize: number;
}

export function parsePaginationParams(query: {
	page?: unknown;
	pageSize?: unknown;
}): PaginationParams {
	let page = 1;
	let pageSize = 10;

	if (query.page !== undefined) {
		if (typeof query.page !== "string" && typeof query.page !== "number") {
			throw new ValidationError("Invalid page parameter type");
		}
		page =
			typeof query.page === "number" ? query.page : parseInt(query.page, 10);
		if (Number.isNaN(page) || page < 1) {
			throw new ValidationError(
				"Invalid page parameter. Must be a positive integer",
			);
		}
	}

	if (query.pageSize !== undefined) {
		if (
			typeof query.pageSize !== "string" &&
			typeof query.pageSize !== "number"
		) {
			throw new ValidationError("Invalid pageSize parameter type");
		}
		pageSize =
			typeof query.pageSize === "number"
				? query.pageSize
				: parseInt(query.pageSize, 10);
		if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
			throw new ValidationError(
				"Invalid pageSize parameter. Must be between 1 and 100",
			);
		}
	}

	return { page, pageSize };
}
