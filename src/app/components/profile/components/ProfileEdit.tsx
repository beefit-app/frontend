import { Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { BeeButton } from "../../BeeButton";
import { BeeAlert } from "../../BeeAlert";
import { BeeCard } from "../../BeeCard";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import type { ProfileData } from "../types";
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG, messages } from "../../../constants/messages";
import { BeeTextarea, HexAvatar } from "./shared";
import { profileService } from "../../../services/profileService";
import { revokeObjectUrl, validateImageFile } from "../../../platform/mediaValidation";

export function ProfileEdit({
  profile,
  isSubmitting = false,
  saveError,
  onSave,
  onCancel,
  onClearSaveError,
}: {
  profile: ProfileData;
  isSubmitting?: boolean;
  saveError?: string | null;
  onSave: (data: Partial<ProfileData>) => Promise<void>;
  onCancel: () => void;
  onClearSaveError?: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [weight, setWeight] = useState(String(profile.weight));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);

  useEffect(() => () => revokeObjectUrl(avatarPreview), [avatarPreview]);

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!displayName.trim()) nextErrors.displayName = messages.required("seu nome");
    if (displayName.trim().length > 40) nextErrors.displayName = messages.maxLength(40);
    if (bio.length > 200) nextErrors.bio = messages.maxLength(200);

    const parsedWeight = parseFloat(weight);
    if (weight && (isNaN(parsedWeight) || parsedWeight < WEIGHT_MIN_KG || parsedWeight > WEIGHT_MAX_KG)) {
      nextErrors.weight = messages.weightRange;
    }

    return nextErrors;
  }

  async function handleSave() {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const avatarUrl = avatarFile ? await profileService.uploadProfilePhoto(avatarFile) : profile.avatarUrl;
    await onSave({
      displayName: displayName.trim(),
      bio,
      weight: parseFloat(weight) || profile.weight,
      avatarUrl,
    });
  }

  const initials =
    displayName.trim().split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "??";
  const bioLeft = 200 - bio.length;

  return (
    <PageBackground>
      <IonGrid fixed style={{ padding: "20px 0 40px", position: "relative", zIndex: 1 }}>
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "12px 12px 0" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <label style={{ cursor: "pointer" }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void (async () => {
                      try {
                        if (file) await validateImageFile(file);
                        revokeObjectUrl(avatarPreview);
                        setAvatarFile(file);
                        setAvatarPreview(file ? URL.createObjectURL(file) : profile.avatarUrl);
                        setErrors((current) => ({ ...current, avatar: "" }));
                      } catch (error) {
                        setErrors((current) => ({ ...current, avatar: error instanceof Error ? error.message : "Imagem inválida." }));
                      }
                    })();
                  }} />
                  <HexAvatar src={avatarPreview} initials={initials} size={96} />
                </label>
                {errors.avatar && <span className="sr-only" role="alert">{errors.avatar}</span>}
              </div>

              <BeeCard hover={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <BeeInput
                    label="Nome de Exibição"
                    value={displayName}
                    placeholder="Seu nome público"
                    onChange={(event) => {
                      if (saveError) onClearSaveError?.();
                      setDisplayName(event.target.value);
                      setErrors((current) => ({ ...current, displayName: "" }));
                    }}
                    error={errors.displayName}
                    disabled={isSubmitting}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <BeeTextarea
                      label="Biografia"
                      value={bio}
                      placeholder="Conte algo sobre você..."
                      onChange={(value) => {
                        if (value.length <= 200) {
                          if (saveError) onClearSaveError?.();
                          setBio(value);
                          setErrors((current) => ({ ...current, bio: "" }));
                        }
                      }}
                      error={errors.bio}
                    />
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: bioLeft < 20 ? "#F97316" : "#737373", textAlign: "right" }}>
                      {bioLeft} restantes
                    </span>
                  </div>
                  <BeeInput
                    label="Peso Atual (kg)"
                    value={weight}
                    type="number"
                    placeholder="Ex: 82.5"
                    min="30"
                    max="300"
                    step="0.1"
                    onChange={(event) => {
                      if (saveError) onClearSaveError?.();
                      setWeight(event.target.value);
                      setErrors((current) => ({ ...current, weight: "" }));
                    }}
                    error={errors.weight}
                    icon={<Scale size={18} />}
                    disabled={isSubmitting}
                  />
                </div>
              </BeeCard>

              {saveError && (
                <div style={{ textAlign: "center" }}>
                  <BeeAlert plain>{saveError}</BeeAlert>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <BeeButton variant="primary" fullWidth onClick={() => void handleSave()} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
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
