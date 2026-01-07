import { authClient } from "@/lib/authClient";
import type { Session, SignInData, SignUpData } from "./schemas";

export async function signUp(data: SignUpData) {
	return authClient.signUp.email(data);
}

export async function signIn(data: SignInData) {
	return authClient.signIn.email(data);
}

export async function signOut() {
	return authClient.signOut();
}

export async function getSession(): Promise<Session | null> {
	try {
		const { data } = await authClient.getSession();
		return data as unknown as Session;
	} catch {
		return null;
	}
}
