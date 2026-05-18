import { type MouseEvent, type TouchEvent, useEffect, useRef, useState } from "react";
import { IonCol, IonGrid, IonRow } from "@ionic/react";
import { motion as Motion } from "motion/react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Heart,
  ImageIcon,
  MessageCircle,
  Radio,
} from "lucide-react";
import { HexagonPattern } from "./HexagonPattern";

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
  author: string;
  username: string;
  initials: string;
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

interface LiveFriend {
  id: number;
  name: string;
  initials: string;
  photoUrl: string | null;
  groups: string[];
  elapsedSeconds: number;
}

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const RARITY_STYLE: Record<Rarity, { bg: string; border: string; text: string; label: string; glow: string }> = {
  lendaria: { bg: "rgba(255,215,0,0.12)", border: "#FFD700", text: "#FFE44D", label: "Lendária", glow: "rgba(255,215,0,0.25)" },
  epica: { bg: "rgba(168,85,247,0.12)", border: "#A855F7", text: "#C084FC", label: "Épica", glow: "rgba(168,85,247,0.25)" },
  rara: { bg: "rgba(59,130,246,0.12)", border: "#3B82F6", text: "#60A5FA", label: "Rara", glow: "rgba(59,130,246,0.25)" },
  comum: { bg: "rgba(115,115,115,0.12)", border: "#737373", text: "#A3A3A3", label: "Comum", glow: "rgba(115,115,115,0.2)" },
};

const MUSCLE_STYLE: Record<string, { border: string; text: string; bg: string }> = {
  Bíceps: { border: "#60A5FA", text: "#93C5FD", bg: "rgba(59,130,246,0.14)" },
  Core: { border: "#EF4444", text: "#FCA5A5", bg: "rgba(239,68,68,0.14)" },
  Costas: { border: "#3B82F6", text: "#60A5FA", bg: "rgba(59,130,246,0.14)" },
  Dorsais: { border: "#3B82F6", text: "#60A5FA", bg: "rgba(59,130,246,0.14)" },
  Glúteo: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Ombro: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Ombros: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Peito: { border: "#FFD700", text: "#FFE44D", bg: "rgba(255,215,0,0.14)" },
  Peitoral: { border: "#FFD700", text: "#FFE44D", bg: "rgba(255,215,0,0.14)" },
  Pernas: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Posterior: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Quadríceps: { border: "#22C55E", text: "#86EFAC", bg: "rgba(34,197,94,0.14)" },
  Trapézio: { border: "#A855F7", text: "#C084FC", bg: "rgba(168,85,247,0.14)" },
  Tríceps: { border: "#E6C200", text: "#FFE44D", bg: "rgba(255,215,0,0.12)" },
};

const DEFAULT_MUSCLE_STYLE = { border: "#737373", text: "#A3A3A3", bg: "rgba(115,115,115,0.14)" };

const LIVE_FRIENDS: LiveFriend[] = [
  { id: 1, name: "Rafa", initials: "RM", photoUrl: null, groups: ["Costas", "Bíceps"], elapsedSeconds: 24 * 60 + 18 },
  { id: 2, name: "Bianca", initials: "BR", photoUrl: null, groups: ["Pernas", "Core"], elapsedSeconds: 41 * 60 + 6 },
  { id: 3, name: "Marina", initials: "MC", photoUrl: null, groups: ["Peito", "Tríceps"], elapsedSeconds: 18 * 60 + 44 },
  { id: 4, name: "João", initials: "JL", photoUrl: null, groups: ["Ombros"], elapsedSeconds: 33 * 60 + 2 },
];

