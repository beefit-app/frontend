import { useMemo, useState } from "react";
import {
  IonCard,
  IonCardContent,
  IonCol,
  IonGrid,
  IonRow,
  IonText,
} from "@ionic/react";
import { Check, Dumbbell, FolderKanban } from "lucide-react";
import { BeeButton } from "./BeeButton";
import { HexagonPattern } from "./HexagonPattern";

interface MuscleGroupOption {
  id: string;
  label: string;
  description: string;
  accent: string;
  glow: string;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  groups: string[];
  duration: string;
  exercises: number;
}

const MUSCLE_GROUPS: MuscleGroupOption[] = [
  {
    id: "peito",
    label: "Peito",
    description: "Supinos, crucifixos e variações de empurrar.",
    accent: "#FFD700",
    glow: "rgba(255,215,0,0.2)",
  },
  {
    id: "costas",
    label: "Costas",
    description: "Puxadas, remadas e foco em dorsais.",
    accent: "#3B82F6",
    glow: "rgba(59,130,246,0.2)",
  },
  {
    id: "pernas",
    label: "Pernas",
    description: "Quadríceps, posterior, glúteos e panturrilhas.",
    accent: "#22C55E",
    glow: "rgba(34,197,94,0.2)",
  },
  {
    id: "ombros",
    label: "Ombros",
    description: "Desenvolvimento, elevações e estabilidade.",
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.2)",
  },
  {
    id: "bracos",
    label: "Braços",
    description: "Bíceps, tríceps e antebraço no mesmo bloco.",
    accent: "#F97316",
    glow: "rgba(249,115,22,0.2)",
  },
  {
    id: "core",
    label: "Core",
    description: "Abdômen, lombar e estabilidade do tronco.",
    accent: "#EF4444",
    glow: "rgba(239,68,68,0.2)",
  },
];

const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "upper-a",
    name: "Upper A",
    groups: ["Peito", "Costas", "Ombros"],
    duration: "55 min",
    exercises: 7,
  },
  {
    id: "push",
    name: "Push Clássico",
    groups: ["Peito", "Ombros", "Tríceps"],
    duration: "48 min",
    exercises: 6,
  },
  {
    id: "legs",
    name: "Leg Day",
    groups: ["Quadríceps", "Posterior", "Glúteos"],
    duration: "1h 05min",
    exercises: 8,
  },
];

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

