import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { Filter, Package2, RefreshCcw, Star, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useState } from "react";
import { HexagonPattern } from "../../HexagonPattern";
import {
  HEX_CLIP,
  MUSCLE_GROUP_FILTER_OPTIONS,
  MUSCLE_GROUP_META,
  RARITY_FILTER_OPTIONS,
  RARITY_META,
} from "../constants";
import type { InventoryCard, InventoryFilters, InventoryMuscleGroup, InventoryRarity } from "../types";

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
  const rarity = RARITY_META[card.rarity];
  const muscle = MUSCLE_GROUP_META[card.muscleGroup];

  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        border: `2px solid ${rarity.border}`,
        background: rarity.background,
        padding: 18,
        boxShadow: rarity.shadow,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -18,
          right: -14,
          width: 100,
          height: 116,
          opacity: card.rarity === "LEGENDARY" ? 0.1 : 0.06,
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
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 50,
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
              <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 18, fontWeight: 700, color: "#FFFFFF" }}>
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

          <div style={{ marginTop: 16, borderTop: "1px solid #2D2D2D", paddingTop: 12, display: "grid", gap: 6 }}>
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
          aria-hidden="true"
          style={{
            width: 70,
            alignSelf: "stretch",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 34, height: 38, clipPath: HEX_CLIP, background: "#2D2D2D" }} />
          <div style={{ width: 44, height: 48, clipPath: HEX_CLIP, background: rarity.badgeBackground, border: `1px solid ${rarity.border}` }} />
          <div style={{ width: 34, height: 38, clipPath: HEX_CLIP, background: rarity.badgeBackground, border: `1px solid ${rarity.border}` }} />
        </div>
      </div>
    </article>
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
  filters,
  totalElements,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  onLoadMore,
  onRetry,
  onResetFilters,
  onRarityChange,
  onMuscleGroupChange,
}: {
  cards: InventoryCard[];
  filters: InventoryFilters;
  totalElements: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
  onResetFilters: () => void;
  onRarityChange: (rarity: InventoryRarity | null) => void;
  onMuscleGroupChange: (muscleGroup: InventoryMuscleGroup | null) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0A] pb-8">
      <HexagonPattern />
      <div
        style={{
          position: "absolute",
          top: -180,
          left: 0,
          right: 0,
          height: 540,
          background: "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />
      <IonGrid fixed className="relative z-10 px-3 py-5">
        <IonRow className="ion-justify-content-center">
          <IonCol size="12" style={{ maxWidth: 393 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <header style={{ paddingTop: 0 }}>
                <div>
                  <h1 className="font-montserrat text-[34px] font-[800] leading-none text-white">
                    Inventário
                    <span style={{ color: "#FFD700" }}>.</span>
                  </h1>
                  <p style={{ marginTop: 8, fontFamily: "var(--font-inter)", fontSize: 14, lineHeight: 1.45, color: "#A3A3A3" }}>
                    Acompanhe suas cartas conquistadas e refine a coleção por raridade e grupo muscular.
                  </p>
                </div>
              </header>

              <FilterSection
                filters={filters}
                onResetFilters={onResetFilters}
                onRarityChange={onRarityChange}
                onMuscleGroupChange={onMuscleGroupChange}
              />

              <section style={{ display: "grid", gap: 16 }}>
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

                {!isLoading && !error && !hasMore && cards.length > 0 && (
                  <div
                    style={{
                      borderRadius: 20,
                      border: "1px dashed rgba(255,215,0,0.22)",
                      padding: "16px 18px",
                      textAlign: "center",
                      fontFamily: "var(--font-inter)",
                      fontSize: 13,
                      color: "#B8A65A",
                    }}
                  >
                    Você chegou ao fim das cartas disponíveis com os filtros atuais.
                  </div>
                )}
              </section>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
}
