import type {
  AccountSettingsData,
  AccountSettingsSaveInput,
} from "../components/profile/types";
import { apiClient } from "./apiClient";
import type {
  ChangePasswordRequest,
  DeleteAccountRequest,
  UpdateAccountSettingsRequest,
} from "../types/api";

interface BackendProfileResponse {
  ghostMode?: boolean | null;
}

export const accountSettingsService = {
  async getSettings(): Promise<AccountSettingsData> {
    const response = await apiClient.get<BackendProfileResponse>("/api/profile/me", { auth: true });
    return {
      ghostModeEnabled: response.ghostMode === true,
    };
  },

  async saveSettings(input: AccountSettingsSaveInput): Promise<AccountSettingsData> {
    const requests: Promise<unknown>[] = [
      apiClient.put("/api/profile/me/settings", { ghostMode: input.ghostModeEnabled } satisfies UpdateAccountSettingsRequest, {
        auth: true,
      }),
    ];

    if (input.currentPassword?.trim() && input.newPassword?.trim()) {
      requests.push(
        apiClient.put(
          "/api/profile/me/password",
          {
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
          } satisfies ChangePasswordRequest,
          { auth: true },
        ),
      );
    }

    await Promise.all(requests);

    return {
      ghostModeEnabled: input.ghostModeEnabled,
    };
  },

  async deleteAccount(password: string) {
    // A senha vai no corpo, e nao em header: DeleteUserRequestDTO a exige la, e
    // header customizado vaza para log de proxy com muito mais facilidade.
    await apiClient.delete("/api/profile/me", { password } satisfies DeleteAccountRequest, {
      auth: true,
    });
  },
};
