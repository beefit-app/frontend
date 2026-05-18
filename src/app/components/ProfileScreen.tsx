import { useState, useRef } from "react";
import {
  IonCol,
  IonGrid,
  IonTextarea,
  IonItem,
  IonRow,
} from "@ionic/react";
import { motion as Motion } from "motion/react";
import {
  Bookmark,
  Camera,
  Edit2,
  Flame,
  Dumbbell,
  Scale,
  ShieldCheck,
  Clock,
  ChevronRight,
  ChevronLeft,
  Heart,
  ImageIcon,
  MessageCircle,
} from "lucide-react";
import { BeeCard } from "./BeeCard";
import { BeeButton } from "./BeeButton";
import { BeeInput } from "./BeeInput";
import { HexagonPattern } from "./HexagonPattern";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  displayName: string;
  username: string;
  bio: string;
  cards: number;
  streak: number;
  totalWorkouts: number;
  weight: number;
  avatarUrl: string | null;
}

type Rarity = "lendaria" | "epica" | "rara" | "comum";

interface ExerciseSet {
  weight: number;
  reps: number;
}

interface ExerciseDetail {
  name: string;
  sets: ExerciseSet[];
}

interface Comment {
  id: number;
  author: string;
  text: string;
  timeAgo: string;
}

interface WorkoutPost {
  id: number;
  date: string;
  title: string;
  duration: string;
  rarity: Rarity;
  muscles: string[];
  emoji: string;
  photoUrl: string | null;
  exerciseDetails: ExerciseDetail[];
  likes: number;
  liked: boolean;
  templateSaved: boolean;
  comments: Comment[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: ProfileData = {
  displayName: "Alex Ferreira",
  username: "@alexfit",
  bio: "Entusiasta de musculação e calistenia 🏋️‍♂️ | Treinando há 3 anos | Rumo ao físico dos sonhos!",
  cards: 47,
  streak: 15,
  totalWorkouts: 312,
  weight: 82.5,
  avatarUrl: null,
};

const TRAINED_DAYS: number[] = [1, 3, 5, 6, 8, 10, 12, 13, 15];

const MOCK_POSTS: WorkoutPost[] = [
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
      { name: "Leg Press 45°", sets: [{ weight: 180, reps: 10 }, { weight: 180, reps: 10 }, { weight: 160, reps: 12 }] },
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
    comments: [
      { id: 1, author: "Rafa", text: "HIIT de respeito.", timeAgo: "4 d" },
    ],
    exerciseDetails: [
      { name: "Burpees", sets: [{ weight: 0, reps: 15 }, { weight: 0, reps: 15 }, { weight: 0, reps: 12 }] },
      { name: "Mountain Climber", sets: [{ weight: 0, reps: 30 }, { weight: 0, reps: 30 }, { weight: 0, reps: 30 }] },
      { name: "Jumping Jack", sets: [{ weight: 0, reps: 50 }, { weight: 0, reps: 50 }] },
      { name: "Prancha", sets: [{ weight: 0, reps: 60 }, { weight: 0, reps: 45 }] },
    ],
  },
];

const RARITY_STYLE: Record<Rarity, { bg: string; border: string; text: string; label: string; glow: string }> = {
  lendaria: { bg: "rgba(255,215,0,0.12)", border: "#FFD700", text: "#FFE44D", label: "🟡 Lendária", glow: "rgba(255,215,0,0.25)" },
  epica:    { bg: "rgba(168,85,247,0.12)", border: "#A855F7", text: "#C084FC", label: "🟣 Épica",    glow: "rgba(168,85,247,0.25)" },
  rara:     { bg: "rgba(59,130,246,0.12)",  border: "#3B82F6", text: "#60A5FA", label: "🔵 Rara",     glow: "rgba(59,130,246,0.25)"  },
  comum:    { bg: "rgba(115,115,115,0.12)", border: "#737373", text: "#A3A3A3", label: "⚪ Comum",    glow: "rgba(115,115,115,0.2)"  },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const TOOLBAR_STYLE = {
  "--background": "#0A0A0A",
  "--border-color": "#2D2D2D",
  "--color": "#ffffff",
  "--min-height": "56px",
} as React.CSSProperties;

const TITLE_STYLE = {
  fontFamily: "var(--font-montserrat)",
  fontSize: "17px",
  fontWeight: 700,
  color: "#ffffff",
} as React.CSSProperties;

const MONTH_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_LABELS = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

// ─── Small shared components ──────────────────────────────────────────────────

function HexAvatar({ src, initials, size = 96 }: { src?: string | null; initials: string; size?: number }) {
  const outer = size + 6;
  return (
    <div style={{ width: outer, height: Math.round(outer * 1.155), clipPath: HEX_CLIP, background: "#FFD700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <div style={{ width: size, height: Math.round(size * 1.155), clipPath: HEX_CLIP, background: src ? undefined : "#2D2D2D", backgroundImage: src ? `url(${src})` : undefined, backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!src && (
          <span style={{ fontFamily: "var(--font-montserrat)", fontSize: Math.round(size * 0.32), fontWeight: 800, color: "#FFD700" }}>
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "#2D2D2D" }} />
      <div style={{ width: 9, height: 10, clipPath: HEX_CLIP, background: "#FFD700" }} />
      <div style={{ flex: 1, height: 1, background: "#2D2D2D" }} />
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      {icon}
      <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div style={{ background: "#1A1A1A", border: "1px solid #2D2D2D", borderRadius: 14, padding: "16px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
      <div style={{ color }}>{icon}</div>
      <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 20, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>{value}</span>
      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
}

function RarityTag({ rarity }: { rarity: Rarity }) {
  const r = RARITY_STYLE[rarity];
  return (
    <span style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 100, padding: "3px 10px", fontFamily: "var(--font-inter)", fontSize: 10, fontWeight: 700, color: r.text, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
      {r.label}
    </span>
  );
}

// ─── Training Calendar ────────────────────────────────────────────────────────

function TrainingCalendar({ trainedDays }: { trainedDays: number[] }) {
  const today = new Date(2026, 4, 15);
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const offset = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel icon={<ShieldCheck size={13} color="#FFD700" />} label="Frequência" />
        <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 600, color: "#FFD700" }}>
          {MONTH_PT[month]} {year}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 9, fontWeight: 600, color: "#404040", textTransform: "uppercase", letterSpacing: "0.04em" }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const trained = trainedDays.includes(day);
          const isToday = day === todayDate;
          const isFuture = day > todayDate;
          return (
            <div key={day} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 38 }}>
              {trained ? (
                <div style={{ width: 30, height: 34, clipPath: HEX_CLIP, background: "#FFD700", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(255,215,0,0.35)" }}>
                  <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 10, fontWeight: 800, color: "#0A0A0A", lineHeight: 1 }}>{day}</span>
                </div>
              ) : (
                <div style={{ width: 30, height: 34, clipPath: HEX_CLIP, background: isToday ? "rgba(255,215,0,0.08)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#FFD700" : isFuture ? "#2D2D2D" : "#737373", lineHeight: 1 }}>
                    {day}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 11, clipPath: HEX_CLIP, background: "#FFD700" }} />
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373" }}>Treinou</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 11, clipPath: HEX_CLIP, background: "#2D2D2D" }} />
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373" }}>Descansou</span>
        </div>
      </div>
    </div>
  );
}

