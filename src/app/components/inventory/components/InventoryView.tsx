import { IonCol, IonGrid, IonRow } from "@ionic/react";
import Body, { type ExtendedBodyPart, type Slug } from "react-muscle-highlighter";
import {
  Check,
  Filter,
  FolderKanban,
  MoreVertical,
  Package2,
  Plus,
  RefreshCcw,
  Search,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, motion as Motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useState } from "react";
import type { ExerciseCatalogItem, WorkoutTemplate } from "../../../types/workout";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";
import { BeeButton } from "../../BeeButton";
import { PageBackground } from "../../PageBackground";
import {
  HEX_CLIP,
  MUSCLE_GROUP_FILTER_OPTIONS,
  MUSCLE_GROUP_META,
  RARITY_FILTER_OPTIONS,
  RARITY_META,
} from "../constants";
import type { InventoryCard, InventoryFilters, InventoryMuscleGroup, InventoryRarity } from "../types";

type InventoryTab = "cards" | "templates";

const HEATMAP_PARTS: Record<InventoryMuscleGroup, readonly Slug[]> = {
  CHEST: ["chest"],
  BACK: ["upper-back", "lower-back"],
  LEGS: ["quadriceps", "hamstring", "calves", "tibialis", "adductors"],
  GLUTES: ["gluteal"],
  SHOULDERS: ["deltoids"],
  ARMS: ["biceps", "triceps", "forearm"],
  CORE: ["abs", "obliques"],
  TRAPS: ["trapezius"],
};

const BEEFIT_HEATMAP_COLORS = ["#6B5200", "#A98200", "#D4AD00", "#FFD700"] as const;
const BEEFIT_HEATMAP_BASE = "#292929";
const BEEFIT_HEATMAP_STROKE = "rgba(255,215,0,0.22)";
const HEATMAP_SLUGS = new Set<Slug>([
  "abs",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "deltoids",
  "forearm",
  "gluteal",
  "hamstring",
  "lower-back",
  "neck",
  "quadriceps",
  "trapezius",
  "triceps",
  "upper-back",
]);

function formatAttackPower(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function FilterPill<T extends string | null>({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        borderRadius: 999,
        border: `1px solid ${active ? "#FFD700" : "#2D2D2D"}`,
        background: active ? "rgba(255,215,0,0.12)" : "#141414",
        color: active ? "#FFD700" : "#D4D4D4",
        padding: "10px 14px",
        fontFamily: "var(--font-montserrat)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ActiveFilterTag({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        border: "1px solid rgba(255,215,0,0.24)",
        background: "rgba(255,215,0,0.08)",
        padding: "6px 10px",
        fontFamily: "var(--font-inter)",
        fontSize: 11,
        fontWeight: 600,
        color: "#FFD700",
      }}
    >
      <span style={{ width: 8, height: 9, clipPath: HEX_CLIP, background: "#FFD700" }} />
      {label}
    </span>
  );
}

