import { clearPersistedStreak } from "../hooks/useStreakState";
import { appStorage } from "../storage/appStorage";
import { socialFeedStorage } from "../storage/socialFeedStorage";
import { workoutDraftStorage } from "../storage/workoutDraftStorage";
import { closeSocialEventsConnection } from "./socialEventsService";
import { workoutService } from "./workoutService";

const LEGACY_PROFILE_STORAGE_KEY = "beefit.profile.current";

/**
 * Apaga tudo que a sessao deixou no aparelho e em memoria.
 *
 * Limpar os tokens nao basta: o app e uma SPA, entao caches de modulo sobrevivem
 * ao logout, e o armazenamento local guarda rascunho de treino, foto, ofensiva e
 * dados de terceiros (nome e treino dos amigos no feed ao vivo). Num aparelho
 * compartilhado, isso tudo seria herdado pelo proximo usuario.
 *
 * Cada passo e independente: uma falha em qualquer um deles nao pode impedir os
 * demais de rodar, senao o logout deixa lixo pela metade.
 */
export async function clearLocalUserData(userId: string | null | undefined) {
  const steps: Array<[string, () => unknown | Promise<unknown>]> = [
    ["caches de treino", () => workoutService.resetCaches()],
    ["rascunhos e fotos", () => workoutDraftStorage.clearAllDrafts(userId)],
    ["amigos ao vivo", () => socialFeedStorage.clearLiveFriends()],
    ["ofensiva", () => clearPersistedStreak()],
    ["perfil legado", () => appStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY)],
    ["stream de eventos", () => closeSocialEventsConnection()],
  ];

  for (const [, run] of steps) {
    try {
      await run();
    } catch {
      /* segue para o proximo passo */
    }
  }
}