function HexIcon({
  icon,
  background,
  color,
  border,
}: {
  icon: React.ReactNode;
  background: string;
  color: string;
  border: string;
}) {
  return (
    <div
      style={{
        width: 40,
        aspectRatio: "0.87 / 1",
        clipPath: HEX_CLIP,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

export function WorkoutStartScreen() {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [startedWorkout, setStartedWorkout] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => WORKOUT_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId],
  );

  const canStartWorkout = selectedGroups.length > 0 || selectedTemplate !== null;

  function toggleGroup(groupId: string) {
    setStartedWorkout(null);
    setSelectedTemplateId(null);
    setSelectedGroups((current) =>
      current.includes(groupId) ? current.filter((item) => item !== groupId) : [...current, groupId],
    );
  }

  function selectTemplate(templateId: string) {
    setStartedWorkout(null);
    setSelectedGroups([]);
    setSelectedTemplateId((current) => (current === templateId ? null : templateId));
  }

  function handleStartWorkout() {
    if (!canStartWorkout) return;

    if (selectedTemplate) {
      setStartedWorkout(`Treino iniciado com o template ${selectedTemplate.name}.`);
      return;
    }

    const labels = MUSCLE_GROUPS
      .filter((group) => selectedGroups.includes(group.id))
      .map((group) => group.label);
    setStartedWorkout(`Treino iniciado para ${labels.join(", ")}.`);
  }

  return (
    <div style={{ minHeight: "100%", position: "relative", overflow: "hidden", background: "#0A0A0A" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <HexagonPattern />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <IonGrid fixed style={{ maxWidth: 393, padding: "20px 12px 88px" }}>
        <IonRow>
          <IonCol size="12">
            <div style={{ display: "grid", gap: 10 }}>
              <h1
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 30,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                Início do treino
              </h1>
              <IonText
                style={{
                  color: "#B5B5B5",
                  fontFamily: "var(--font-inter)",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                Escolha os grupos musculares que serão treinados ou selecione um template salvo. O treino só pode ser iniciado com uma dessas opções.
              </IonText>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-7">
          <IonCol size="12">
            <IonCard
              style={
                {
                  "--background": "rgba(26,26,26,0.92)",
                  "--color": "#FFFFFF",
                  "--border-radius": "24px",
                  margin: 0,
                  border: "1px solid #2D2D2D",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.24)",
                } as React.CSSProperties
              }
            >
              <IonCardContent style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <HexIcon
              icon={<Dumbbell size={18} />}
              background="rgba(255,215,0,0.12)"
              color="#FFD700"
              border="1px solid rgba(255,215,0,0.22)"
            />
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Selecionar grupos musculares
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  color: selectedTemplate ? "#FCA5A5" : "#8F8F8F",
                  fontFamily: "var(--font-inter)",
                  fontSize: 13,
                }}
              >
                {selectedTemplate
                  ? "Ao escolher grupos musculares, o template selecionado será removido."
                  : "Você pode marcar um ou mais grupos para montar o treino."}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {MUSCLE_GROUPS.map((group) => {
              const selected = selectedGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    border: `1px solid ${selected ? group.accent : "#2D2D2D"}`,
                    background: selected ? group.glow : "#141414",
                    borderRadius: 18,
                    padding: 18,
                    textAlign: "left",
                    display: "grid",
                    gap: 10,
                    cursor: "pointer",
                    boxShadow: selected ? `0 0 0 1px ${group.glow}, 0 16px 32px rgba(0,0,0,0.18)` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span
                      style={{
                        color: "#FFFFFF",
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      {group.label}
                    </span>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: `1px solid ${selected ? group.accent : "#525252"}`,
                        background: selected ? group.accent : "transparent",
                        color: selected ? "#0A0A0A" : "#737373",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={14} />
                    </span>
                  </div>
                  <span
                    style={{
                      color: "#A3A3A3",
                      fontFamily: "var(--font-inter)",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {group.description}
                  </span>
                </button>
              );
            })}
          </div>
              </IonCardContent>
            </IonCard>
          </IonCol>
        </IonRow>

        <IonRow className="mt-4">
          <IonCol size="12">
            <IonCard
              style={
                {
                  "--background": "rgba(20,20,20,0.9)",
                  "--color": "#FFFFFF",
                  "--border-radius": "24px",
                  margin: 0,
                  border: "1px solid #2D2D2D",
                } as React.CSSProperties
              }
            >
              <IonCardContent style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <HexIcon
              icon={<FolderKanban size={18} />}
              background="rgba(59,130,246,0.12)"
              color="#60A5FA"
              border="1px solid rgba(59,130,246,0.22)"
            />
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#FFFFFF",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Iniciar por template
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  color: selectedGroups.length > 0 ? "#FCA5A5" : "#8F8F8F",
                  fontFamily: "var(--font-inter)",
                  fontSize: 13,
                }}
              >
                {selectedGroups.length > 0
                  ? "Ao escolher um template, os grupos musculares marcados serão limpos."
                  : "Selecione um template salvo para começar com a estrutura pronta."}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {WORKOUT_TEMPLATES.map((template) => {
              const selected = selectedTemplateId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template.id)}
                  style={{
                    border: `1px solid ${selected ? "#60A5FA" : "#2D2D2D"}`,
                    background: selected ? "rgba(59,130,246,0.14)" : "#141414",
                    borderRadius: 18,
                    padding: 18,
                    textAlign: "left",
                    display: "grid",
                    gap: 12,
                    cursor: "pointer",
                    boxShadow: selected ? "0 16px 36px rgba(0,0,0,0.22)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <span
                        style={{
                          color: "#FFFFFF",
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        {template.name}
                      </span>
                      <span
                        style={{
                          color: "#8F8F8F",
                          fontFamily: "var(--font-inter)",
                          fontSize: 13,
                        }}
                      >
                        {template.exercises} exercícios • {template.duration}
                      </span>
                    </div>
                    <span
                      style={{
                        minWidth: 30,
                        height: 30,
                        borderRadius: 999,
                        border: `1px solid ${selected ? "#60A5FA" : "#525252"}`,
                        background: selected ? "#60A5FA" : "transparent",
                        color: selected ? "#08111E" : "#737373",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {selected ? <Check size={16} /> : template.name.slice(0, 1)}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {template.groups.map((group) => (
                      <span
                        key={group}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                          color: "#D4D4D4",
                          fontFamily: "var(--font-inter)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
              </IonCardContent>
            </IonCard>
          </IonCol>
        </IonRow>

        <IonRow>
          <IonCol size="12">
        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginTop: 18,
            paddingTop: 12,
            background: "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.92) 22%, #0A0A0A 100%)",
          }}
        >
          <div
            style={{
              padding: 18,
              borderRadius: 24,
              border: "1px solid #2D2D2D",
              background: "rgba(12,12,12,0.94)",
              boxShadow: "0 -12px 32px rgba(0,0,0,0.2)",
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "grid", gap: 4 }}>
              <span
                style={{
                  color: "#FFFFFF",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {selectedTemplate
                  ? `Template selecionado: ${selectedTemplate.name}`
                  : selectedGroups.length > 0
                    ? `${selectedGroups.length} grupo(s) muscular(es) selecionado(s)`
                    : "Nenhuma seleção feita"}
              </span>
              <span
                style={{
                  color: "#8F8F8F",
                  fontFamily: "var(--font-inter)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {selectedTemplate
                  ? "O treino será iniciado com a estrutura do template salvo."
                  : selectedGroups.length > 0
                    ? "O treino será iniciado a partir dos grupos musculares escolhidos."
                    : "Selecione grupos musculares ou um template para liberar a ação."}
              </span>
              {startedWorkout && (
                <span
                  style={{
                    color: "#86EFAC",
                    fontFamily: "var(--font-inter)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {startedWorkout}
                </span>
              )}
            </div>

            <BeeButton fullWidth size="md" onClick={handleStartWorkout} disabled={!canStartWorkout}>
              Iniciar treino
            </BeeButton>
          </div>
        </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
}
