import { useQuery } from "@tanstack/react-query";
import type { FetchUsersParams } from "./api";
import { fetchUsers } from "./api";

export function useUsers(params?: FetchUsersParams) {
	return useQuery({
		queryKey: ["users", params],
		queryFn: () => fetchUsers(params),
	});
}