const INITIAL_POSTS: WorkoutPost[] = [
  {
    id: 1,
    author: "Rafa Mendes",
    username: "@rafamendes",
    initials: "RM",
    date: "Hoje · 12 min",
    title: "Costas & Bíceps",
    duration: "1h 08min",
    rarity: "epica",
    muscles: ["Dorsais", "Bíceps", "Trapézio"],
    emoji: "🏋️",
    photoUrl: null,
    likes: 18,
    liked: false,
    templateSaved: false,
    comments: [
      { id: 1, author: "Bianca", text: "Remada curvada pesada demais.", timeAgo: "8 min" },
      { id: 2, author: "Marina", text: "Vou salvar esse treino para testar amanhã.", timeAgo: "5 min" },
    ],
    exerciseDetails: [
      { name: "Puxada Aberta", sets: [{ weight: 72, reps: 10 }, { weight: 76, reps: 8 }, { weight: 76, reps: 8 }] },
      { name: "Remada Curvada", sets: [{ weight: 82, reps: 8 }, { weight: 82, reps: 8 }, { weight: 78, reps: 10 }] },
      { name: "Remada Cavalinho", sets: [{ weight: 92, reps: 8 }, { weight: 92, reps: 8 }, { weight: 86, reps: 10 }] },
      { name: "Pulldown", sets: [{ weight: 42, reps: 12 }, { weight: 42, reps: 12 }, { weight: 38, reps: 14 }] },
      { name: "Rosca Direta", sets: [{ weight: 36, reps: 10 }, { weight: 36, reps: 9 }, { weight: 32, reps: 12 }] },
      { name: "Rosca Martelo", sets: [{ weight: 18, reps: 12 }, { weight: 18, reps: 10 }, { weight: 16, reps: 12 }] },
    ],
  },
  {
    id: 2,
    author: "Bianca Reis",
    username: "@biareis",
    initials: "BR",
    date: "Hoje · 38 min",
    title: "Pernas Completo",
    duration: "1h 14min",
    rarity: "lendaria",
    muscles: ["Quadríceps", "Posterior", "Glúteo"],
    emoji: "🦵",
    photoUrl: null,
    likes: 31,
    liked: true,
    templateSaved: false,
    comments: [
      { id: 1, author: "Rafa", text: "Esse leg press foi absurdo.", timeAgo: "22 min" },
      { id: 2, author: "João", text: "Pernas completo mesmo.", timeAgo: "18 min" },
      { id: 3, author: "Lia", text: "Panturrilha no final é coragem.", timeAgo: "11 min" },
    ],
    exerciseDetails: [
      { name: "Agachamento Livre", sets: [{ weight: 92, reps: 6 }, { weight: 92, reps: 6 }, { weight: 86, reps: 8 }] },
      { name: "Leg Press 45", sets: [{ weight: 180, reps: 10 }, { weight: 180, reps: 10 }, { weight: 160, reps: 12 }] },
      { name: "Cadeira Extensora", sets: [{ weight: 58, reps: 12 }, { weight: 58, reps: 12 }, { weight: 52, reps: 14 }] },
      { name: "Mesa Flexora", sets: [{ weight: 48, reps: 12 }, { weight: 48, reps: 10 }, { weight: 44, reps: 12 }] },
      { name: "Stiff", sets: [{ weight: 66, reps: 10 }, { weight: 66, reps: 10 }, { weight: 60, reps: 12 }] },
      { name: "Panturrilha em Pé", sets: [{ weight: 82, reps: 15 }, { weight: 82, reps: 15 }, { weight: 76, reps: 18 }] },
    ],
  },
  {
    id: 3,
    author: "Marina Costa",
    username: "@maricosta",
    initials: "MC",
    date: "Ontem · 19:42",
    title: "Peito & Tríceps",
    duration: "56 min",
    rarity: "rara",
    muscles: ["Peitoral", "Tríceps", "Ombro"],
    emoji: "💪",
    photoUrl: null,
    likes: 12,
    liked: false,
    templateSaved: true,
    comments: [
      { id: 1, author: "Rafa", text: "Boa sequência de supinos.", timeAgo: "1 h" },
      { id: 2, author: "Bianca", text: "Tríceps depois desse volume deve ter queimado.", timeAgo: "48 min" },
    ],
    exerciseDetails: [
      { name: "Supino Reto", sets: [{ weight: 58, reps: 8 }, { weight: 58, reps: 8 }, { weight: 54, reps: 10 }] },
      { name: "Supino Inclinado", sets: [{ weight: 50, reps: 8 }, { weight: 50, reps: 8 }, { weight: 46, reps: 10 }] },
      { name: "Crucifixo Máquina", sets: [{ weight: 42, reps: 12 }, { weight: 42, reps: 12 }, { weight: 38, reps: 14 }] },
      { name: "Desenvolvimento", sets: [{ weight: 28, reps: 10 }, { weight: 28, reps: 10 }, { weight: 24, reps: 12 }] },
      { name: "Tríceps Pulley", sets: [{ weight: 30, reps: 12 }, { weight: 30, reps: 12 }, { weight: 28, reps: 12 }] },
      { name: "Tríceps Testa", sets: [{ weight: 22, reps: 10 }, { weight: 22, reps: 10 }, { weight: 18, reps: 12 }] },
    ],
  },
];

