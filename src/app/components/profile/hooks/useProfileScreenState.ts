import { useEffect, useState } from "react";
import type { AuthUser } from "../../../types/auth";
import { accountSettingsService } from "../../../services/accountSettingsService";
import { profileService } from "../../../services/profileService";
import { subscribeSocialEvents } from "../../../services/socialEventsService";
import { pageCacheStorage } from "../../../storage/pageCacheStorage";
import type {
  AccountSettingsData,
  AccountSettingsSaveInput,
  ProfileData,
  ProfileScreenMode,
} from "../types";
import type { WorkoutPost } from "../types";

const PROFILE_TTL_MS = 5 * 60 * 1000;
const PROFILE_POSTS_TTL_MS = 2 * 60 * 1000;
const TRAINED_DAYS_TTL_MS = 10 * 60 * 1000;

export function useProfileScreenState({
  authUser,
  accountSettings,
  onAccountSettingsChange,
}: {
  authUser: AuthUser | null;
  accountSettings: AccountSettingsData;
  onAccountSettingsChange?: (data: AccountSettingsData) => void;
}) {
  const [profile, setProfile] = useState<ProfileData>(() => profileService.getProfileFallback(authUser));
  const [screenMode, setScreenMode] = useState<ProfileScreenMode>("view");
  const [isLoading, setIsLoading] = useState(Boolean(authUser));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [accountSettingsError, setAccountSettingsError] = useState<string | null>(null);
  const [postsLoadError, setPostsLoadError] = useState<string | null>(null);
  const [recentPosts, setRecentPosts] = useState<WorkoutPost[]>([]);
  const [trainedDays, setTrainedDays] = useState<number[]>([]);

  useEffect(() => {
    const fallbackProfile = profileService.getProfileFallback(authUser);
    setProfile(fallbackProfile);
    setLoadError(null);
    setSaveError(null);
    setAccountSettingsError(null);
    setPostsLoadError(null);
    setRecentPosts([]);
    setTrainedDays([]);

    if (!authUser) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      const [cachedProfile, cachedPosts, cachedTrainedDays] = await Promise.all([
        pageCacheStorage.get<Omit<ProfileData, "email">>(authUser.id, "profile", PROFILE_TTL_MS),
        pageCacheStorage.get<WorkoutPost[]>(authUser.id, "profile.posts", PROFILE_POSTS_TTL_MS),
        pageCacheStorage.get<number[]>(authUser.id, "profile.trained-days", TRAINED_DAYS_TTL_MS),
      ]);
      if (cancelled) return;
      if (cachedProfile) setProfile({ ...cachedProfile, email: authUser.email });
      if (cachedPosts) setRecentPosts(cachedPosts);
      if (cachedTrainedDays) setTrainedDays(cachedTrainedDays);
      if (cachedProfile) {
        setIsLoading(false);
      } else {
        try {
          const nextProfile = await profileService.getProfile(authUser);
          if (cancelled) return;
          setProfile(nextProfile);
          void pageCacheStorage.set(authUser.id, "profile", { ...nextProfile, email: undefined });
          if (typeof nextProfile.ghostModeEnabled === "boolean") {
            onAccountSettingsChange?.({
              ghostModeEnabled: nextProfile.ghostModeEnabled,
            });
          }
        } catch (error) {
          if (cancelled) return;
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Não foi possível carregar o perfil.";
          setLoadError(message);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      }

      if (!cachedPosts) void profileService
        .getRecentPosts(authUser.username)
        .then((posts) => {
          if (!cancelled) {
            setRecentPosts(posts);
            void pageCacheStorage.set(authUser.id, "profile.posts", posts);
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setRecentPosts([]);
          setPostsLoadError(error instanceof Error && error.message ? error.message : "Não foi possível carregar os posts do perfil.");
        });

      if (!cachedTrainedDays) void profileService
        .getTrainedDays()
        .then((days) => {
          if (!cancelled) {
            setTrainedDays(days);
            void pageCacheStorage.set(authUser.id, "profile.trained-days", days);
          }
        })
        .catch(() => {
          if (!cancelled) setTrainedDays([]);
        });
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, onAccountSettingsChange]);

  useEffect(() => {
    if (!authUser) return;

    const controller = new AbortController();
    void subscribeSocialEvents((event) => {
      if (event.type !== "PROFILE_UPDATED" || event.data.userId !== authUser.id) return;

      // O evento traz somente a projeção social. Invalidar e reler o perfil
      // completo evita sobrescrever bio, métricas e configurações com dados parciais.
      void pageCacheStorage.remove(authUser.id, "profile");
      void profileService.getProfile(authUser)
        .then((nextProfile) => {
          if (controller.signal.aborted) return;
          setProfile(nextProfile);
          void pageCacheStorage.set(authUser.id, "profile", { ...nextProfile, email: undefined });
          if (typeof nextProfile.ghostModeEnabled === "boolean") {
            onAccountSettingsChange?.({ ghostModeEnabled: nextProfile.ghostModeEnabled });
          }
        })
        .catch(() => {
          // O estado atual continua visível; a próxima abertura tenta novamente.
        });
    }, controller.signal);

    return () => {
      controller.abort();
    };
  }, [authUser, onAccountSettingsChange]);

  async function handleProfileSave(data: Partial<ProfileData>) {
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const nextProfile = await profileService.saveProfile(authUser, profile, data);
      setProfile(nextProfile);
      if (authUser) {
        const { email: _email, ...cacheableProfile } = nextProfile;
        void pageCacheStorage.set(authUser.id, "profile", cacheableProfile);
      }
      setScreenMode("view");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível salvar o perfil.";
      setSaveError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAccountSettingsSave(data: AccountSettingsSaveInput) {
    setIsSubmitting(true);
    setAccountSettingsError(null);

    try {
      const nextSettings = await accountSettingsService.saveSettings(data);
      onAccountSettingsChange?.(nextSettings);
      setProfile((current) => ({
        ...current,
        ghostModeEnabled: nextSettings.ghostModeEnabled,
      }));
      if (authUser) {
        void pageCacheStorage.remove(authUser.id, "profile");
      }
      setScreenMode("view");
      return true;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível salvar as configurações da conta.";
      setAccountSettingsError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAccountDelete(password: string) {
    setIsSubmitting(true);
    setAccountSettingsError(null);
    try { await accountSettingsService.deleteAccount(password); return true; }
    catch (error) { setAccountSettingsError(error instanceof Error ? error.message : "Não foi possível excluir a conta."); return false; }
    finally { setIsSubmitting(false); }
  }

  return {
    profile,
    accountSettings,
    screenMode,
    isLoading,
    isSubmitting,
    loadError,
    saveError,
    accountSettingsError,
    postsLoadError,
    recentPosts,
    trainedDays,
    goToView: () => setScreenMode("view"),
    goToEdit: () => setScreenMode("edit"),
    goToAccount: () => setScreenMode("account"),
    handleProfileSave,
    handleAccountSettingsSave,
    handleAccountDelete,
    clearLoadError: () => setLoadError(null),
    clearSaveError: () => setSaveError(null),
    clearAccountSettingsError: () => setAccountSettingsError(null),
    clearPostsLoadError: () => setPostsLoadError(null),
  };
}
