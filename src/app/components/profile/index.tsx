import { DEFAULT_ACCOUNT_SETTINGS } from "./constants";
import { useProfileScreenState } from "./hooks/useProfileScreenState";
import type { ProfileScreenProps } from "./types";
import { AccountSettingsScreen } from "./components/AccountSettingsScreen";
import { ProfileEdit } from "./components/ProfileEdit";
import { ProfileView } from "./components/ProfileView";
import { useAuth } from "../../auth/AuthContext";
import { profileService } from "../../services/profileService";

export { DEFAULT_ACCOUNT_SETTINGS } from "./constants";
export type { AccountSettingsData, ProfileScreenProps } from "./types";

export function ProfileScreen({
  accountSettings = DEFAULT_ACCOUNT_SETTINGS,
  onAccountSettingsChange,
  onWorkoutDeleted,
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
    postsLoadError,
    recentPosts,
    trainedDays,
    goToView,
    goToEdit,
    goToAccount,
    handleProfileSave,
    handleAccountSettingsSave,
    handleAccountDelete,
    handleDeleteWorkoutPost,
    clearLoadError,
    clearSaveError,
    clearAccountSettingsError,
    clearPostsLoadError,
  } = useProfileScreenState({
    authUser: user,
    accountSettings,
    onAccountSettingsChange,
    onWorkoutDeleted,
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
        onDeleteAccount={async (password) => {
          const deleted = await handleAccountDelete(password);
          if (deleted) await logout({ isAccountDeletion: true });
          return deleted;
        }}
      />
    );
  }

  return (
    <ProfileView
      profile={profile}
      isLoading={isLoading}
      loadError={loadError}
      postsLoadError={postsLoadError}
      trainedDays={trainedDays}
      recentPosts={recentPosts}
      onDeleteWorkoutPost={handleDeleteWorkoutPost}
      onEdit={goToEdit}
      onManageAccount={goToAccount}
      onDismissError={clearLoadError}
      onDismissPostsError={clearPostsLoadError}
      onLogout={() => {
        void logout();
      }}
    />
  );
}
