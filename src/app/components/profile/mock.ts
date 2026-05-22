import type { AccountSettingsData, ProfileData, WorkoutPost } from "./types";

export const DEFAULT_PROFILE: ProfileData = {
  displayName: "Alex Ferreira",
  username: "@alexfit",
  bio: "Entusiasta de musculação e calistenia 🏋️‍♂️ | Treinando há 3 anos | Rumo ao físico dos sonhos!",
  cards: 47,
  streak: 15,
  totalWorkouts: 312,
  weight: 82.5,
  avatarUrl: null,
};

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettingsData = {
  ghostModeEnabled: false,
};

export const TRAINED_DAYS: number[] = [1, 3, 5, 6, 8, 10, 12, 13, 15];

export const MOCK_POSTS: WorkoutPost[] = [
  {
    id: 1,
    date: "Hoje · 15 Mai",
    title: "Peito & Tríceps",
    duration: "58 min",
    rarity: "epica",
    muscles: ["Peitoral", "Tríceps", "Ombro"],
    emoji: "💪",
    photoUrl: null,
    likes: 24,
    liked: false,
    templateSaved: false,
    comments: [
      { id: 1, author: "Rafa", text: "Supino reto muito sólido.", timeAgo: "12 min" },
      { id: 2, author: "Bianca", text: "Esse treino de tríceps ficou bom demais.", timeAgo: "7 min" },
    ],
    exerciseDetails: [
      { name: "Supino Reto", sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 75, reps: 10 }] },
      { name: "Supino Inclinado", sets: [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 65, reps: 10 }] },
      { name: "Crucifixo", sets: [{ weight: 14, reps: 12 }, { weight: 14, reps: 12 }, { weight: 12, reps: 15 }] },
      { name: "Tríceps Pulley", sets: [{ weight: 32, reps: 12 }, { weight: 32, reps: 12 }, { weight: 30, reps: 15 }] },
      { name: "Tríceps Testa", sets: [{ weight: 20, reps: 10 }, { weight: 20, reps: 10 }, { weight: 18, reps: 12 }] },
      { name: "Dips", sets: [{ weight: 0, reps: 12 }, { weight: 0, reps: 12 }, { weight: 0, reps: 10 }] },
    ],
  },
  {
    id: 2,
    date: "13 Mai",
    title: "Pernas Completo",
    duration: "1h 12min",
    rarity: "lendaria",
    muscles: ["Quadríceps", "Posterior", "Glúteo"],
    emoji: "🦵",
    photoUrl: null,
    likes: 41,
    liked: true,
    templateSaved: false,
    comments: [
      { id: 1, author: "Marina", text: "Leg press absurdo.", timeAgo: "1 d" },
      { id: 2, author: "João", text: "Vou copiar esse treino de pernas.", timeAgo: "1 d" },
      { id: 3, author: "Rafa", text: "Panturrilha no fim é sofrimento.", timeAgo: "1 d" },
    ],
    exerciseDetails: [
      { name: "Agachamento Livre", sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
      { name: "Leg Press 45°", sets: [{ weight: 180, reps: 10 }, { weight: 180, reps: 10 }, { weight: 160, reps: 12 }], isPersonalRecord: true },
      { name: "Extensora", sets: [{ weight: 60, reps: 12 }, { weight: 60, reps: 12 }, { weight: 55, reps: 15 }] },
      { name: "Mesa Flexora", sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 45, reps: 12 }] },
      { name: "Stiff", sets: [{ weight: 70, reps: 10 }, { weight: 70, reps: 10 }, { weight: 65, reps: 12 }] },
      { name: "Panturrilha", sets: [{ weight: 80, reps: 15 }, { weight: 80, reps: 15 }, { weight: 80, reps: 15 }] },
      { name: "Abdução", sets: [{ weight: 40, reps: 15 }, { weight: 40, reps: 15 }] },
      { name: "Glúteo Cabo", sets: [{ weight: 20, reps: 15 }, { weight: 20, reps: 15 }, { weight: 18, reps: 15 }] },
    ],
  },
  {
    id: 3,
    date: "12 Mai",
    title: "Costas & Bíceps",
    duration: "52 min",
    rarity: "rara",
    muscles: ["Dorsais", "Bíceps", "Trapézio"],
    emoji: "🏋️",
    photoUrl: null,
    likes: 19,
    liked: false,
    templateSaved: true,
    comments: [
      { id: 1, author: "Bianca", text: "Remada cavalinho pesada.", timeAgo: "2 d" },
      { id: 2, author: "Marina", text: "Costas e bíceps redondo.", timeAgo: "2 d" },
    ],
    exerciseDetails: [
      { name: "Puxada Aberta", sets: [{ weight: 70, reps: 10 }, { weight: 70, reps: 10 }, { weight: 65, reps: 12 }] },
      { name: "Remada Curvada", sets: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 75, reps: 10 }] },
      { name: "Remada Cavalinho", sets: [{ weight: 100, reps: 8 }, { weight: 100, reps: 8 }] },
      { name: "Rosca Direta", sets: [{ weight: 40, reps: 10 }, { weight: 40, reps: 10 }, { weight: 38, reps: 12 }] },
      { name: "Rosca Martelo", sets: [{ weight: 16, reps: 12 }, { weight: 16, reps: 12 }, { weight: 14, reps: 15 }] },
    ],
  },
  {
    id: 4,
    date: "10 Mai",
    title: "Cardio HIIT",
    duration: "35 min",
    rarity: "comum",
    muscles: ["Full Body", "Core"],
    emoji: "🔥",
    photoUrl: null,
    likes: 9,
    liked: false,
    templateSaved: false,
    comments: [{ id: 1, author: "Rafa", text: "HIIT de respeito.", timeAgo: "4 d" }],
    exerciseDetails: [
      { name: "Burpees", sets: [{ weight: 0, reps: 15 }, { weight: 0, reps: 15 }, { weight: 0, reps: 12 }] },
      { name: "Mountain Climber", sets: [{ weight: 0, reps: 30 }, { weight: 0, reps: 30 }, { weight: 0, reps: 30 }] },
      { name: "Jumping Jack", sets: [{ weight: 0, reps: 50 }, { weight: 0, reps: 50 }] },
      { name: "Prancha", sets: [{ weight: 0, reps: 60 }, { weight: 0, reps: 45 }] },
    ],
  },
];