// ─── Workout Post Card ────────────────────────────────────────────────────────

function WorkoutPostCard({ post, profile }: { post: WorkoutPost; profile: ProfileData }) {
  const [showExercises, setShowExercises] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [templateSaved, setTemplateSaved] = useState(post.templateSaved);
  const [showComments, setShowComments] = useState(false);
  const touchStartX = useRef(0);
  const r = RARITY_STYLE[post.rarity];
  const initials = profile.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  function toggleLike() {
    setLiked((current) => {
      setLikes((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
    },
    onMouseDown: (e: React.MouseEvent) => { touchStartX.current = e.clientX; },
    onMouseUp: (e: React.MouseEvent) => {
      const diff = e.clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
    },
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${showExercises ? r.border : "#2D2D2D"}`,
        background: "#1A1A1A",
        transition: "border-color 0.3s",
        boxShadow: showExercises ? `0 4px 20px ${r.glow}` : "none",
        position: "relative",
      }}
    >
      {/* ── Sliding panels container ── */}
      <div style={{ overflow: "hidden" }}>
        <Motion.div
          animate={{ x: showExercises ? "-50%" : "0%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{ display: "flex", width: "200%", touchAction: "pan-y", cursor: "grab" }}
          {...swipeHandlers}
        >

          {/* ─ Panel 1 — Main ─────────────────────────────────────── */}
          <div style={{ width: "50%", position: "relative", height: 340 }}>

            {/* Photo fills entire panel */}
            {post.photoUrl ? (
              <img src={post.photoUrl} alt="Foto do treino" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(160deg, #161616 0%, #0F0F0F 100%)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1E1E1E", border: "1px dashed #2D2D2D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={24} color="#404040" />
                </div>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#3A3A3A", fontWeight: 500 }}>Foto do treino</span>
              </div>
            )}

            {/* Strong gradient overlay at bottom */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", background: "linear-gradient(to top, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.75) 50%, transparent 100%)", pointerEvents: "none" }} />

            {/* Rarity tag — top right only */}
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <RarityTag rarity={post.rarity} />
            </div>

            {/* All info at the bottom */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 14px 28px", display: "flex", flexDirection: "column", gap: 8 }}>

              {/* Author row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HexAvatar src={profile.avatarUrl} initials={initials} size={26} />
                  <div>
                    <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, fontWeight: 700, color: "#ffffff", display: "block" }}>
                      {profile.displayName}
                    </span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{post.date}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowExercises(true)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 10px" }}
                >
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Exercícios</span>
                  <ChevronRight size={11} color="rgba(255,255,255,0.45)" />
                </button>
              </div>

              {/* Workout title + stats */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(26,26,26,0.8)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {post.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 16, fontWeight: 700, color: "#ffffff", display: "block", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                    {post.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={10} color="rgba(255,255,255,0.45)" />
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{post.duration}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Dumbbell size={10} color="rgba(255,255,255,0.45)" />
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{post.exerciseDetails.length} exercícios</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Muscle chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {post.muscles.map((m) => (
                  <span key={m} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "3px 9px", fontFamily: "var(--font-inter)", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ─ Panel 2 — Exercises ────────────────────────────────── */}
          <div style={{ width: "50%", display: "flex", flexDirection: "column", height: 340 }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 14px 10px", borderBottom: "1px solid #2D2D2D", flexShrink: 0 }}>
              <button
                onClick={() => setShowExercises(false)}
                style={{ background: "#2D2D2D", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <ChevronLeft size={15} color="#A3A3A3" />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 700, color: "#ffffff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.title}
                </span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373" }}>
                  {post.exerciseDetails.length} exercícios · {post.duration}
                </span>
              </div>
              <RarityTag rarity={post.rarity} />
            </div>

            {/* Exercise list */}
            <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
              {post.exerciseDetails.map((ex, idx) => (
                <div
                  key={ex.name}
                  style={{
                    padding: "11px 0",
                    borderBottom: idx < post.exerciseDetails.length - 1 ? "1px solid #222" : "none",
                  }}
                >
                  {/* Exercise name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                    <div style={{ width: 6, height: 7, clipPath: HEX_CLIP, background: r.border, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
                      {ex.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", marginLeft: "auto", flexShrink: 0 }}>
                      {ex.sets.length} séries
                    </span>
                  </div>

                  {/* Sets row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 13 }}>
                    {ex.sets.map((set, si) => (
                      <div
                        key={si}
                        style={{
                          background: "#252525",
                          border: `1px solid #333`,
                          borderRadius: 7,
                          padding: "4px 9px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 1,
                          minWidth: 48,
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 800, color: r.text, lineHeight: 1 }}>
                          {set.weight > 0 ? `${set.weight}kg` : "PC"}
                        </span>
                        <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", lineHeight: 1 }}>
                          × {set.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </Motion.div>
      </div>

      {/* ── Panel indicator dots — absolute overlay, no bar ── */}
      <div
        style={{
          position: "absolute",
          top: 321,
          right: 14,
          display: "flex",
          alignItems: "center",
          gap: 5,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div style={{ width: showExercises ? 6 : 14, height: 5, borderRadius: 3, background: showExercises ? "rgba(255,255,255,0.2)" : "#FFD700", transition: "width 0.3s, background 0.3s" }} />
        <div style={{ width: showExercises ? 14 : 6, height: 5, borderRadius: 3, background: showExercises ? r.border : "rgba(255,255,255,0.2)", transition: "width 0.3s, background 0.3s" }} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#2D2D2D] bg-[#151515] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Motion.button
            type="button"
            onClick={toggleLike}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={liked ? "Descurtir treino" : "Curtir treino"}
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: liked ? "#FFD700" : "#404040",
              background: liked ? "rgba(255,215,0,0.12)" : "#1A1A1A",
              color: liked ? "#FFD700" : "#A3A3A3",
            }}
          >
            <Heart size={18} fill={liked ? "#FFD700" : "none"} />
          </Motion.button>
          <Motion.button
            type="button"
            onClick={() => setShowComments((current) => !current)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={showComments ? "Ocultar comentários" : "Ver comentários"}
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: showComments ? "#FFD700" : "#404040",
              background: showComments ? "rgba(255,215,0,0.12)" : "#1A1A1A",
              color: showComments ? "#FFD700" : "#A3A3A3",
            }}
          >
            <MessageCircle size={18} fill={showComments ? "rgba(255,215,0,0.18)" : "none"} />
          </Motion.button>
          <Motion.button
            type="button"
            onClick={() => setTemplateSaved((current) => !current)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={templateSaved ? "Remover template salvo" : "Salvar template"}
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: templateSaved ? "#A3A3A3" : "#404040",
              background: templateSaved ? "rgba(163,163,163,0.14)" : "#1A1A1A",
              color: templateSaved ? "#D4D4D4" : "#A3A3A3",
            }}
          >
            <Bookmark size={18} fill={templateSaved ? "#D4D4D4" : "none"} />
          </Motion.button>
        </div>

        <div className="flex items-center gap-3 font-inter text-[11px] font-semibold text-[#737373]">
          <span>{likes} curtidas</span>
          <button
            type="button"
            onClick={() => setShowComments((current) => !current)}
            className="font-inter text-[11px] font-semibold text-[#A3A3A3]"
          >
            {post.comments.length} comentários
          </button>
        </div>
      </div>

      {showComments && (
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.18 }}
          className="border-t border-[#2D2D2D] bg-[#101010] px-4 py-3"
        >
          <div className="flex flex-col gap-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#404040] bg-[#1A1A1A] font-montserrat text-[10px] font-bold text-[#FFD700]">
                  {comment.author.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-inter text-[12px] leading-snug text-[#D4D4D4]">
                    <span className="font-semibold text-white">{comment.author}</span>{" "}
                    {comment.text}
                  </p>
                  <p className="mt-1 font-inter text-[10px] font-medium text-[#737373]">{comment.timeAgo}</p>
                </div>
              </div>
            ))}
          </div>
        </Motion.div>
      )}
    </Motion.div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────