function muscleStyle(group: string) {
  return MUSCLE_STYLE[group] ?? DEFAULT_MUSCLE_STYLE;
}

function HexAvatar({ src, initials, size = 42 }: { src?: string | null; initials: string; size?: number }) {
  const outer = size + 5;
  return (
    <div
      style={{
        width: outer,
        height: Math.round(outer * 1.155),
        clipPath: HEX_CLIP,
        background: "#FFD700",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: size,
          height: Math.round(size * 1.155),
          clipPath: HEX_CLIP,
          background: src ? undefined : "#2D2D2D",
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!src && (
          <span style={{ fontFamily: "var(--font-montserrat)", fontSize: Math.round(size * 0.3), fontWeight: 800, color: "#FFD700" }}>
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}

function RarityTag({ rarity }: { rarity: Rarity }) {
  const r = RARITY_STYLE[rarity];
  return (
    <span
      style={{
        background: r.bg,
        border: `1px solid ${r.border}`,
        borderRadius: 100,
        color: r.text,
        fontFamily: "var(--font-inter)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.05em",
        padding: "3px 10px",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {r.label}
    </span>
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function LiveFriendCard({ friend }: { friend: LiveFriend }) {
  return (
    <Motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="min-w-[306px] rounded-2xl border border-[#2D2D2D] bg-[#1A1A1A] p-3"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <HexAvatar src={friend.photoUrl} initials={friend.initials} size={46} />
          <span className="absolute -right-1 bottom-1 h-3 w-3 rounded-full border-2 border-[#1A1A1A] bg-[#22C55E]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-montserrat text-[13px] font-bold text-white">{friend.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-inter text-[11px] font-medium text-[#737373]">treinando</span>
            {friend.groups.map((group) => {
              const style = muscleStyle(group);
              return (
                <span
                  key={group}
                  className="rounded-full border px-2 py-0.5 font-inter text-[10px] font-semibold"
                  style={{ borderColor: style.border, background: style.bg, color: style.text }}
                >
                  {group}
                </span>
              );
            })}
          </div>
          <p className="mt-1 font-inter text-[11px] font-semibold text-[#A3A3A3]">
            há <span className="font-montserrat text-[#FFD700]">{formatElapsed(friend.elapsedSeconds)}</span>
          </p>
        </div>
      </div>
    </Motion.div>
  );
}

function WorkoutPostCard({
  post,
  onToggleLike,
  onSaveTemplate,
}: {
  post: WorkoutPost;
  onToggleLike: (id: number) => void;
  onSaveTemplate: (id: number) => void;
}) {
  const [showExercises, setShowExercises] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const commentsScrollable = post.comments.length > 5;
  const touchStartX = useRef(0);
  const r = RARITY_STYLE[post.rarity];

  const swipeHandlers = {
    onTouchStart: (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: TouchEvent) => {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
    },
    onMouseDown: (e: MouseEvent) => {
      touchStartX.current = e.clientX;
    },
    onMouseUp: (e: MouseEvent) => {
      const diff = e.clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
    },
  };

  return (
    <Motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${showExercises ? r.border : "#2D2D2D"}`,
        background: "#1A1A1A",
        boxShadow: showExercises ? `0 4px 20px ${r.glow}` : "none",
        position: "relative",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      <div style={{ overflow: "hidden" }}>
        <Motion.div
          animate={{ x: showExercises ? "-50%" : "0%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{ display: "flex", width: "200%", touchAction: "pan-y", cursor: "grab" }}
          {...swipeHandlers}
        >
          <div style={{ width: "50%", position: "relative", height: 340 }}>
            {post.photoUrl ? (
              <img src={post.photoUrl} alt="Foto do treino" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(160deg, #161616 0%, #0F0F0F 100%)" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "#1E1E1E", border: "1px dashed #2D2D2D", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={24} color="#404040" />
                </div>
              </div>
            )}

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%", background: "linear-gradient(to top, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.75) 50%, transparent 100%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <RarityTag rarity={post.rarity} />
            </div>

            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 14px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HexAvatar initials={post.initials} size={26} />
                  <div>
                    <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, fontWeight: 700, color: "#ffffff", display: "block" }}>
                      {post.author}
                    </span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>{post.date}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExercises(true)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 100, display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 10px" }}
                >
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Exercícios</span>
                  <ChevronRight size={11} color="rgba(255,255,255,0.45)" />
                </button>
              </div>

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

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {post.muscles.map((muscle) => {
                  const style = muscleStyle(muscle);
                  return (
                    <span key={muscle} style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 100, padding: "3px 9px", fontFamily: "var(--font-inter)", fontSize: 10, fontWeight: 600, color: style.text }}>
                      {muscle}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ width: "50%", display: "flex", flexDirection: "column", height: 340 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 14px 10px", borderBottom: "1px solid #2D2D2D", flexShrink: 0 }}>
              <button
                type="button"
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

            <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
              {post.exerciseDetails.map((exercise, idx) => (
                <div key={exercise.name} style={{ padding: "11px 0", borderBottom: idx < post.exerciseDetails.length - 1 ? "1px solid #222" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                    <div style={{ width: 6, height: 7, clipPath: HEX_CLIP, background: r.border, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
                      {exercise.name}
                    </span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", marginLeft: "auto", flexShrink: 0 }}>
                      {exercise.sets.length} séries
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 13 }}>
                    {exercise.sets.map((set, si) => (
                      <div key={si} style={{ background: "#252525", border: "1px solid #333", borderRadius: 7, padding: "4px 9px", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 48 }}>
                        <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 800, color: r.text, lineHeight: 1 }}>
                          {set.weight > 0 ? `${set.weight}kg` : "PC"}
                        </span>
                        <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", lineHeight: 1 }}>
                          x {set.reps}
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

      <div className="flex items-center justify-between gap-2 border-t border-[#2D2D2D] bg-[#151515] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Motion.button
            type="button"
            onClick={() => onToggleLike(post.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={post.liked ? "Descurtir treino" : "Curtir treino"}
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: post.liked ? "#FFD700" : "#404040",
              background: post.liked ? "rgba(255,215,0,0.12)" : "#1A1A1A",
              color: post.liked ? "#FFD700" : "#A3A3A3",
            }}
          >
            <Heart size={18} fill={post.liked ? "#FFD700" : "none"} />
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
            onClick={() => onSaveTemplate(post.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={post.templateSaved ? "Remover template salvo" : "Salvar template"}
            className="flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              borderColor: post.templateSaved ? "#A3A3A3" : "#404040",
              background: post.templateSaved ? "rgba(163,163,163,0.14)" : "#1A1A1A",
              color: post.templateSaved ? "#D4D4D4" : "#A3A3A3",
            }}
          >
            <Bookmark size={18} fill={post.templateSaved ? "#D4D4D4" : "none"} />
          </Motion.button>
        </div>

        <div className="flex items-center gap-3 font-inter text-[11px] font-semibold text-[#737373]">
          <span>{post.likes} curtidas</span>
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
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="border-t border-[#2D2D2D] bg-[#101010] px-4 py-3"
        >
          <div
            className="flex flex-col gap-3"
            style={{
              maxHeight: commentsScrollable ? 260 : undefined,
              overflowY: commentsScrollable ? "auto" : undefined,
              paddingRight: commentsScrollable ? 4 : undefined,
            }}
          >
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
    </Motion.article>
  );
}

export function SocialFeedScreen() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [liveFriends, setLiveFriends] = useState(LIVE_FRIENDS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveFriends((current) =>
        current.map((friend) => ({ ...friend, elapsedSeconds: friend.elapsedSeconds + 1 })),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function toggleLike(id: number) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
          : post,
      ),
    );
  }

  function saveTemplate(id: number) {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, templateSaved: !post.templateSaved } : post)),
    );
  }

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
            <div className="flex flex-col gap-6">
              <header className="pt-3">
                <div>
                  <h1 className="font-montserrat text-[34px] font-[800] leading-none text-white">
                    <span className="text-[#FFD700]">Bee</span>Fit
                  </h1>
                </div>
              </header>

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Radio size={16} color="#FFD700" />
                  <h2 className="font-montserrat text-[14px] font-bold uppercase tracking-wide text-[#A3A3A3]">Treinando agora</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {liveFriends.map((friend) => (
                    <LiveFriendCard key={friend.id} friend={friend} />
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-5">
                <div className="mb-1 flex items-center gap-2">
                  <Dumbbell size={16} color="#FFD700" />
                  <h2 className="font-montserrat text-[14px] font-bold uppercase tracking-wide text-[#A3A3A3]">
                    Posts recentes
                  </h2>
                </div>
                {posts.map((post) => (
                  <WorkoutPostCard key={post.id} post={post} onToggleLike={toggleLike} onSaveTemplate={saveTemplate} />
                ))}
              </section>
            </div>
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
}
