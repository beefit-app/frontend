import { useEffect, useState } from "react";
import type { AuthUser } from "../../../types/auth";
import { accountSettingsService } from "../../../services/accountSettingsService";
import { profileService } from "../../../services/profileService";
import type {
  AccountSettingsData,
  AccountSettingsSaveInput,
  ProfileData,
  ProfileScreenMode,
} from "../types";

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

  useEffect(() => {
    const fallbackProfile = profileService.getProfileFallback(authUser);
    setProfile(fallbackProfile);
    setLoadError(null);
    setSaveError(null);
    setAccountSettingsError(null);

    if (!authUser) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void profileService
      .getProfile(authUser)
      .then((nextProfile) => {
        if (cancelled) return;
        setProfile(nextProfile);
        if (typeof nextProfile.ghostModeEnabled === "boolean") {
          onAccountSettingsChange?.({
            ghostModeEnabled: nextProfile.ghostModeEnabled,
          });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível carregar o perfil.";
        setLoadError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, onAccountSettingsChange]);

  async function handleProfileSave(data: Partial<ProfileData>) {
    setIsSubmitting(true);
    setSaveError(null);

    try {
      const nextProfile = await profileService.saveProfile(authUser, profile, data);
      setProfile(nextProfile);
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

  return {
    profile,
    accountSettings,
    screenMode,
    isLoading,
    isSubmitting,
    loadError,
    saveError,
    accountSettingsError,
    goToView: () => setScreenMode("view"),
    goToEdit: () => setScreenMode("edit"),
    goToAccount: () => setScreenMode("account"),
    handleProfileSave,
    handleAccountSettingsSave,
    clearLoadError: () => setLoadError(null),
    clearSaveError: () => setSaveError(null),
    clearAccountSettingsError: () => setAccountSettingsError(null),
  };
}
