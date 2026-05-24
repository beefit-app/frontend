import { Scale } from "lucide-react";
import { useState } from "react";
import { IonText } from "@ionic/react";
import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { BeeButton } from "../../BeeButton";
import { BeeCard } from "../../BeeCard";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import type { ProfileData } from "../types";
import { BeeTextarea, HexAvatar } from "./shared";

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

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!displayName.trim()) nextErrors.displayName = "Nome é obrigatório";
    if (displayName.trim().length > 40) nextErrors.displayName = "Máximo 40 caracteres";
    if (bio.length > 200) nextErrors.bio = "Máximo 200 caracteres";

    const parsedWeight = parseFloat(weight);
    if (weight && (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300)) {
      nextErrors.weight = "Peso inválido (30–300 kg)";
    }

    return nextErrors;
  }

  async function handleSave() {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSave({
      displayName: displayName.trim(),
      bio,
      weight: parseFloat(weight) || profile.weight,
    });
  }

  const initials =
    displayName.trim().split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "??";
  const bioLeft = 200 - bio.length;

  return (
    <PageBackground>
      <IonGrid fixed style={{ maxWidth: 393, padding: "20px 0 40px", position: "relative", zIndex: 1 }}>
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "12px 12px 0" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <HexAvatar src={profile.avatarUrl} initials={initials} size={96} />
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
                <IonText
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontSize: 13,
                    color: "#F87171",
                    lineHeight: 1.5,
                    textAlign: "center",
                  }}
                >
                  {saveError}
                </IonText>
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
