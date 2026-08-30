import type { AuthUser } from "../types/auth";
import { socialFeedService } from "./socialFeedService";
import { workoutService } from "./workoutService";
import { profileService } from "./profileService";
import { socialService } from "./socialService";

let warmupDoneForUserId: string | null = null;

export async function warmupAppData(user: AuthUser | null): Promise<void> {
  if (!user?.id || warmupDoneForUserId === user.id) return;
  warmupDoneForUserId = user.id;

  // Dispara as buscas essenciais em segundo plano com tratamento individual de erros
  void Promise.allSettled([
    // 1. Feed Social inicial
    socialFeedService.load(0).catch(() => null),

    // 2. Catálogo de Exercícios, Templates e Treino Ativo
    workoutService.loadCatalog().catch(() => null),
    workoutService.loadTemplates().catch(() => null),
    workoutService.getActiveWorkout().catch(() => null),

    // 3. Perfil do Usuário
    profileService.getProfile(user).catch(() => null),

    // 4. Amigos e Colmeias do Social
    socialService.loadFriends().catch(() => null),
    socialService.loadHives(user.id).catch(() => null),
  ]);
}

export function resetAppWarmup(): void {
  warmupDoneForUserId = null;
}