function FilterSection({
  filters,
  onResetFilters,
  onRarityChange,
  onMuscleGroupChange,
}: {
  filters: InventoryFilters;
  onResetFilters: () => void;
  onRarityChange: (rarity: InventoryRarity | null) => void;
  onMuscleGroupChange: (muscleGroup: InventoryMuscleGroup | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterLabels = getActiveFilterLabels(filters);
  const hasActiveFilters = activeFilterLabels.length > 0;

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} color="#FFD700" />
          <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Filtros
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            border: `1px solid ${isOpen ? "#FFD700" : "#2D2D2D"}`,
            background: isOpen ? "rgba(255,215,0,0.12)" : "#141414",
            color: isOpen ? "#FFD700" : "#D4D4D4",
            padding: "10px 14px",
            fontFamily: "var(--font-montserrat)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          <Filter size={14} />
          Filtrar
        </button>
      </div>

      {hasActiveFilters && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {activeFilterLabels.map((label) => <ActiveFilterTag key={label} label={label} />)}
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              border: "none",
              background: "transparent",
              color: "#FFD700",
              fontFamily: "var(--font-inter)",
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
            }}
          >
            Limpar
          </button>
        </div>
      )}

      {isOpen && (
        <div
          style={{
            borderRadius: 20,
            border: "1px solid #2D2D2D",
            background: "rgba(20,20,20,0.96)",
            padding: 16,
            display: "grid",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                Filtrar cartas
              </div>
              <div style={{ marginTop: 4, fontFamily: "var(--font-inter)", fontSize: 13, color: "#8A8A8A" }}>
                Refine a coleção por raridade e grupo muscular.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar filtros"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid #2D2D2D",
                background: "transparent",
                color: "#D4D4D4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Raridade
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {RARITY_FILTER_OPTIONS.map((option) => (
                <FilterPill<InventoryRarity | null>
                  key={option.label}
                  active={filters.rarity === option.value}
                  label={option.label}
                  onClick={() => onRarityChange(option.value)}
                />
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Grupo muscular
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {MUSCLE_GROUP_FILTER_OPTIONS.map((option) => (
                <FilterPill<InventoryMuscleGroup | null>
                  key={option.label}
                  active={filters.muscleGroup === option.value}
                  label={option.label}
                  onClick={() => onMuscleGroupChange(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        border: "1px dashed #2D2D2D",
        background: "rgba(20,20,20,0.92)",
        padding: "28px 18px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 44,
          height: 50,
          margin: "0 auto 14px",
          clipPath: HEX_CLIP,
          background: "rgba(255,215,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFD700",
        }}
      >
        <Package2 size={18} />
      </div>
      <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>{title}</div>
      <div style={{ marginTop: 8, fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.45, color: "#8A8A8A" }}>{description}</div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 16,
            borderRadius: 999,
            border: "1px solid #FFD700",
            background: "transparent",
            color: "#FFD700",
            padding: "10px 16px",
            fontFamily: "var(--font-montserrat)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function InventoryCardTile({ card }: { card: InventoryCard }) {
  const rarity = RARITY_META[card.rarity] ?? RARITY_META.COMMON;
  const muscle = MUSCLE_GROUP_META[card.muscleGroup] ?? MUSCLE_GROUP_META.CORE;
  const intensityByBodyPart = new Map<Slug, number>();

  Object.entries(card.muscleIntensities).forEach(([muscleKey, intensity]) => {
    const groupedParts = HEATMAP_PARTS[muscleKey as InventoryMuscleGroup];
    const bodyParts = groupedParts ?? (HEATMAP_SLUGS.has(muscleKey as Slug) ? [muscleKey as Slug] : []);
    bodyParts.forEach((slug) => {
      intensityByBodyPart.set(slug, Math.max(intensityByBodyPart.get(slug) ?? 0, intensity));
    });
  });

  const heatmapData: readonly ExtendedBodyPart[] = Array.from(intensityByBodyPart, ([slug, intensity]) => ({
    slug,
    intensity,
  }));

  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        border: `1px solid ${rarity.border}`,
        background: `linear-gradient(135deg, ${rarity.background} 0%, #141414 68%)`,
        padding: 16,
        boxShadow: `0 12px 30px rgba(0,0,0,0.18), ${rarity.shadow}`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -72,
          right: -54,
          width: 180,
          height: 180,
          opacity: card.rarity === "LEGENDARY" ? 0.12 : 0.07,
          borderRadius: "50%",
          clipPath: HEX_CLIP,
          background: rarity.accent,
        }}
      />
      {card.rarity === "LEGENDARY" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, transparent 0%, transparent 35%, rgba(255,255,255,0.05) 50%, transparent 65%, transparent 100%)",
            transform: "translateX(-40%)",
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18, alignItems: "stretch" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                border: `1px solid ${rarity.border}`,
                background: rarity.badgeBackground,
                padding: "5px 10px",
                fontFamily: "var(--font-inter)",
                fontSize: 11,
                fontWeight: 700,
                color: rarity.color,
              }}
            >
              <span style={{ width: 8, height: 9, clipPath: HEX_CLIP, background: rarity.accent }} />
              {card.rarityLabel}
            </span>
            {card.isPersonalRecord && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  borderRadius: 999,
                  border: "1px solid rgba(255,215,0,0.24)",
                  background: "rgba(255,215,0,0.08)",
                  padding: "5px 10px",
                  fontFamily: "var(--font-inter)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FFD700",
                }}
              >
                <Star size={12} />
                PR
              </span>
            )}
          </div>

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 48,
                clipPath: HEX_CLIP,
                background: rarity.badgeBackground,
                border: `1px solid ${rarity.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: rarity.accent,
                flexShrink: 0,
              }}
            >
              <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 15, fontWeight: 800 }}>{muscle.shortLabel}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 17, fontWeight: 700, color: "#FFFFFF" }}>
                Carta de {muscle.label}
              </div>
              <div style={{ marginTop: 4, fontFamily: "var(--font-inter)", fontSize: 13, color: "#8A8A8A" }}>
                {muscle.detail}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, fontFamily: "var(--font-montserrat)", fontSize: 32, fontWeight: 800, color: rarity.accent, lineHeight: 1 }}>
            {formatAttackPower(card.attackPower)}
          </div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-inter)", fontSize: 12, color: "#737373", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Poder de ataque
          </div>

          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#737373" }}>Gerada em</span>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, fontWeight: 600, color: "#D4D4D4" }}>{formatDate(card.generatedAt)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#737373" }}>Peso corporal</span>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, fontWeight: 600, color: "#D4D4D4" }}>
                {card.bodyWeightAtGeneration == null ? "N/D" : `${formatAttackPower(card.bodyWeightAtGeneration)} kg`}
              </span>
            </div>
          </div>
        </div>

        <div
          aria-label="Área reservada para o heatmap dos grupos musculares"
          role="img"
          style={{
            gridColumn: "1 / -1",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, fontWeight: 800, color: "#D4D4D4", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Mapa muscular
              </div>
              <div style={{ marginTop: 3, color: "#737373", fontFamily: "var(--font-inter)", fontSize: 11 }}>
                Quanto mais claro, maior a participação no treino
              </div>
            </div>
            <span style={{ borderRadius: 999, border: `1px solid ${rarity.border}`, background: rarity.badgeBackground, color: rarity.color, padding: "5px 9px", fontFamily: "var(--font-inter)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
              {muscle.label}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <div style={{ position: "relative", minHeight: 230, overflow: "hidden", borderRadius: 16, border: `1px solid ${rarity.border}`, background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))", display: "grid", justifyItems: "center", alignItems: "center", padding: "12px 8px 10px" }}>
              <span style={{ position: "absolute", top: 10, left: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", padding: "4px 7px", fontFamily: "var(--font-inter)", fontSize: 9, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Página 1
              </span>
              <Body
                data={heatmapData}
                side="front"
                gender="male"
                scale={0.5}
                colors={BEEFIT_HEATMAP_COLORS}
                defaultFill={BEEFIT_HEATMAP_BASE}
                defaultStroke={BEEFIT_HEATMAP_STROKE}
                defaultStrokeWidth={0.5}
                border="none"
              />
              <span style={{ position: "absolute", bottom: 9, fontFamily: "var(--font-inter)", fontSize: 10, fontWeight: 600, color: "#A3A3A3" }}>Frente</span>
            </div>
            <div style={{ position: "relative", minHeight: 230, overflow: "hidden", borderRadius: 16, border: `1px solid ${rarity.border}`, background: "linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))", display: "grid", justifyItems: "center", alignItems: "center", padding: "12px 8px 10px" }}>
              <span style={{ position: "absolute", top: 10, left: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", padding: "4px 7px", fontFamily: "var(--font-inter)", fontSize: 9, fontWeight: 700, color: "#A3A3A3", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Página 2
              </span>
              <Body
                data={heatmapData}
                side="back"
                gender="male"
                scale={0.5}
                colors={BEEFIT_HEATMAP_COLORS}
                defaultFill={BEEFIT_HEATMAP_BASE}
                defaultStroke={BEEFIT_HEATMAP_STROKE}
                defaultStrokeWidth={0.5}
                border="none"
              />
              <span style={{ position: "absolute", bottom: 9, fontFamily: "var(--font-inter)", fontSize: 10, fontWeight: 600, color: "#A3A3A3" }}>Costas</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#737373", fontFamily: "var(--font-inter)", fontSize: 9 }}>
            <span>Baixa</span>
            <span aria-hidden="true" style={{ width: 92, height: 5, borderRadius: 999, background: `linear-gradient(90deg, ${BEEFIT_HEATMAP_COLORS.join(", ")})` }} />
            <span>Alta</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function TemplateSkeletonList() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} style={{ borderRadius: 18, border: "1px solid #2D2D2D", background: "#141414", padding: 16 }}>
          <div style={{ width: "58%", height: 20, borderRadius: 8, background: "#232323" }} />
          <div style={{ marginTop: 12, width: "74%", height: 14, borderRadius: 8, background: "#1C1C1C" }} />
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <div style={{ width: 72, height: 24, borderRadius: 999, background: "#232323" }} />
            <div style={{ width: 88, height: 24, borderRadius: 999, background: "#232323" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function getTemplateExercises(template: WorkoutTemplate, catalog: ExerciseCatalogItem[]) {
  return template.exerciseIds
    .map((exerciseId) => catalog.find((exercise) => exercise.id === exerciseId) ?? null)
    .filter((exercise): exercise is ExerciseCatalogItem => exercise !== null);
}

function normalizeTemplateGroupLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function exerciseMatchesMuscleGroup(exercise: ExerciseCatalogItem, muscleGroup: InventoryMuscleGroup | null) {
  if (!muscleGroup) return true;
  return normalizeTemplateGroupLabel(exercise.group) === normalizeTemplateGroupLabel(MUSCLE_GROUP_META[muscleGroup].label);
}

function TemplateCard({
  template,
  catalog,
  onOpenMenu,
}: {
  template: WorkoutTemplate;
  catalog: ExerciseCatalogItem[];
  onOpenMenu: () => void;
}) {
  const exercises = getTemplateExercises(template, catalog);
  const uniqueGroups = Array.from(new Set(template.groups));
  const groupSummary = uniqueGroups.length > 0 ? uniqueGroups.join(", ") : "Sem grupo definido";

  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: "1px solid #2D2D2D",
        background: "#171717",
        padding: 14,
        display: "grid",
        gap: 13,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -38,
          right: -28,
          width: 96,
          height: 110,
          clipPath: HEX_CLIP,
          background: "rgba(255,215,0,0.05)",
        }}
      />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 41,
                clipPath: HEX_CLIP,
                background: "rgba(255,215,0,0.12)",
                border: "1px solid rgba(255,215,0,0.24)",
                color: "#FFD700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FolderKanban size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {template.name}
              </h2>
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-inter)", fontSize: 11, color: "#737373" }}>
                <span>{template.exerciseIds.length} exercícios</span>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: "#525252" }} />
                <span>{uniqueGroups.length} grupos</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={`Gerenciar template ${template.name}`}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid #2D2D2D",
            background: "#181818",
            color: "#A3A3A3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div
        style={{
          position: "relative",
          borderRadius: 14,
          border: "1px solid #2D2D2D",
          background: "#141414",
          padding: "10px 12px",
          minWidth: 0,
        }}
      >
        <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 10, fontWeight: 800, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Grupos musculares
        </div>
        <div style={{ marginTop: 4, fontFamily: "var(--font-inter)", fontSize: 12, fontWeight: 700, color: "#FFD700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {groupSummary}
        </div>
      </div>

      <div style={{ position: "relative", display: "grid", gap: 9, borderTop: "1px solid #2D2D2D", paddingTop: 14 }}>
        <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 10, fontWeight: 800, color: "#737373", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Exercícios
        </div>
        {exercises.map((exercise) => (
          <div key={exercise.id} style={{ display: "flex", alignItems: "center", gap: 8, color: "#D4D4D4" }}>
            <span style={{ width: 7, height: 8, clipPath: HEX_CLIP, background: "#FFD700", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {exercise.name}
            </span>
          </div>
        ))}
        {exercises.length === 0 && (
          <div style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#737373" }}>
            Exercícios indisponíveis no catálogo carregado.
          </div>
        )}
      </div>
    </article>
  );
}

function TemplateActionSheet({
  template,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  isSaving,
}: {
  template: WorkoutTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[430px] rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white">
        <SheetHeader className="px-0 pb-3 pt-3 text-left">
          <SheetTitle className="font-montserrat text-[20px] font-bold text-white">
            {template?.name ?? "Opções do template"}
          </SheetTitle>
          <SheetDescription className="font-inter text-[13px] text-[#737373]">
            Escolha uma ação para este template.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2.5">
          <BeeButton
            variant="dark"
            fullWidth
            onClick={onEdit}
            disabled={!template || isSaving}
          >
            Editar template
          </BeeButton>
          <BeeButton
            variant="red"
            fullWidth
            onClick={onDelete}
            disabled={!template || isSaving}
          >
            Excluir template
          </BeeButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TemplateFormSheet({
  mode,
  open,
  catalog,
  template,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  mode: "create" | "edit";
  open: boolean;
  catalog: ExerciseCatalogItem[];
  template: WorkoutTemplate | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { name: string; exerciseIds: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [exerciseIds, setExerciseIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [catalogMuscleGroupFilter, setCatalogMuscleGroupFilter] = useState<InventoryMuscleGroup | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(mode === "edit" ? template?.name ?? "" : "");
    setExerciseIds(mode === "edit" ? template?.exerciseIds ?? [] : []);
    setQuery("");
    setCatalogMuscleGroupFilter(null);
    setFormError(null);
  }, [mode, open, template]);

  const selectedExercises = exerciseIds
    .map((exerciseId) => catalog.find((exercise) => exercise.id === exerciseId) ?? null)
    .filter((exercise): exercise is ExerciseCatalogItem => exercise !== null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCatalog = catalog
    .filter((exercise) => !exerciseIds.includes(exercise.id))
    .filter((exercise) => exerciseMatchesMuscleGroup(exercise, catalogMuscleGroupFilter))
    .filter((exercise) => {
      if (!normalizedQuery) return true;
      return `${exercise.name} ${exercise.group}`.toLowerCase().includes(normalizedQuery);
    })
    .slice(0, 24);
  const canSubmit = name.trim().length > 0 && exerciseIds.length > 0 && !isSaving;

  async function handleSubmit() {
    if (!name.trim()) {
      setFormError("Nomeie o template antes de salvar.");
      return;
    }
    if (exerciseIds.length === 0) {
      setFormError("Adicione ao menos um exercício.");
      return;
    }

    try {
      await onSubmit({ name: name.trim(), exerciseIds });
      onOpenChange(false);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Não foi possível salvar o template.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[92vh] max-w-[820px] gap-0 overflow-hidden rounded-t-[24px] border border-b-0 border-[#2D2D2D] bg-[#141414] p-0 text-white">
        <SheetHeader className="border-b border-[#2D2D2D] px-5 py-5 text-left">
          <SheetTitle className="font-montserrat text-[18px] font-bold text-white">
            {mode === "edit" ? "Editar template" : "Novo template"}
          </SheetTitle>
          <SheetDescription className="font-inter text-[13px] text-[#737373]">
            Nomeie o treino e adicione os exercícios na ordem desejada.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-start">
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="font-montserrat text-[11px] font-bold uppercase tracking-[0.08em] text-[#737373]">Nome</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Upper pesado"
                  className="h-12 rounded-2xl border border-[#2D2D2D] bg-[#101010] px-4 font-inter text-[14px] text-white outline-none focus:border-[#FFD700]"
                />
              </label>

              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-montserrat text-[11px] font-bold uppercase tracking-[0.08em] text-[#737373]">
                    Exercícios adicionados
                  </span>
                  <span className="font-inter text-[12px] font-semibold text-[#FFD700]">{exerciseIds.length}</span>
                </div>
                {selectedExercises.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#2D2D2D] bg-[#101010] px-4 py-5 text-center font-inter text-[13px] text-[#737373]">
                    Adicione exercícios pelo catálogo abaixo.
                  </div>
                ) : (
                  <div className="grid max-h-[34vh] gap-2 overflow-y-auto pr-1 lg:max-h-[46vh]">
                    {selectedExercises.map((exercise, index) => (
                      <div key={`${exercise.id}-${index}`} className="flex items-center gap-3 rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(255,215,0,0.12)] font-montserrat text-[11px] font-bold text-[#FFD700]">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-inter text-[13px] font-semibold text-white">{exercise.name}</div>
                          <div className="font-inter text-[11px] text-[#737373]">{exercise.group}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExerciseIds((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          aria-label={`Remover ${exercise.name}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2D2D2D] text-[#A3A3A3]"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="grid gap-3">
              <label className="grid gap-2">
                <span className="font-montserrat text-[11px] font-bold uppercase tracking-[0.08em] text-[#737373]">Catálogo</span>
                <div className="flex h-12 items-center gap-2 rounded-2xl border border-[#2D2D2D] bg-[#101010] px-4 text-[#737373] focus-within:border-[#FFD700]">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar exercício"
                    className="min-w-0 flex-1 bg-transparent font-inter text-[14px] text-white outline-none placeholder:text-[#737373]"
                  />
                </div>
              </label>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-montserrat text-[11px] font-bold uppercase tracking-[0.08em] text-[#737373]">
                    Grupo muscular
                  </span>
                  {catalogMuscleGroupFilter && (
                    <button
                      type="button"
                      onClick={() => setCatalogMuscleGroupFilter(null)}
                      className="font-inter text-[12px] font-bold text-[#FFD700]"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {MUSCLE_GROUP_FILTER_OPTIONS.map((option) => (
                    <FilterPill<InventoryMuscleGroup | null>
                      key={option.label}
                      active={catalogMuscleGroupFilter === option.value}
                      label={option.label}
                      onClick={() => setCatalogMuscleGroupFilter(option.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid max-h-[44vh] gap-2 overflow-y-auto pr-1 lg:max-h-[58vh]">
                {filteredCatalog.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => setExerciseIds((current) => [...current, exercise.id])}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] px-3 py-3 text-left transition-colors hover:border-[#404040] hover:bg-[#202020]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(96,165,250,0.24)] bg-[rgba(96,165,250,0.1)] text-[#60A5FA]">
                      <Plus size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-inter text-[13px] font-semibold text-white">{exercise.name}</span>
                      <span className="block font-inter text-[11px] text-[#737373]">{exercise.group}</span>
                    </span>
                  </button>
                ))}
                {filteredCatalog.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#2D2D2D] bg-[#101010] px-4 py-5 text-center font-inter text-[13px] text-[#737373]">
                    Nenhum exercício disponível.
                  </div>
                )}
              </div>
            </section>
            {formError && <div className="font-inter text-[13px] text-[#FCA5A5] lg:col-span-2">{formError}</div>}
          </div>
        </div>

        <div className="shrink-0 border-t border-[#2D2D2D] bg-[#141414] px-4 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#FFD700] bg-[#FFD700] font-montserrat text-[12px] font-bold uppercase tracking-[0.04em] text-[#0A0A0A] disabled:border-[#2D2D2D] disabled:bg-[#1A1A1A] disabled:text-[#737373]"
          >
            <Check size={16} />
            {isSaving ? "Salvando..." : "Salvar template"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InventorySkeletonList() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} style={{ borderRadius: 16, border: "1px solid #2D2D2D", background: "#141414", padding: 18 }}>
          <div style={{ width: 104, height: 26, borderRadius: 999, background: "#232323" }} />
          <div style={{ marginTop: 16, width: "62%", height: 22, borderRadius: 8, background: "#232323" }} />
          <div style={{ marginTop: 8, width: "42%", height: 14, borderRadius: 8, background: "#1C1C1C" }} />
          <div style={{ marginTop: 18, width: "36%", height: 34, borderRadius: 8, background: "#232323" }} />
          <div style={{ marginTop: 18, width: "100%", height: 1, background: "#2D2D2D" }} />
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div style={{ width: "100%", height: 14, borderRadius: 8, background: "#1C1C1C" }} />
            <div style={{ width: "84%", height: 14, borderRadius: 8, background: "#1C1C1C" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function getActiveFilterLabels(filters: InventoryFilters) {
  const labels: string[] = [];
  if (filters.rarity) labels.push(RARITY_META[filters.rarity].label);
  if (filters.muscleGroup) labels.push(MUSCLE_GROUP_META[filters.muscleGroup].label);
  return labels;
}

export function InventoryView({
  cards,
  templates,
  catalog,
  filters,
  totalElements,
  isLoading,
  isLoadingMore,
  isLoadingTemplates,
  isSavingTemplate,
  hasMore,
  error,
  templatesError,
  onLoadMore,
  onRetry,
  onRetryTemplates,
  onResetFilters,
  onRarityChange,
  onMuscleGroupChange,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: {
  cards: InventoryCard[];
  templates: WorkoutTemplate[];
  catalog: ExerciseCatalogItem[];
  filters: InventoryFilters;
  totalElements: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  isLoadingTemplates: boolean;
  isSavingTemplate: boolean;
  hasMore: boolean;
  error: string | null;
  templatesError: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
  onRetryTemplates: () => void;
  onResetFilters: () => void;
  onRarityChange: (rarity: InventoryRarity | null) => void;
  onMuscleGroupChange: (muscleGroup: InventoryMuscleGroup | null) => void;
  onCreateTemplate: (input: { name: string; exerciseIds: string[] }) => Promise<WorkoutTemplate>;
  onUpdateTemplate: (templateId: string, input: { name: string; exerciseIds: string[] }) => Promise<WorkoutTemplate>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>("cards");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [templateFormMode, setTemplateFormMode] = useState<"create" | "edit">("create");
  const hasActiveFilters = filters.rarity !== null || filters.muscleGroup !== null;

  useEffect(() => {
    if (error || !hasMore || isLoading || isLoadingMore || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [error, hasMore, isLoading, isLoadingMore, onLoadMore]);

  function openCreateTemplate() {
    setSelectedTemplate(null);
    setTemplateFormMode("create");
    setTemplateFormOpen(true);
  }

  function openEditTemplate() {
    if (!selectedTemplate) return;
    setTemplateMenuOpen(false);
    setTemplateFormMode("edit");
    setTemplateFormOpen(true);
  }

  async function deleteSelectedTemplate() {
    if (!selectedTemplate) return;
    if (!window.confirm(`Excluir o template "${selectedTemplate.name}"?`)) return;

    try {
      await onDeleteTemplate(selectedTemplate.id);
      setTemplateMenuOpen(false);
      setSelectedTemplate(null);
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "Não foi possível excluir o template.");
    }
  }

  async function submitTemplate(input: { name: string; exerciseIds: string[] }) {
    if (templateFormMode === "edit" && selectedTemplate) {
      await onUpdateTemplate(selectedTemplate.id, input);
      return;
    }

    await onCreateTemplate(input);
  }

  return (
    <PageBackground>
      <IonGrid fixed className="relative z-10 px-3 pb-8 pt-5">
        <IonRow className="ion-justify-content-center">
          <IonCol size="12">
            <div>
              <header className="relative mb-6">
                <div className="pr-[58px]">
                  <h1 className="font-montserrat text-[34px] font-[800] leading-none text-white">
                    Inventário<span className="text-[#FFD700]">.</span>
                  </h1>
                </div>
                <p className="mt-2 max-w-[320px] font-inter text-[14px] leading-[1.45] text-[#A3A3A3]">
                  Acompanhe suas cartas e organize templates para começar o treino mais rápido.
                </p>
              </header>

              <nav
                className="mb-6 grid grid-cols-2 rounded-[18px] border border-[#2D2D2D] bg-[#141414] p-1.5"
                role="tablist"
                aria-label="Seções do inventário"
              >
                {[
                  { id: "cards" as const, label: "Cartas", icon: <Package2 size={15} /> },
                  { id: "templates" as const, label: "Templates", icon: <FolderKanban size={15} /> },
                ].map((tab) => {
                  const selected = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center justify-center gap-2 rounded-[13px] px-3 py-3 font-montserrat text-[12px] font-bold uppercase tracking-wide ${
                        selected ? "text-[#0A0A0A]" : "text-[#737373]"
                      }`}
                    >
                      {selected && (
                        <Motion.span
                          layoutId="inventory-tab-highlight"
                          className="absolute inset-0 rounded-[13px] bg-[#FFD700]"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {tab.icon}
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <AnimatePresence initial={false}>
                <Motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === "cards" ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === "cards" ? -12 : 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {activeTab === "cards" && (
                    <>
                  <FilterSection
                    filters={filters}
                    onResetFilters={onResetFilters}
                    onRarityChange={onRarityChange}
                    onMuscleGroupChange={onMuscleGroupChange}
                  />

                  <section className="mt-5 grid gap-4">
                    {isLoading && <InventorySkeletonList />}

                    {!isLoading && error && (
                      <div
                        style={{
                          borderRadius: 20,
                          border: "1px solid rgba(248,113,113,0.24)",
                          background: "rgba(38,16,16,0.5)",
                          padding: 18,
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
                          Falha ao carregar o inventário
                        </div>
                        <div style={{ marginTop: 8, fontFamily: "var(--font-inter)", fontSize: 14, color: "#FCA5A5" }}>{error}</div>
                        <button
                          type="button"
                          onClick={onRetry}
                          style={{
                            marginTop: 14,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            borderRadius: 999,
                            border: "1px solid rgba(255,215,0,0.28)",
                            background: "transparent",
                            color: "#FFD700",
                            padding: "10px 16px",
                            fontFamily: "var(--font-montserrat)",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          <RefreshCcw size={14} />
                          Tentar novamente
                        </button>
                      </div>
                    )}

                    {!isLoading && !error && cards.length === 0 && !hasActiveFilters && (
                      <EmptyState
                        title="Seu inventário ainda está vazio"
                        description="Finalize treinos para gerar cartas e começar a montar sua coleção."
                      />
                    )}

                    {!isLoading && !error && cards.length === 0 && hasActiveFilters && (
                      <EmptyState
                        title="Nenhuma carta encontrada"
                        description="Os filtros atuais não retornaram cartas. Ajuste a raridade ou o grupo muscular."
                        actionLabel="Limpar filtros"
                        onAction={onResetFilters}
                      />
                    )}

                    {!isLoading && !error && cards.length > 0 && cards.map((card) => <InventoryCardTile key={card.id} card={card} />)}

                    {!error && hasMore && <div ref={sentinelRef} style={{ padding: "8px 0", textAlign: "center", fontFamily: "var(--font-inter)", fontSize: 12, color: "#737373" }}>{isLoadingMore ? "Buscando mais cartas..." : ""}</div>}
                  </section>
                    </>
                  )}

                  {activeTab === "templates" && (
                <section className="grid gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FolderKanban size={14} color="#FFD700" />
                      <h2 className="font-montserrat text-[11px] font-bold uppercase tracking-[0.1em] text-[#737373]">
                        Templates salvos
                      </h2>
                      <span className="font-montserrat text-[14px] font-bold text-[#FFD700]">{templates.length}</span>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateTemplate}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-[rgba(255,215,0,0.32)] bg-[rgba(255,215,0,0.1)] text-[#FFD700] transition-colors"
                      aria-label="Criar novo template"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {isLoadingTemplates && <TemplateSkeletonList />}

                  {!isLoadingTemplates && templatesError && (
                    <div
                      style={{
                        borderRadius: 20,
                        border: "1px solid rgba(248,113,113,0.24)",
                        background: "rgba(38,16,16,0.5)",
                        padding: 18,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
                        Falha ao carregar templates
                      </div>
                      <div style={{ marginTop: 8, fontFamily: "var(--font-inter)", fontSize: 14, color: "#FCA5A5" }}>{templatesError}</div>
                      <button
                        type="button"
                        onClick={onRetryTemplates}
                        style={{
                          marginTop: 14,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          borderRadius: 999,
                          border: "1px solid rgba(255,215,0,0.28)",
                          background: "transparent",
                          color: "#FFD700",
                          padding: "10px 16px",
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <RefreshCcw size={14} />
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {!isLoadingTemplates && !templatesError && templates.length === 0 && (
                    <EmptyState
                      title="Nenhum template salvo"
                      description="Crie um treino pronto com qualquer quantidade de exercícios para usar no início do treino."
                      actionLabel="Novo template"
                      onAction={openCreateTemplate}
                    />
                  )}

                  {!isLoadingTemplates && !templatesError && templates.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      {templates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          catalog={catalog}
                          onOpenMenu={() => {
                            setSelectedTemplate(template);
                            setTemplateMenuOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
                  )}
                </Motion.div>
              </AnimatePresence>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
      <TemplateActionSheet
        template={selectedTemplate}
        open={templateMenuOpen}
        onOpenChange={setTemplateMenuOpen}
        onEdit={openEditTemplate}
        onDelete={() => { void deleteSelectedTemplate(); }}
        isSaving={isSavingTemplate}
      />
      <TemplateFormSheet
        mode={templateFormMode}
        open={templateFormOpen}
        catalog={catalog}
        template={selectedTemplate}
        isSaving={isSavingTemplate}
        onOpenChange={setTemplateFormOpen}
        onSubmit={submitTemplate}
      />
    </PageBackground>
  );
}
