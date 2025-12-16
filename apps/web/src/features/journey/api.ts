import { apiJourneyResponseSchema } from "./schemas";
import { journeyTransformer } from "./transformers";
import type { SessionGroup } from "./schemas";

const API_BASE = import.meta.env.VITE_API_URL || "https://api-veritas.mrsamdev.xyz";

export async function fetchUserJourney(userId: string): Promise<SessionGroup[]> {
  const response = await fetch(`${API_BASE}/users/${userId}/journey`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user journey");
  }

  const apiData = await response.json();
  const validated = apiJourneyResponseSchema.parse(apiData);

  const appEvents = validated.events.map(journeyTransformer.fromAPI);

  return journeyTransformer.groupBySession(appEvents);
}
