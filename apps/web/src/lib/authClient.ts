import { createAuthClient } from "better-auth/react";

const API_BASE = import.meta.env.VITE_API_URL || "https://api-veritas.mrsamdev.xyz";
console.log("API_BASE: ", API_BASE);

export const authClient = createAuthClient({
  baseURL: API_BASE,
  fetchOptions: {
    credentials: "include",
  },
});
