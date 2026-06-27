import { sessionStorage } from "../storage/sessionStorage";

export interface WorkoutPresenceEvent { workoutId: string; userId: string; username: string; fullName: string; status: string; occurredAt: string; muscleGroups: string[] }
export interface FriendRequestPendingEvent {
  friendshipId: string;
  requesterId: string;
  requesterFullName: string;
  requesterUsername: string;
  requesterProfilePicture?: string | null;
  sentAt: string;
}
export interface FriendRequestAcceptedEvent {
  friendshipId: string;
  addresseeId: string;
  addresseeFullName: string;
  addresseeUsername: string;
  addresseeProfilePicture?: string | null;
  acceptedAt: string;
}
export interface FriendRemovedEvent {
  friendshipId: string;
  friendId: string;
  friendFullName: string;
  friendUsername: string;
  friendProfilePicture?: string | null;
  removedAt: string;
}

type SocialEventPayload =
  | WorkoutPresenceEvent
  | FriendRequestPendingEvent
  | FriendRequestAcceptedEvent
  | FriendRemovedEvent
  | Record<string, unknown>;

type SocialEventListener = (type: string, data: SocialEventPayload) => void;

const listeners = new Set<SocialEventListener>();
let connectionAbortController: AbortController | null = null;
let connectionPromise: Promise<void> | null = null;

function notifyListeners(type: string, data: SocialEventPayload) {
  listeners.forEach((listener) => listener(type, data));
}

async function openSocialEventsConnection(signal: AbortSignal) {
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
      try { notifyListeners(event, JSON.parse(dataLine.slice(5).trim()) as SocialEventPayload); } catch { /* ignore malformed event */ }
    }
  }
}

function ensureConnection() {
  if (connectionPromise || listeners.size === 0) return;

  connectionAbortController = new AbortController();
  connectionPromise = (async () => {
    while (!connectionAbortController?.signal.aborted && listeners.size > 0) {
      try {
        await openSocialEventsConnection(connectionAbortController.signal);
      } catch {
        if (connectionAbortController?.signal.aborted || listeners.size === 0) break;
      }

      if (connectionAbortController?.signal.aborted || listeners.size === 0) break;
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
    }
  })().finally(() => {
    connectionPromise = null;
    if (listeners.size > 0) ensureConnection();
  });
}

export async function subscribeSocialEvents(
  onEvent: SocialEventListener,
  signal: AbortSignal,
) {
  listeners.add(onEvent);
  ensureConnection();

  return new Promise<void>((resolve) => {
    const cleanup = () => {
      listeners.delete(onEvent);
      if (listeners.size === 0) {
        connectionAbortController?.abort();
        connectionAbortController = null;
      }
      resolve();
    };

    if (signal.aborted) {
      cleanup();
      return;
    }

    signal.addEventListener("abort", cleanup, { once: true });
  });
}
