import { DEFAULT_ACCOUNT_SETTINGS } from "./mock";
import { useProfileScreenState } from "./hooks/useProfileScreenState";
import type { ProfileScreenProps } from "./types";
import { AccountSettingsScreen } from "./components/AccountSettingsScreen";
import { ProfileEdit } from "./components/ProfileEdit";
import { ProfileView } from "./components/ProfileView";
import { useAuth } from "../../auth/AuthContext";
import { profileService } from "../../services/profileService";

export { DEFAULT_ACCOUNT_SETTINGS } from "./mock";
export type { AccountSettingsData, ProfileScreenProps } from "./types";

export function ProfileScreen({
  accountSettings = DEFAULT_ACCOUNT_SETTINGS,
  onAccountSettingsChange,
}: ProfileScreenProps) {
  const { logout, user } = useAuth();
  const {
    profile,
    screenMode,
    isLoading,
    isSubmitting,
    loadError,
    saveError,
    accountSettingsError,
    goToView,
    goToEdit,
    goToAccount,
    handleProfileSave,
    handleAccountSettingsSave,
    clearLoadError,
    clearSaveError,
    clearAccountSettingsError,
  } = useProfileScreenState({
    authUser: user,
    accountSettings,
    onAccountSettingsChange,
  });

  if (screenMode === "edit") {
    return (
      <ProfileEdit
        profile={profile}
        isSubmitting={isSubmitting}
        saveError={saveError}
        onSave={handleProfileSave}
        onCancel={goToView}
        onClearSaveError={clearSaveError}
      />
    );
  }

  if (screenMode === "account") {
    return (
      <AccountSettingsScreen
        settings={accountSettings}
        isSubmitting={isSubmitting}
        saveError={accountSettingsError}
        onSave={handleAccountSettingsSave}
        onCancel={goToView}
        onClearSaveError={clearAccountSettingsError}
      />
    );
  }

  return (
    <ProfileView
      profile={profile}
      isLoading={isLoading}
      loadError={loadError}
      trainedDays={profileService.getTrainedDays()}
      recentPosts={profileService.getRecentPosts()}
      onEdit={goToEdit}
      onManageAccount={goToAccount}
      onDismissError={clearLoadError}
      onLogout={() => {
        void logout();
      }}
    />
  );
}
