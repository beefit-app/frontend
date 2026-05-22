import { DEFAULT_ACCOUNT_SETTINGS } from "./mock";
import { useProfileScreenState } from "./hooks/useProfileScreenState";
import type { ProfileScreenProps } from "./types";
import { AccountSettingsScreen } from "./components/AccountSettingsScreen";
import { ProfileEdit } from "./components/ProfileEdit";
import { ProfileView } from "./components/ProfileView";
import { useAuth } from "../../auth/AuthContext";

export { DEFAULT_ACCOUNT_SETTINGS } from "./mock";
export type { AccountSettingsData, ProfileScreenProps } from "./types";

export function ProfileScreen({
  accountSettings = DEFAULT_ACCOUNT_SETTINGS,
  onAccountSettingsChange,
}: ProfileScreenProps) {
  const { logout } = useAuth();
  const {
    profile,
    screenMode,
    goToView,
    goToEdit,
    goToAccount,
    handleProfileSave,
    handleAccountSettingsSave,
  } = useProfileScreenState({
    accountSettings,
    onAccountSettingsChange,
  });

  if (screenMode === "edit") {
    return <ProfileEdit profile={profile} onSave={handleProfileSave} onCancel={goToView} />;
  }

  if (screenMode === "account") {
    return (
      <AccountSettingsScreen
        settings={accountSettings}
        onSave={handleAccountSettingsSave}
        onCancel={goToView}
      />
    );
  }

  return (
    <ProfileView
      profile={profile}
      onEdit={goToEdit}
      onManageAccount={goToAccount}
      onLogout={() => {
        void logout();
      }}
    />
  );
}
