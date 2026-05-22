import { useState } from "react";
import { DEFAULT_PROFILE } from "../mock";
import type { AccountSettingsData, ProfileData, ProfileScreenMode } from "../types";

export function useProfileScreenState({
  accountSettings,
  onAccountSettingsChange,
}: {
  accountSettings: AccountSettingsData;
  onAccountSettingsChange?: (data: AccountSettingsData) => void;
}) {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [screenMode, setScreenMode] = useState<ProfileScreenMode>("view");

  function handleProfileSave(data: Partial<ProfileData>) {
    setProfile((current) => ({ ...current, ...data }));
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
