import { sessionStorage } from "../storage/sessionStorage";

export interface WorkoutPresenceEvent {
  workoutId: string;
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string | null;
  status: string;
  occurredAt: string;
  muscleGroups: string[];
}

export interface CardGeneratedEvent {
  workoutId: string;
  cardId: string;
  attackPower?: number;
  exerciseName?: string;
  bestSetWeightKg?: number | null;
  bestSetReps?: number | null;
  rarity: string;
  muscleGroup: string;
  muscleIntensities: Record<string, number>;
  isPersonalRecord: boolean;
}
export interface FriendRequestAcceptedEvent { friendshipId: string; addresseeId: string; addresseeFullName: string; addresseeUsername: string; addresseeProfilePicture?: string | null; acceptedAt: string; }
export interface FriendRemovedEvent { friendshipId: string; friendId: string; friendFullName: string; friendUsername: string; friendProfilePicture?: string | null; removedAt: string; }
export interface TemplateImportedEvent {
  id: string;
  name: string;
  muscleGroups: string[];
  exercises: { catalogExerciseId: string; catalogExerciseName: string; order: number }[];
}
export interface PostLikedEvent { postId: string; totalLikes: number; }
export interface ProfileUpdatedEvent { userId: string; fullName: string; username: string; profilePicture: string | null; }
export interface FriendRequestPendingEvent {
  friendshipId: string;
  requesterId: string;
  requesterFullName: string;
  requesterUsername: string;
  requesterProfilePicture?: string | null;
  sentAt: string;
}

type WorkoutPresenceEventType = "WORKOUT_STARTED" | "WORKOUT_MUSCLE_GROUP_ADDED" | "WORKOUT_FINISHED" | "WORKOUT_CANCELED";

export type SocialEvent =
  | { type: WorkoutPresenceEventType; data: WorkoutPresenceEvent }
  | { type: "CARD_GENERATED"; data: CardGeneratedEvent }
  | { type: "FRIEND_REQUEST_PENDING"; data: FriendRequestPendingEvent }
  | { type: "FRIEND_REQUEST_ACCEPTED"; data: FriendRequestAcceptedEvent }
  | { type: "FRIEND_REMOVED"; data: FriendRemovedEvent }
  | { type: "TEMPLATE_IMPORTED"; data: TemplateImportedEvent }
  | { type: "POST_LIKED"; data: PostLikedEvent }
  | { type: "POST_COMMENTS_CHANGED"; data: { postId: string } }
  | { type: "PROFILE_UPDATED"; data: ProfileUpdatedEvent };

type SocialEventListener = (event: SocialEvent) => void;

const listeners = new Set<SocialEventListener>();
let connectionAbortController: AbortController | null = null;
let connectionPromise: Promise<void> | null = null;
let hasConnected = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && record[key].trim().length > 0;
}

function hasOptionalNullableString(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || record[key] === null || typeof record[key] === "string";
}

function hasStringArray(record: Record<string, unknown>, key: string): boolean {
  return Array.isArray(record[key]) && record[key].every((value) => typeof value === "string");
}

function isWorkoutPresenceEvent(value: unknown): value is WorkoutPresenceEvent {
  if (!isRecord(value)) return false;
  return ["workoutId", "userId", "username", "fullName", "status", "occurredAt"].every((key) => hasString(value, key))
    && hasOptionalNullableString(value, "profilePicture")
    && hasStringArray(value, "muscleGroups");
}

function isProfileUpdatedEvent(value: unknown): value is ProfileUpdatedEvent {
  if (!isRecord(value)) return false;
  return ["userId", "fullName", "username"].every((key) => hasString(value, key))
    && (value.profilePicture === null || typeof value.profilePicture === "string");
}

function isPostLikedEvent(value: unknown): value is PostLikedEvent {
  return isRecord(value) && hasString(value, "postId") && typeof value.totalLikes === "number" && Number.isSafeInteger(value.totalLikes) && value.totalLikes >= 0;
}

function isCardGeneratedEvent(value: unknown): value is CardGeneratedEvent {
  if (!isRecord(value)) return false;
  return ["workoutId", "cardId", "rarity", "muscleGroup"].every((key) => hasString(value, key))
    && typeof value.attackPower === "number"
    && typeof value.isPersonalRecord === "boolean"
    && isRecord(value.muscleIntensities)
    && Object.values(value.muscleIntensities).every((intensity) => typeof intensity === "number");
}

