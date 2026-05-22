import { Camera, Scale } from "lucide-react";
import { useRef, useState } from "react";
import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { BeeButton } from "../../BeeButton";
import { BeeCard } from "../../BeeCard";
import { BeeInput } from "../../BeeInput";
import { PageBackground } from "../../PageBackground";
import type { ProfileData } from "../types";
import { BeeTextarea, HexAvatar } from "./shared";

export function ProfileEdit({
  profile,
  onSave,
  onCancel,
}: {
  profile: ProfileData;
  onSave: (data: Partial<ProfileData>) => void;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [weight, setWeight] = useState(String(profile.weight));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleSave() {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
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
      <IonGrid fixed style={{ maxWidth: 393, padding: "20px 0 40px", position: "relative", zIndex: 1 }}>
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "12px 12px 0" }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ position: "relative" }}>
                  <HexAvatar src={avatarUrl} initials={initials} size={96} />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setAvatarUrl(URL.createObjectURL(file));
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: "absolute",
                      bottom: 2,
                      right: -8,
                      background: "#FFD700",
                      border: "2px solid #0A0A0A",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Camera size={14} color="#0A0A0A" />
                  </button>
                </div>
              </div>

              <BeeCard hover={false}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <BeeInput
                    label="Nome de Exibição"
                    value={displayName}
                    placeholder="Seu nome público"
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setErrors((current) => ({ ...current, displayName: "" }));
                    }}
                    error={errors.displayName}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <BeeTextarea
                      label="Biografia"
                      value={bio}
                      placeholder="Conte algo sobre você..."
                      onChange={(value) => {
                        if (value.length <= 200) {
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
                      setWeight(event.target.value);
                      setErrors((current) => ({ ...current, weight: "" }));
                    }}
                    error={errors.weight}
                    icon={<Scale size={18} />}
                  />
                </div>
              </BeeCard>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <BeeButton variant="primary" fullWidth onClick={handleSave}>
                  Salvar Alterações
                </BeeButton>
                <BeeButton variant="dark" fullWidth onClick={onCancel}>
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
