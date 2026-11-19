import { assertSessionActive, getSessionSignal, watchExternalSessionChange } from "../storage/sessionStorage";
import { openAuthenticatedEventStream } from "./apiClient";

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
export interface FriendRequestPendingEvent {
  friendshipId: string;
  requesterId: string;
  requesterFullName: string;
  requesterUsername: string;
  requesterProfilePicture?: string | null;
  sentAt: string;
}
export interface ProfileUpdatedEvent {
  userId: string;
  fullName: string;
  username: string;
  profilePicture: string | null;
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
  | { type: "SOCIAL_VISIBILITY_CHANGED"; data: Record<string, never> }
  | { type: "PROFILE_UPDATED"; data: ProfileUpdatedEvent };

type SocialEventListener = (event: SocialEvent) => void;

const listeners = new Set<{ onEvent: SocialEventListener; close: () => void }>();
let connection: AbortController | null = null;
let connectedSession: AbortSignal | null = null;

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
    case "SOCIAL_VISIBILITY_CHANGED": return isRecord(data) && Object.keys(data).length === 0 ? { type, data: {} } : null;
    case "PROFILE_UPDATED": return isProfileUpdatedEvent(data) ? { type, data } : null;
    default: return null;
  }
}

async function readEvents(reader: ReadableStreamDefaultReader<Uint8Array>, session: AbortSignal, signal: AbortSignal) {
  const decoder = new TextDecoder();
  let buffer = "";
  while (!signal.aborted) {
    const chunk = await reader.read();
    if (chunk.done || signal.aborted) break;
    assertSessionActive(session);
    buffer += decoder.decode(chunk.value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
      const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
      if (!data) continue;
      assertSessionActive(session);
      let parsed: SocialEvent | null;
      try {
        parsed = parseSocialEvent(event, JSON.parse(data) as unknown);
      } catch {
        continue;
      }
      if (!parsed) continue;
      for (const { onEvent } of listeners) {
        if (signal.aborted) return;
        assertSessionActive(session);
        try {
          onEvent(parsed);
        } catch {
          // Um assinante não interrompe o stream compartilhado.
        }
      }
    }
  }
}

async function openSocialEventsConnection(session: AbortSignal, signal: AbortSignal) {
  const response = await openAuthenticatedEventStream("/api/social/feed", session, signal);
  if (!response) return false;
  if (!response.body) throw new Error("Não foi possível conectar aos eventos sociais.");
  if (signal.aborted) {
    void response.body.cancel().catch(() => undefined);
    return false;
  }
  const reader = response.body.getReader();
  const cancelRead = () => void reader.cancel().catch(() => undefined);
  signal.addEventListener("abort", cancelRead, { once: true });
  try {
    assertSessionActive(session);
    const reconnecting = connectedSession === session;
    connectedSession = session;
    if (reconnecting) window.dispatchEvent(new Event("beefit:social-connected"));
    await readEvents(reader, session, signal);
    return true;
  } finally {
    signal.removeEventListener("abort", cancelRead);
    reader.releaseLock();
  }
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30_000;

function getReconnectDelay(attempt: number) {
  const backoff = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
  return backoff / 2 + Math.random() * (backoff / 2);
}

function waitToReconnect(attempt: number, signal: AbortSignal) {
  if (signal.aborted) return;
  return new Promise<void>((resolve) => {
    const done = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = window.setTimeout(done, getReconnectDelay(attempt));
    signal.addEventListener("abort", done, { once: true });
  });
}

async function reconnect(session: AbortSignal, signal: AbortSignal) {
  let attempt = 0;
  while (!signal.aborted) {
    try {
      if (!await openSocialEventsConnection(session, signal)) {
        if (!signal.aborted) closeSocialEventsConnection();
        return;
      }
      attempt = 0;
    } catch {
      attempt += 1;
    }
    await waitToReconnect(attempt, signal);
  }
}

function ensureConnection() {
  if (connection) return;
  const session = getSessionSignal();
  if (!session) {
    closeSocialEventsConnection();
    return;
  }
  const controller = new AbortController();
  connection = controller;
  session.addEventListener("abort", closeSocialEventsConnection, { once: true });
  const unwatch = watchExternalSessionChange();
  controller.signal.addEventListener("abort", () => {
    unwatch();
    session.removeEventListener("abort", closeSocialEventsConnection);
  }, { once: true });
  void reconnect(session, controller.signal);
}

function stopConnection() {
  const previous = connection;
  connection = null;
  previous?.abort();
}

export function closeSocialEventsConnection() {
  connectedSession = null;
  stopConnection();
  listeners.forEach((listener) => listener.close());
}

export async function subscribeSocialEvents(onEvent: SocialEventListener, signal: AbortSignal) {
  if (signal.aborted) return;
  return new Promise<void>((resolve) => {
    const listener = { onEvent, close: () => {
      listeners.delete(listener);
      signal.removeEventListener("abort", listener.close);
      if (listeners.size === 0) stopConnection();
      resolve();
    } };
    listeners.add(listener);
    signal.addEventListener("abort", listener.close, { once: true });
    ensureConnection();
  });
}
