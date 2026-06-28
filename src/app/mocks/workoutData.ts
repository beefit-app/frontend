import type { MuscleGroupOption } from "../types/workout";

export const GROUP_ORDER = ["Peito", "Costas", "Pernas", "Glúteos", "Ombros", "Braços", "Core", "Trapézio"] as const;

export const MUSCLE_GROUPS: MuscleGroupOption[] = [
  {
    id: "peito",
    label: "Peito",
    description: "Supinos e crucifixos com variações de empurrar.",
    accent: "#FFD700",
    glow: "rgba(255,215,0,0.2)",
  },
  {
    id: "costas",
    label: "Costas",
    description: "Puxadas e remadas com foco em dorsais.",
    accent: "#3B82F6",
    glow: "rgba(59,130,246,0.2)",
  },
  {
    id: "pernas",
    label: "Pernas",
    description: "Quadríceps e posterior com glúteos e panturrilhas.",
    accent: "#22C55E",
    glow: "rgba(34,197,94,0.2)",
  },
  {
    id: "gluteos",
    label: "Glúteos",
    description: "Movimentos focados em extensão de quadril e cadeia posterior.",
    accent: "#14B8A6",
    glow: "rgba(20,184,166,0.2)",
  },
  {
    id: "ombros",
    label: "Ombros",
    description: "Desenvolvimento e elevações com estabilidade.",
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.2)",
  },
  {
    id: "bracos",
    label: "Braços",
    description: "Bíceps e tríceps com antebraço no mesmo bloco.",
    accent: "#F97316",
    glow: "rgba(249,115,22,0.2)",
  },
  {
    id: "core",
    label: "Core",
    description: "Abdômen e lombar com estabilidade do tronco.",
    accent: "#EF4444",
    glow: "rgba(239,68,68,0.2)",
  },
  {
    id: "trapezio",
    label: "Trapézio",
    description: "Exercícios de elevação e estabilidade da cintura escapular.",
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.2)",
  },
];