function ProfileView({ profile, onEdit }: { profile: ProfileData; onEdit: () => void }) {
  const initials = profile.displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <IonGrid fixed style={{ maxWidth: 393, position: "relative", padding: "0 0 32px" }}>
      <IonRow className="ion-justify-content-center">
        <IonCol size="12">
    <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            <HexagonPattern />
          </div>
          <div style={{ position: "absolute", top: -180, left: 0, right: 0, height: 540, background: "linear-gradient(180deg, rgba(255,215,0,0.07) 0%, transparent 100%)", pointerEvents: "none" }} />

          {/* Edit button — top right of content */}
          <button
            onClick={onEdit}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
              background: "#1A1A1A",
              border: "1px solid #404040",
              borderRadius: "50%",
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Edit2 size={17} color="#FFD700" />
          </button>

          <div style={{ position: "relative", zIndex: 1, padding: "32px 12px 0" }}>
            {/* Avatar + identity */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <HexAvatar src={profile.avatarUrl} initials={initials} size={96} />
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700, color: "#ffffff", margin: "0 0 4px" }}>
                  {profile.displayName}
                </h1>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#737373", fontWeight: 500 }}>
                  {profile.username}
                </span>
              </div>
              {profile.bio && (
                <p style={{ fontFamily: "var(--font-inter)", fontSize: 13, color: "#D4D4D4", textAlign: "center", lineHeight: 1.65, margin: 0, maxWidth: 300 }}>
                  {profile.bio}
                </p>
              )}
            </div>

            <GoldDivider />

            {/* Stats */}
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <SectionLabel icon={<ShieldCheck size={13} color="#FFD700" />} label="Estatísticas" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <StatCard icon={<Scale size={20} />} value={`${profile.weight}kg`} label="Peso" color="#FFD700" />
                <StatCard icon={<span style={{ fontSize: 20, lineHeight: 1 }}>🃏</span>} value={profile.cards} label="Cartas" color="#A855F7" />
                <StatCard icon={<Flame size={20} />} value={`${profile.streak}d`} label="Ofensiva" color="#F97316" />
                <StatCard icon={<Dumbbell size={20} />} value={profile.totalWorkouts} label="Treinos" color="#22C55E" />
              </div>
            </div>

            <GoldDivider />

            {/* Calendar */}
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <BeeCard hover={false}>
                <TrainingCalendar trainedDays={TRAINED_DAYS} />
              </BeeCard>
            </div>

            <GoldDivider />

            {/* Workout posts */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionLabel icon={<Dumbbell size={13} color="#FFD700" />} label="Treinos Recentes" />
                <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, padding: 0 }}>
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#737373" }}>Ver todos</span>
                  <ChevronRight size={12} color="#737373" />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {MOCK_POSTS.map((post) => (
                  <WorkoutPostCard key={post.id} post={post} profile={profile} />
                ))}
              </div>
            </div>
          </div>
    </div>
        </IonCol>
      </IonRow>
    </IonGrid>
  );
}

