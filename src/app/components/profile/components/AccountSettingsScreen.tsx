import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { ChevronLeft, Eye, EyeOff, Ghost, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { BeeButton } from "../../BeeButton";
import { BeeCard } from "../../BeeCard";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import type { AccountSettingsSaveInput } from "../types";
import { SectionLabel } from "./shared";

export function AccountSettingsScreen({
  settings,
  isSubmitting = false,
  saveError,
  onSave,
  onCancel,
  onClearSaveError,
  onDeleteAccount,
}: {
  settings: { ghostModeEnabled: boolean };
  isSubmitting?: boolean;
  saveError?: string | null;
  onSave: (data: AccountSettingsSaveInput) => Promise<boolean>;
  onCancel: () => void;
  onClearSaveError?: () => void;
  onDeleteAccount?: (password: string) => Promise<boolean>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ghostModeEnabled, setGhostModeEnabled] = useState(settings.ghostModeEnabled);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  const EyeToggleIcon = ({ visible }: { visible: boolean }) => (visible ? <EyeOff size={18} /> : <Eye size={18} />);

  function validate() {
    const nextErrors: Record<string, string> = {};
    const isChangingPassword = Boolean(currentPassword || newPassword || confirmPassword);

    if (isChangingPassword) {
      if (!currentPassword) nextErrors.currentPassword = "Digite sua senha atual";
      if (!newPassword) nextErrors.newPassword = "Digite a nova senha";
      else if (newPassword.length < 6) {
        nextErrors.newPassword = "Mínimo de 6 caracteres";
      }
      if (!confirmPassword) nextErrors.confirmPassword = "Confirme a nova senha";
      else if (confirmPassword !== newPassword) nextErrors.confirmPassword = "As senhas não coincidem";
      if (currentPassword && newPassword && currentPassword === newPassword) {
        nextErrors.newPassword = "A nova senha deve ser diferente da atual";
      }
    }

    return nextErrors;
  }

  async function handleSave() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage("");
      return;
    }

    setErrors({});
    const saved = await onSave({
      ghostModeEnabled,
      currentPassword: currentPassword.trim() || undefined,
      newPassword: newPassword.trim() || undefined,
    });

    if (!saved) {
      setSuccessMessage("");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccessMessage("Configurações atualizadas com sucesso.");
  }

  return (
    <PageBackground>
      <IonGrid fixed style={{ maxWidth: 393, padding: "20px 0 40px", position: "relative", zIndex: 1 }}>
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "12px 12px 0" }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#A3A3A3",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-inter)",
                  fontSize: 14,
                  alignSelf: "flex-start",
                }}
              >
                <ChevronLeft size={16} />
                Voltar ao perfil
              </button>

              <div style={{ display: "grid", gap: 6 }}>
                <h1 style={{ margin: 0, fontFamily: "var(--font-montserrat)", fontSize: 24, fontWeight: 700, color: "#ffffff" }}>
                  Configurações de conta
                </h1>
                <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.6, color: "#737373" }}>
                  Gerencie sua senha e a forma como seu perfil aparece para outros usuários.
                </p>
              </div>

              <BeeCard hover={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <SectionLabel icon={<LockKeyhole size={13} color="#FFD700" />} label="Alterar Senha" />

                  <BeeInput
                    label="Senha atual"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(event) => {
                      if (saveError) onClearSaveError?.();
                      setCurrentPassword(event.target.value);
                      setErrors((prev) => ({ ...prev, currentPassword: "" }));
                    }}
                    error={errors.currentPassword}
                    icon={<LockKeyhole size={18} />}
                    disabled={isSubmitting}
                    rightElement={
                      <span onClick={() => setShowCurrentPassword((current) => !current)}>
                        <EyeToggleIcon visible={showCurrentPassword} />
                      </span>
                    }
                  />

                  <BeeInput
                    label="Nova senha"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(event) => {
                      if (saveError) onClearSaveError?.();
                      setNewPassword(event.target.value);
                      setErrors((prev) => ({ ...prev, newPassword: "" }));
                    }}
                    error={errors.newPassword}
                    icon={<LockKeyhole size={18} />}
                    disabled={isSubmitting}
                    rightElement={
                      <span onClick={() => setShowNewPassword((current) => !current)}>
                        <EyeToggleIcon visible={showNewPassword} />
                      </span>
                    }
                  />

                  <BeeInput
                    label="Confirmar nova senha"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => {
                      if (saveError) onClearSaveError?.();
                      setConfirmPassword(event.target.value);
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    error={errors.confirmPassword}
                    icon={<LockKeyhole size={18} />}
                    disabled={isSubmitting}
                    rightElement={
                      <span onClick={() => setShowConfirmPassword((current) => !current)}>
                        <EyeToggleIcon visible={showConfirmPassword} />
                      </span>
                    }
                  />
                </div>
              </BeeCard>

              <BeeCard hover={false}>
                <div style={{ display: "grid", gap: 14 }}>
                  <SectionLabel icon={<LockKeyhole size={13} color="#F87171" />} label="Excluir conta" />
                  <p style={{ margin: 0, color: "#FCA5A5", fontFamily: "var(--font-inter)", fontSize: 12, lineHeight: 1.55 }}>
                    Esta ação remove permanentemente seus treinos, posts, mídias, cartas e relações sociais.
                  </p>
                  <BeeInput label="Confirme sua senha" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} disabled={isSubmitting} />
                  <BeeButton variant="dark" fullWidth disabled={isSubmitting || !deletePassword.trim()} onClick={() => {
                    if (!window.confirm("Excluir permanentemente sua conta?")) return;
                    void onDeleteAccount?.(deletePassword).then((deleted) => { if (deleted) setDeletePassword(""); });
                  }}>
                    Excluir permanentemente
                  </BeeButton>
                </div>
              </BeeCard>

              <BeeCard hover={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <SectionLabel icon={<Ghost size={13} color="#FFD700" />} label="Privacidade" />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "16px 14px",
                      borderRadius: 16,
                      border: "1px solid #2D2D2D",
                      background: "#1A1A1A",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontFamily: "var(--font-montserrat)", fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                        Modo fantasma
                      </span>
                      <span style={{ display: "block", fontFamily: "var(--font-inter)", fontSize: 12, lineHeight: 1.6, color: "#737373" }}>
                        Oculta sua presença e reduz a visibilidade das suas atividades públicas.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGhostModeEnabled((current) => !current)}
                      aria-pressed={ghostModeEnabled}
                      disabled={isSubmitting}
                      style={{
                        width: 56,
                        height: 32,
                        borderRadius: 999,
                        border: "1px solid",
                        borderColor: ghostModeEnabled ? "#FFD700" : "#404040",
                        background: ghostModeEnabled ? "rgba(255,215,0,0.18)" : "#101010",
                        padding: 3,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: ghostModeEnabled ? "flex-end" : "flex-start",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: ghostModeEnabled ? "#FFD700" : "#737373",
                          boxShadow: ghostModeEnabled ? "0 0 12px rgba(255,215,0,0.35)" : "none",
                          transition: "all 0.2s ease",
                        }}
                      />
                    </button>
                  </div>
                </div>
              </BeeCard>

              {saveError && (
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(248,113,113,0.24)",
                    background: "rgba(127,29,29,0.18)",
                    padding: "14px 16px",
                    fontFamily: "var(--font-inter)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#FCA5A5",
                  }}
                >
                  {saveError}
                </div>
              )}

              {successMessage && (
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(34,197,94,0.35)",
                    background: "rgba(34,197,94,0.12)",
                    padding: "14px 16px",
                    fontFamily: "var(--font-inter)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#86EFAC",
                  }}
                >
                  {successMessage}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <BeeButton variant="primary" fullWidth onClick={() => void handleSave()} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar configurações"}
                </BeeButton>
                <BeeButton variant="dark" fullWidth onClick={onCancel} disabled={isSubmitting}>
                  Cancelar
                </BeeButton>
              </div>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
