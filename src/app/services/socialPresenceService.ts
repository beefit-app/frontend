import { sessionStorage } from "../storage/sessionStorage";

type SocialEventType =
  | "WORKOUT_STARTED"
  | "WORKOUT_MUSCLE_GROUP_ADDED"
  | "WORKOUT_FINISHED"
  | "WORKOUT_CANCELED";

interface PresenceEventPayload {
  eventType: SocialEventType;
  workoutId: string;
  userId: string;
  username: string;
  fullName: string;
  status: string;
  occurredAt: string;
  muscleGroups: string[];
}

function getApiBaseUrl() {
  return import.meta.env?.VITE_API_URL?.replace(/\/$/, "") ?? "";
}

function buildSocialFeedUrl() {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/social/feed`;
}

function extractEventType(line: string) {
  if (!line.startsWith("event:")) return null;
  return line.slice(6).trim() as SocialEventType;
}

function extractData(line: string) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}

export const socialPresenceService = {
  async subscribe(onEvent: (payload: PresenceEventPayload) => void, signal: AbortSignal) {
    const token = await sessionStorage.getToken();

    if (!token) {
      return;
    }

    const response = await fetch(buildSocialFeedUrl(), {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error("Não foi possível conectar ao status ao vivo.");
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let currentEventType: SocialEventType | null = null;

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const lines = chunk
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        let payloadText: string | null = null;

        for (const line of lines) {
          currentEventType = extractEventType(line) ?? currentEventType;
          payloadText = extractData(line) ?? payloadText;
        }

        if (!currentEventType || !payloadText) continue;

        const payload = JSON.parse(payloadText) as PresenceEventPayload;
        onEvent({ ...payload, eventType: currentEventType });
        currentEventType = null;
      }
    }
  },
};
