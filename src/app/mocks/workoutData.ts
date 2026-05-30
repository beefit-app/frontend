import type { ExerciseCatalogItem, MuscleGroupOption, WorkoutTemplate } from "../types/workout";

// Fonte temporária de dados de treino até a API assumir esse papel.
export const EXERCISES: ExerciseCatalogItem[] = [
  { id: "supino-reto", name: "Supino reto", group: "Peito", groupId: "peito", notes: "Press horizontal com barra.", lastPerformed: "Ontem", bestWeight: "84 kg", lastWeight: "78 kg" },
  { id: "supino-inclinado", name: "Supino inclinado", group: "Peito", groupId: "peito", notes: "Ênfase na parte superior do peitoral.", lastPerformed: "3 dias atrás", bestWeight: "70 kg", lastWeight: "64 kg" },
  { id: "puxada-frontal", name: "Puxada frontal", group: "Costas", groupId: "costas", notes: "Trabalho principal de dorsais.", lastPerformed: "Hoje", bestWeight: "72 kg", lastWeight: "68 kg" },
  { id: "remada-curvada", name: "Remada curvada", group: "Costas", groupId: "costas", notes: "Espessura e estabilidade.", lastPerformed: "5 dias atrás", bestWeight: "76 kg", lastWeight: "70 kg" },
  { id: "agachamento-livre", name: "Agachamento livre", group: "Pernas", groupId: "pernas", notes: "Base de força para lower body.", lastPerformed: "2 dias atrás", bestWeight: "120 kg", lastWeight: "110 kg" },
  { id: "leg-press", name: "Leg press", group: "Pernas", groupId: "pernas", notes: "Volume com apoio e estabilidade.", lastPerformed: "1 semana atrás", bestWeight: "240 kg", lastWeight: "220 kg" },
  { id: "desenvolvimento", name: "Desenvolvimento militar", group: "Ombros", groupId: "ombros", notes: "Press vertical principal.", lastPerformed: "4 dias atrás", bestWeight: "46 kg", lastWeight: "42 kg" },
  { id: "elevacao-lateral", name: "Elevação lateral", group: "Ombros", groupId: "ombros", notes: "Ênfase em deltoide médio.", lastPerformed: "Hoje", bestWeight: "16 kg", lastWeight: "14 kg" },
  { id: "rosca-direta", name: "Rosca direta", group: "Braços", groupId: "bracos", notes: "Progressão de bíceps.", lastPerformed: "Ontem", bestWeight: "38 kg", lastWeight: "34 kg" },
  { id: "triceps-corda", name: "Tríceps corda", group: "Braços", groupId: "bracos", notes: "Extensão controlada na polia.", lastPerformed: "3 dias atrás", bestWeight: "42 kg", lastWeight: "36 kg" },
  { id: "abdominal-cabo", name: "Abdominal no cabo", group: "Core", groupId: "core", notes: "Flexão com sobrecarga.", lastPerformed: "Hoje", bestWeight: "52 kg", lastWeight: "48 kg" },
  { id: "prancha", name: "Prancha", group: "Core", groupId: "core", notes: "Estabilidade de tronco.", lastPerformed: "2 dias atrás", bestWeight: "2m 10s", lastWeight: "1m 45s" },
];

export const GROUP_ORDER = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"] as const;

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
];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "upper-a",
    name: "Upper A",
    groups: ["Peito", "Costas", "Ombros"],
    duration: "55 min",
    exercises: 6,
    exerciseIds: [
      "supino-reto",
      "supino-inclinado",
      "puxada-frontal",
      "remada-curvada",
      "desenvolvimento",
      "elevacao-lateral",
    ],
  },
  {
    id: "push",
    name: "Push Clássico",
    groups: ["Peito", "Ombros", "Braços"],
    duration: "48 min",
    exercises: 6,
    exerciseIds: [
      "supino-reto",
      "supino-inclinado",
      "desenvolvimento",
      "elevacao-lateral",
      "triceps-corda",
      "rosca-direta",
    ],
  },
  {
    id: "legs",
    name: "Leg Day",
    groups: ["Pernas", "Core"],
    duration: "1h 05min",
    exercises: 4,
    exerciseIds: [
      "agachamento-livre",
      "leg-press",
      "abdominal-cabo",
      "prancha",
    ],
  },
];
