import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession, signOut } from "./api";

export function useSession() {
	return useQuery({
		queryKey: ["session"],
		queryFn: getSession,
		retry: false,
	});
}

export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: signOut,
		onSuccess: () => {
			queryClient.setQueryData(["session"], null);
			queryClient.invalidateQueries({ queryKey: ["session"] });
		},
	});
}