function isFriendRequestPendingEvent(value: unknown): value is FriendRequestPendingEvent {
  if (!isRecord(value)) return false;
  return ["friendshipId", "requesterId", "requesterFullName", "requesterUsername", "sentAt"].every((key) => hasString(value, key))
    && hasOptionalNullableString(value, "requesterProfilePicture");
}

function isFriendRequestAcceptedEvent(value: unknown): value is FriendRequestAcceptedEvent {
  if (!isRecord(value)) return false;
  return ["friendshipId", "addresseeId", "addresseeFullName", "addresseeUsername", "acceptedAt"].every((key) => hasString(value, key))
    && hasOptionalNullableString(value, "addresseeProfilePicture");
}

function isFriendRemovedEvent(value: unknown): value is FriendRemovedEvent {
  if (!isRecord(value)) return false;
  return ["friendshipId", "friendId", "friendFullName", "friendUsername", "removedAt"].every((key) => hasString(value, key))
    && hasOptionalNullableString(value, "friendProfilePicture");
}

function isTemplateImportedEvent(value: unknown): value is TemplateImportedEvent {
  if (!isRecord(value) || !hasString(value, "id") || !hasString(value, "name") || !hasStringArray(value, "muscleGroups") || !Array.isArray(value.exercises)) return false;
  return value.exercises.every((exercise) => isRecord(exercise)
    && hasString(exercise, "catalogExerciseId")
    && hasString(exercise, "catalogExerciseName")
    && Number.isSafeInteger(exercise.order));
}

export function parseSocialEvent(type: string, data: unknown): SocialEvent | null {
  switch (type) {
    case "WORKOUT_STARTED":
    case "WORKOUT_MUSCLE_GROUP_ADDED":
    case "WORKOUT_FINISHED":
    case "WORKOUT_CANCELED":
      return isWorkoutPresenceEvent(data) ? { type, data } : null;
    case "CARD_GENERATED": return isCardGeneratedEvent(data) ? { type, data } : null;
    case "FRIEND_REQUEST_PENDING": return isFriendRequestPendingEvent(data) ? { type, data } : null;
    case "FRIEND_REQUEST_ACCEPTED": return isFriendRequestAcceptedEvent(data) ? { type, data } : null;
    case "FRIEND_REMOVED": return isFriendRemovedEvent(data) ? { type, data } : null;
    case "TEMPLATE_IMPORTED": return isTemplateImportedEvent(data) ? { type, data } : null;
    case "POST_LIKED": return isPostLikedEvent(data) ? { type, data } : null;
    case "POST_COMMENTS_CHANGED": return isRecord(data) && hasString(data, "postId") ? { type, data: { postId: data.postId as string } } : null;
    case "PROFILE_UPDATED": return isProfileUpdatedEvent(data) ? { type, data } : null;
    default: return null;
  }
}

function notifyListeners(event: SocialEvent) {
  listeners.forEach((listener) => listener(event));
}

async function openSocialEventsConnection(signal: AbortSignal) {
  const token = await sessionStorage.getToken();
  const base = import.meta.env?.VITE_API_URL?.replace(/\/$/, "") ?? "";
  const response = await fetch(`${base}/api/social/feed`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
  if (!response.ok || !response.body) throw new Error("Não foi possível conectar aos eventos sociais.");
  if (hasConnected) window.dispatchEvent(new Event("beefit:social-connected"));
  hasConnected = true;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!signal.aborted) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
      const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
      if (!data) continue;
      try {
        const parsed = parseSocialEvent(event, JSON.parse(data) as unknown);
        if (parsed) notifyListeners(parsed);
      } catch {
        // Eventos inválidos não atravessam a fronteira de rede.
      }
    }
  }
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

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

export function closeSocialEventsConnection() {
  hasConnected = false;
  listeners.clear();
  connectionAbortController?.abort();
  connectionAbortController = null;
}

export async function subscribeSocialEvents(onEvent: SocialEventListener, signal: AbortSignal) {
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
