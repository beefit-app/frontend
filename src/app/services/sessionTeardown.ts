import { resetActiveWorkoutMemory } from "../components/WorkoutStartScreen";
import { resetFeedCache } from "../components/social-feed/hooks/useSocialFeedState";
import { clearPersistedStreak } from "../hooks/useStreakState";
import { appStorage } from "../storage/appStorage";
import { pageCacheStorage } from "../storage/pageCacheStorage";
import { socialFeedStorage } from "../storage/socialFeedStorage";
import { workoutDraftStorage } from "../storage/workoutDraftStorage";
import { clearMediaCache } from "./mediaCache";
import { closeSocialEventsConnection } from "./socialEventsService";
import { workoutService } from "./workoutService";

const LEGACY_PROFILE_STORAGE_KEY = "beefit.profile.current";

/** Limpa estado efêmero; rascunhos por usuário só saem na exclusão da conta. */
export async function clearLocalUserData(
  userId: string | null | undefined,
  options: { isAccountDeletion?: boolean; memoryOnly?: boolean } = {},
) {
  const steps: Array<[string, () => unknown | Promise<unknown>]> = [
    ["stream de eventos", () => closeSocialEventsConnection()],
    ["caches de treino", () => workoutService.resetCaches()],
    ["fotos em memória", () => clearMediaCache()],
    ["cache de feed em memória", () => resetFeedCache()],
    ["memória de treino ativo", () => resetActiveWorkoutMemory()],
  ];
  if (!options.memoryOnly) {
    steps.push(
      ["amigos ao vivo", () => socialFeedStorage.clearLiveFriends()],
      ["ofensiva", () => clearPersistedStreak()],
      ["perfil legado", () => appStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY)],
      ["cache de páginas", () => pageCacheStorage.clearUser(userId)],
    );
    if (options.isAccountDeletion) steps.push(["rascunhos e fotos", () => workoutDraftStorage.clearAllDrafts(userId)]);
  }

  const failures = (await Promise.all(steps.map(async ([label, run]) => {
    try {
      await run();
      return null;
    } catch {
      return label;
    }
  }))).filter((label) => label !== null);
  return failures;
}
