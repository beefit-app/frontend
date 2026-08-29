import { sessionStorage } from "../storage/sessionStorage";

export interface WorkoutPresenceEvent { workoutId: string; userId: string; username: string; fullName: string; profilePicture?: string | null; status: string; occurredAt: string; muscleGroups: string[] }
export interface ProfileUpdatedEvent {
  userId: string;
  fullName: string;
  username: string;
  profilePicture: string | null;
}
export interface CardGeneratedEvent {
  workoutId: string;
  cardId: string;
  attackPower: number;
  rarity: string;
  muscleGroup: string;
  muscleIntensities: Record<string, number>;
  isPersonalRecord: boolean;
}
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
export interface TemplateImportedEvent {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: {
    catalogExerciseId: string;
    catalogExerciseName: string;
    order: number;
  }[];
}
export interface PostLikedEvent {
  postId: string;
  totalLikes: number;
}

type SocialEventPayload =
  | WorkoutPresenceEvent
  | CardGeneratedEvent
  | FriendRequestPendingEvent
  | FriendRequestAcceptedEvent
  | FriendRemovedEvent
  | TemplateImportedEvent
  | PostLikedEvent
  | ProfileUpdatedEvent
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
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
  while (!signal.aborted) {
    const chunk = await reader.read(); if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
      const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
      const event = eventLine?.slice(6).trim() ?? "message";
      if (!dataLine) continue;
      try { notifyListeners(event, JSON.parse(dataLine.slice(5).trim()) as SocialEventPayload); } catch { /* ignore malformed event */ }
    }
  }
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

// Backoff exponencial com jitter. Com um intervalo fixo, um backend fora do ar
// vira uma requisicao por segundo por aparelho, indefinidamente — gasta bateria do
// usuario e ainda castiga o servidor justamente enquanto ele tenta se recuperar.
// O jitter evita que todos os clientes voltem no mesmo instante.
function getReconnectDelay(attempt: number) {
  const backoff = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
  return backoff / 2 + Math.random() * (backoff / 2);
}

function ensureConnection() {
  if (connectionPromise || listeners.size === 0) return;

  connectionAbortController = new AbortController();
  connectionPromise = (async () => {
    let attempt = 0;

    while (!connectionAbortController?.signal.aborted && listeners.size > 0) {
      try {
        await openSocialEventsConnection(connectionAbortController.signal);
        // Conectou e o stream terminou por conta propria: a proxima tentativa
        // recomeca do delay base em vez de herdar a escalada anterior.
        attempt = 0;
      } catch {
        if (connectionAbortController?.signal.aborted || listeners.size === 0) break;
        attempt += 1;
      }

      if (connectionAbortController?.signal.aborted || listeners.size === 0) break;
      await new Promise((resolve) => window.setTimeout(resolve, getReconnectDelay(attempt)));
    }
  })().finally(() => {
    connectionPromise = null;
    if (listeners.size > 0) ensureConnection();
  });
}

// Derruba o stream no logout. Sem isto o laco de reconexao continua tentando de
// segundo em segundo com um token que ja nao vale.
export function closeSocialEventsConnection() {
  listeners.clear();
  connectionAbortController?.abort();
  connectionAbortController = null;
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
