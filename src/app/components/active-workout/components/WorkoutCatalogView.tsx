import { useState, useMemo, useEffect } from "react";
import { IonCol, IonGrid, IonRow, IonText } from "@ionic/react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PageBackground } from "../../PageBackground";
import type { ExerciseCatalogItem } from "../../../types/workout";
import { muscleStyle } from "../utils";
import { MuscleTag } from "./shared";
import { BeeInput } from "../../BeeInput";

export function WorkoutCatalogView({
  groupedExercises,
  activeCatalogGroupId,
  visibleCatalogItems,
  catalogLoadError,
  selectedCatalogIds,
  isLoadingCatalog,
  catalogError,
  onBack,
  onSelectGroup,
  onOpenExercise,
}: {
  groupedExercises: { groupId: string; group: string; items: ExerciseCatalogItem[] }[];
  activeCatalogGroupId: string;
  visibleCatalogItems: ExerciseCatalogItem[];
  catalogLoadError: string;
  selectedCatalogIds: Set<string>;
  isLoadingCatalog: boolean;
  catalogError: string | null;
  onBack: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenExercise: (exerciseId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const allExercises = useMemo(() => {
    return groupedExercises.flatMap((group) => group.items);
  }, [groupedExercises]);

  const filteredExercisesBySearch = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return allExercises;
    }
    return allExercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(term)
    );
  }, [searchTerm, allExercises]);

  const filterTabs = useMemo(() => {
    return [
      {
        groupId: "todos",
        group: "Todos",
        count: filteredExercisesBySearch.length,
      },
      ...groupedExercises.map((g) => {
        const term = searchTerm.toLowerCase().trim();
        const count = term
          ? g.items.filter((item) => item.name.toLowerCase().includes(term)).length
          : g.items.length;
        return {
          groupId: g.groupId,
          group: g.group,
          count,
        };
      }),
    ];
  }, [groupedExercises, filteredExercisesBySearch, searchTerm]);

  useEffect(() => {
    if (activeCatalogGroupId !== "todos" && searchTerm.trim() !== "") {
      const activeGroupCount = filterTabs.find((t) => t.groupId === activeCatalogGroupId)?.count ?? 0;
      if (activeGroupCount === 0) {
        onSelectGroup("todos");
      }
    }
  }, [searchTerm, activeCatalogGroupId, filterTabs, onSelectGroup]);

  const visibleItems = useMemo(() => {
    if (activeCatalogGroupId === "todos") {
      return allExercises;
    }
    const activeGroup = groupedExercises.find((g) => g.groupId === activeCatalogGroupId);
    return activeGroup ? activeGroup.items : [];
  }, [activeCatalogGroupId, groupedExercises, allExercises]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      return visibleItems;
    }
    return visibleItems.filter((exercise) =>
      exercise.name.toLowerCase().includes(term)
    );
  }, [searchTerm, visibleItems]);

  return (
    <PageBackground>
      <IonGrid fixed style={{ padding: "32px 12px calc(16px + var(--ion-safe-area-bottom, 0px))", position: "relative", zIndex: 1 }}>
        <IonRow>
          <IonCol size="12">
            <button
              type="button"
              onClick={onBack}
              className="beefit-tap-target"
              style={{
                border: "none",
                background: "transparent",
                color: "#A3A3A3",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: 0,
                marginBottom: 18,
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
                fontSize: 14,
              }}
            >
              <ChevronLeft size={16} />
              Voltar para o treino
            </button>
            <div style={{ display: "grid", gap: 8 }}>
              <h1 style={{ margin: 0, color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 30, fontWeight: 800 }}>
                Adicionar exercício
              </h1>
              <IonText style={{ color: "#B5B5B5", fontFamily: "var(--font-inter)", fontSize: 15, lineHeight: 1.6 }}>
                Navegue pelas abas dos grupos musculares e abra um exercício para ver os detalhes.
              </IonText>
            </div>
          </IonCol>
        </IonRow>

        <IonRow className="mt-5">
          <IonCol size="12">
            <div className="mb-4">
              <BeeInput
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                icon={<Search size={17} />}
                placeholder="Buscar exercício pelo nome..."
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                overflowX: "auto",
                padding: 6,
                marginBottom: 18,
                borderRadius: 18,
                border: "1px solid #242424",
                background: "rgba(12,12,12,0.78)",
                backdropFilter: "blur(10px)",
              }}
            >
              {filterTabs.map(({ groupId, group, count }) => {
                const active = groupId === activeCatalogGroupId;
                const style = muscleStyle(group);

                return (
                  <button
                    key={groupId}
                    type="button"
                    onClick={() => onSelectGroup(groupId)}
                    style={{
                      border: "none",
                      background: active ? "rgba(255,255,255,0.05)" : "transparent",
                      color: active ? "#FFFFFF" : "#8F8F8F",
                      borderRadius: 14,
                      padding: "11px 14px 10px",
                      // A aba e um alvo de toque primario: cresce ate o minimo de
                      // 44px em vez de usar pseudo-elemento, para o pilulo visivel
                      // coincidir com a area clicavel.
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-montserrat)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      position: "relative",
                      boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.04)" : "none",
                      transition: "background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
                      cursor: "pointer",
                    }}
                  >
                    <span>{group}</span>
                    <span style={{ marginLeft: 6, color: active ? "#FFFFFF" : "#666666" }}>({count})</span>
                    {active && (
                      <span
                        style={{
                          position: "absolute",
                          left: 12,
                          right: 12,
                          bottom: 5,
                          height: 2,
                          borderRadius: 999,
                          background: style.border,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {catalogLoadError && (
                <div
                  style={{
                    border: "1px solid rgba(239,68,68,0.35)",
                    background: "rgba(239,68,68,0.1)",
                    borderRadius: 18,
                    padding: 16,
                    color: "#FCA5A5",
                    fontFamily: "var(--font-inter)",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {catalogLoadError}
                </div>
              )}
              {!catalogLoadError && filteredItems.length === 0 && (
                <div
                  style={{
                    border: "1px solid #2D2D2D",
                    background: "#141414",
                    borderRadius: 18,
                    padding: 16,
                    color: "#A3A3A3",
                    fontFamily: "var(--font-inter)",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  Nenhum exercício encontrado para este grupo muscular.
                </div>
              )}
              {filteredItems.map((exercise) => {
                const alreadyAdded = selectedCatalogIds.has(exercise.id);
                const style = muscleStyle(exercise.group);

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => onOpenExercise(exercise.id)}
                    style={{
                      border: `1px solid ${alreadyAdded ? style.border : "#2D2D2D"}`,
                      background: alreadyAdded ? style.bg : "#141414",
                      borderRadius: 22,
                      padding: 18,
                      textAlign: "left",
                      display: "grid",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <span style={{ color: "#FFFFFF", fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700 }}>
                          {exercise.name}
                        </span>
                        <MuscleTag group={exercise.group} />
                      </div>
                      <ChevronRight size={18} color={alreadyAdded ? style.text : "#A3A3A3"} />
                    </div>
                    <span style={{ color: "#8F8F8F", fontFamily: "var(--font-inter)", fontSize: 13, lineHeight: 1.5 }}>
                      {exercise.notes}
                    </span>
                  </button>
                );
              })}
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </PageBackground>
  );
}
