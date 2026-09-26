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
import { cropImageFile, type CropArea } from "../../../platform/imageCompression";
import { AVATAR_OUTPUT_SIZE } from "../constants";
import { AvatarCropSheet } from "./AvatarCropSheet";

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
  const [pendingAvatar, setPendingAvatar] = useState<{ file: File; url: string } | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => () => revokeObjectUrl(avatarPreview), [avatarPreview]);
  useEffect(() => () => revokeObjectUrl(pendingAvatar?.url), [pendingAvatar]);

  async function handleAvatarSelected(file: File | null) {
    if (!file) return;
    try {
      await validateImageFile(file);
      setPendingAvatar({ file, url: URL.createObjectURL(file) });
      setErrors((current) => ({ ...current, avatar: "" }));
    } catch (error) {
      setErrors((current) => ({ ...current, avatar: error instanceof Error ? error.message : "Imagem inválida." }));
    }
  }

  async function handleCropConfirm(area: CropArea) {
    if (!pendingAvatar) return;
    setIsCropping(true);
    try {
      const cropped = await cropImageFile(pendingAvatar.file, area, { ...AVATAR_OUTPUT_SIZE, quality: 0.8 });
      setAvatarFile(cropped);
      setAvatarPreview(URL.createObjectURL(cropped));
      setErrors((current) => ({ ...current, avatar: "" }));
      setPendingAvatar(null);
    } catch (error) {
      setErrors((current) => ({ ...current, avatar: error instanceof Error ? error.message : "Imagem inválida." }));
    } finally {
      setIsCropping(false);
    }
  }

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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    aria-label="Escolher foto de perfil"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      void handleAvatarSelected(file);
                    }}
                  />
                  <HexAvatar src={avatarPreview} initials={initials} size={96} />
                </label>
                {errors.avatar && !pendingAvatar && (
                  <span role="alert" style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
                    {errors.avatar}
                  </span>
                )}
              </div>

              <AvatarCropSheet
                imageUrl={pendingAvatar?.url ?? null}
                isProcessing={isCropping}
                error={errors.avatar}
                onCancel={() => {
                  setPendingAvatar(null);
                  setErrors((current) => ({ ...current, avatar: "" }));
                }}
                onConfirm={(area) => void handleCropConfirm(area)}
              />

              <BeeCard hover={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <BeeInput
                    label="Nome de Exibição"
                    name="displayName"
                    autoComplete="name"
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
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: bioLeft < 20 ? "#F97316" : "#8A8A8A", textAlign: "right" }}>
                      {bioLeft} restantes
                    </span>
                  </div>
                  <BeeInput
                    label="Peso Atual (kg)"
                    value={weight}
                    type="number"
                    name="weight"
                    inputMode="decimal"
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
