import type { AppPaginatedUsers } from "./schemas";
import { apiPaginatedUsersSchema } from "./schemas";
import { paginatedUsersTransformer } from "./transformers";

const API_BASE =
	import.meta.env.VITE_API_URL || "https://api-veritas.mrsamdev.xyz";

export interface FetchUsersParams {
	page?: number;
	pageSize?: number;
}

export async function fetchUsers(
	params?: FetchUsersParams,
): Promise<AppPaginatedUsers> {
	const searchParams = new URLSearchParams();

	if (params?.page) {
		searchParams.append("page", params.page.toString());
	}

	if (params?.pageSize) {
		searchParams.append("pageSize", params.pageSize.toString());
	}

	const url = `${API_BASE}/users${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

	const response = await fetch(url, {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to fetch users");
	}

	const apiData = await response.json();
	const validated = apiPaginatedUsersSchema.parse(apiData);

	return paginatedUsersTransformer.fromAPI(validated);
}