// ─── Bee Textarea ─────────────────────────────────────────────────────────────

function BeeTextarea({ label, value, onChange, placeholder, error }: {
  label?: string; value: string; onChange: (val: string) => void; placeholder?: string; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#EF4444" : focused ? "#FFD700" : "#404040";
  const shadow = error ? "0 0 0 3px rgba(239,68,68,0.1)" : focused ? "0 0 0 3px rgba(255,215,0,0.1)" : "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {label && (
        <label style={{ fontFamily: "var(--font-montserrat)", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#D4D4D4" }}>
          {label}
        </label>
      )}
      <IonItem lines="none" style={{ "--background": "#1A1A1A", "--border-radius": "12px", "--border-color": borderColor, "--border-width": "2px", "--border-style": "solid", "--color": "#ffffff", "--placeholder-color": "#737373", "--inner-padding-end": "0", "--padding-start": "0", "--padding-end": "0", "--min-height": "unset", borderRadius: "12px", boxShadow: shadow, transition: "box-shadow 0.2s, border-color 0.2s" } as React.CSSProperties}>
        <IonTextarea value={value} placeholder={placeholder} rows={4} autoGrow={false} onIonChange={(e) => onChange(e.detail.value ?? "")} onIonFocus={() => setFocused(true)} onIonBlur={() => setFocused(false)} style={{ "--color": "#ffffff", "--placeholder-color": "#737373", "--placeholder-opacity": 1, "--background": "transparent", "--padding-start": "16px", "--padding-end": "16px", "--padding-top": "14px", "--padding-bottom": "14px", fontFamily: "var(--font-inter)", fontSize: "15px" } as React.CSSProperties} />
      </IonItem>
      {error && <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#EF4444", fontWeight: 500 }}>{error}</span>}
    </div>
  );
}

// ─── Profile Edit ─────────────────────────────────────────────────────────────

function ProfileEdit({ profile, onSave, onCancel }: {
  profile: ProfileData; onSave: (data: Partial<ProfileData>) => void; onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [weight, setWeight] = useState(String(profile.weight));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "Nome é obrigatório";
    if (displayName.trim().length > 40) e.displayName = "Máximo 40 caracteres";
    if (bio.length > 200) e.bio = "Máximo 200 caracteres";
    const w = parseFloat(weight);
    if (weight && (isNaN(w) || w < 30 || w > 300)) e.weight = "Peso inválido (30–300 kg)";
    return e;
  }

  function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ displayName: displayName.trim(), bio, weight: parseFloat(weight) || profile.weight, avatarUrl });
  }

  const initials = displayName.trim().split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";
  const bioLeft = 200 - bio.length;

  return (
    <div style={{ position: "relative", minHeight: "100%", overflow: "hidden", background: "#0A0A0A" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <HexagonPattern />
      </div>
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
    <IonGrid fixed style={{ maxWidth: 393, padding: "20px 0 40px", position: "relative", zIndex: 1 }}>
      <IonRow className="ion-justify-content-center">
        <IonCol size="12">
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "12px 12px 0" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative" }}>
              <HexAvatar src={avatarUrl} initials={initials} size={96} />
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarUrl(URL.createObjectURL(f)); }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ position: "absolute", bottom: 2, right: -8, background: "#FFD700", border: "2px solid #0A0A0A", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Camera size={14} color="#0A0A0A" />
              </button>
            </div>
          </div>

          <BeeCard hover={false}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <BeeInput label="Nome de Exibição" value={displayName} placeholder="Seu nome público" onChange={(e) => { setDisplayName(e.target.value); setErrors((p) => ({ ...p, displayName: "" })); }} error={errors.displayName} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <BeeTextarea label="Biografia" value={bio} placeholder="Conte algo sobre você..." onChange={(val) => { if (val.length <= 200) { setBio(val); setErrors((p) => ({ ...p, bio: "" })); } }} error={errors.bio} />
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: bioLeft < 20 ? "#F97316" : "#737373", textAlign: "right" }}>{bioLeft} restantes</span>
              </div>
              <BeeInput label="Peso Atual (kg)" value={weight} type="number" placeholder="Ex: 82.5" min="30" max="300" step="0.1" onChange={(e) => { setWeight(e.target.value); setErrors((p) => ({ ...p, weight: "" })); }} error={errors.weight} icon={<Scale size={18} />} />
            </div>
          </BeeCard>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <BeeButton variant="primary" fullWidth onClick={handleSave}>Salvar Alterações</BeeButton>
            <BeeButton variant="dark" fullWidth onClick={onCancel}>Cancelar</BeeButton>
          </div>
    </div>
        </IonCol>
      </IonRow>
    </IonGrid>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return <ProfileEdit profile={profile} onSave={(data) => { setProfile((p) => ({ ...p, ...data })); setIsEditing(false); }} onCancel={() => setIsEditing(false)} />;
  }

  return <ProfileView profile={profile} onEdit={() => setIsEditing(true)} />;
}
