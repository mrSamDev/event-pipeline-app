import { authClient } from "@/lib/authClient";
import type { SignUpData, SignInData, Session } from "./schemas";

export async function signUp(data: SignUpData) {
  return authClient.$fetch("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function signIn(data: SignInData) {
  return authClient.$fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function signOut() {
  return authClient.$fetch("/api/auth/sign-out", {
    method: "POST",
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const { data } = await authClient.getSession();
    return data as unknown as Session;
  } catch {
    return null;
  }
}
