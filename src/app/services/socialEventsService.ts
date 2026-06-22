import { sessionStorage } from "../storage/sessionStorage";

export interface WorkoutPresenceEvent { workoutId: string; userId: string; username: string; fullName: string; status: string; occurredAt: string; muscleGroups: string[] }

export async function subscribeSocialEvents(onEvent: (type: string, data: WorkoutPresenceEvent | Record<string, unknown>) => void, signal: AbortSignal) {
  const token = await sessionStorage.getToken();
  const base = import.meta.env?.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const response = await fetch(`${base}/api/social/feed`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
  if (!response.ok || !response.body) throw new Error("Não foi possível conectar aos eventos sociais.");
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let event = "message";
  while (!signal.aborted) {
    const chunk = await reader.read(); if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
      const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
      event = eventLine?.slice(6).trim() ?? "message";
      if (!dataLine) continue;
      try { onEvent(event, JSON.parse(dataLine.slice(5).trim())); } catch { /* ignore malformed event */ }
    }
  }
}
