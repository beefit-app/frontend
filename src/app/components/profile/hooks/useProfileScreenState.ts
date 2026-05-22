import { useEffect, useState } from "react";
import type { AuthUser } from "../../../types/auth";
import { profileService } from "../../../services/profileService";
import type { AccountSettingsData, ProfileData, ProfileScreenMode } from "../types";

export function useProfileScreenState({
  authUser,
  accountSettings,
  onAccountSettingsChange,
}: {
  authUser: AuthUser | null;
  accountSettings: AccountSettingsData;
  onAccountSettingsChange?: (data: AccountSettingsData) => void;
}) {
  const [profile, setProfile] = useState<ProfileData>(() => profileService.getProfile(authUser));
  const [screenMode, setScreenMode] = useState<ProfileScreenMode>("view");

  useEffect(() => {
    setProfile(profileService.getProfile(authUser));
  }, [authUser]);

  function handleProfileSave(data: Partial<ProfileData>) {
    setProfile((current) => profileService.saveProfile(current, data));
    setScreenMode("view");
  }

  function handleAccountSettingsSave(data: AccountSettingsData) {
    onAccountSettingsChange?.(data);
    setScreenMode("view");
  }

  return {
    profile,
    accountSettings,
    screenMode,
    goToView: () => setScreenMode("view"),
    goToEdit: () => setScreenMode("edit"),
    goToAccount: () => setScreenMode("account"),
    handleProfileSave,
    handleAccountSettingsSave,
  };
}
