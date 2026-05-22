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
} from "lucide-react";
import { useRef, useState } from "react";
import { HEX_CLIP, RARITY_STYLE } from "../constants";
import type { ProfileData, WorkoutPost } from "../types";
import { exerciseRarity, getProfileInitials, workoutRarity } from "../utils";
import { HexAvatar, RarityTag } from "./shared";

export function WorkoutPostCard({ post, profile }: { post: WorkoutPost; profile: ProfileData }) {
  const [showExercises, setShowExercises] = useState(false);
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  const [templateSaved, setTemplateSaved] = useState(post.templateSaved);
  const [showComments, setShowComments] = useState(false);
  const touchStartX = useRef(0);
  const computedPostRarity = workoutRarity(post.exerciseDetails, profile.weight);
  const rarityStyle = RARITY_STYLE[computedPostRarity];
  const initials = getProfileInitials(profile);

  function toggleLike() {
    setLiked((current) => {
      setLikes((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  const swipeHandlers = {
    onTouchStart: (event: React.TouchEvent) => {
      touchStartX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const diff = event.changedTouches[0].clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
    },
    onMouseDown: (event: React.MouseEvent) => {
      touchStartX.current = event.clientX;
    },
    onMouseUp: (event: React.MouseEvent) => {
      const diff = event.clientX - touchStartX.current;
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
        border: `1px solid ${showExercises ? rarityStyle.border : "#2D2D2D"}`,
        background: "#1A1A1A",
        transition: "border-color 0.3s",
        boxShadow: showExercises ? `0 4px 20px ${rarityStyle.glow}` : "none",
        position: "relative",
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
              <img
                src={post.photoUrl}
                alt="Foto do treino"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "linear-gradient(160deg, #161616 0%, #0F0F0F 100%)",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "#1E1E1E",
                    border: "1px dashed #2D2D2D",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ImageIcon size={24} color="#404040" />
                </div>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 11, color: "#3A3A3A", fontWeight: 500 }}>
                  Foto do treino
                </span>
              </div>
            )}

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "70%",
                background: "linear-gradient(to top, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.75) 50%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <RarityTag rarity={computedPostRarity} />
            </div>

            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "0 14px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HexAvatar src={profile.avatarUrl} initials={initials} size={26} />
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-montserrat)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#ffffff",
                        display: "block",
                      }}
                    >
                      {profile.displayName}
                    </span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                      {post.date}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowExercises(true)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 100,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    cursor: "pointer",
                    padding: "4px 10px",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                    Exercícios
                  </span>
                  <ChevronRight size={11} color="rgba(255,255,255,0.45)" />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(26,26,26,0.8)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {post.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-montserrat)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#ffffff",
                      display: "block",
                      textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                    }}
                  >
                    {post.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={10} color="rgba(255,255,255,0.45)" />
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                        {post.duration}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Dumbbell size={10} color="rgba(255,255,255,0.45)" />
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                        {post.exerciseDetails.length} exercícios
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {post.muscles.map((muscle) => (
                  <span
                    key={muscle}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 100,
                      padding: "3px 9px",
                      fontFamily: "var(--font-inter)",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ width: "50%", display: "flex", flexDirection: "column", height: 340 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 14px 10px", borderBottom: "1px solid #2D2D2D", flexShrink: 0 }}>
              <button
                onClick={() => setShowExercises(false)}
                style={{
                  background: "#2D2D2D",
                  border: "none",
                  borderRadius: "50%",
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <ChevronLeft size={15} color="#A3A3A3" />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-montserrat)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ffffff",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {post.title}
                </span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373" }}>
                  {post.exerciseDetails.length} exercícios · {post.duration}
                </span>
              </div>
              <RarityTag rarity={computedPostRarity} />
            </div>

            <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
              {post.exerciseDetails.map((exercise, index) => {
                const exerciseRarityValue = exerciseRarity(exercise, profile.weight);
                const exerciseRarityStyle = exerciseRarityValue ? RARITY_STYLE[exerciseRarityValue] : null;

                return (
                  <div
                    key={exercise.name}
                    style={{
                      padding: "11px 0",
                      borderBottom: index < post.exerciseDetails.length - 1 ? "1px solid #222" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                      <div
                        style={{
                          width: 6,
                          height: 7,
                          clipPath: HEX_CLIP,
                          background: exerciseRarityStyle ? exerciseRarityStyle.border : rarityStyle.border,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 700, color: "#ffffff" }}>
                        {exercise.name}
                      </span>
                      {exerciseRarityValue && (
                        <span
                          style={{
                            background: exerciseRarityStyle?.bg,
                            border: `1px solid ${exerciseRarityStyle?.border}`,
                            borderRadius: 999,
                            color: exerciseRarityStyle?.text,
                            fontFamily: "var(--font-inter)",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            padding: "2px 7px",
                            textTransform: "uppercase",
                          }}
                        >
                          {RARITY_STYLE[exerciseRarityValue].label}
                        </span>
                      )}
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", marginLeft: "auto", flexShrink: 0 }}>
                        {exercise.sets.length} séries
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 13 }}>
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          style={{
                            background: exerciseRarityStyle ? exerciseRarityStyle.bg : "#252525",
                            border: exerciseRarityStyle ? `1px solid ${exerciseRarityStyle.border}` : "1px solid #333",
                            borderRadius: 7,
                            padding: "4px 9px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 48,
                            boxShadow: exerciseRarityStyle ? `0 0 0 1px ${exerciseRarityStyle.glow}` : "none",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-montserrat)",
                              fontSize: 12,
                              fontWeight: 800,
                              color: exerciseRarityStyle ? exerciseRarityStyle.text : rarityStyle.text,
                              lineHeight: 1,
                            }}
                          >
                            {set.weight > 0 ? `${set.weight}kg` : "PC"}
                          </span>
                          <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373", lineHeight: 1 }}>
                            × {set.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Motion.div>
      </div>

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
        <div
          style={{
            width: showExercises ? 6 : 14,
            height: 5,
            borderRadius: 3,
            background: showExercises ? "rgba(255,255,255,0.2)" : "#FFD700",
            transition: "width 0.3s, background 0.3s",
          }}
        />
        <div
          style={{
            width: showExercises ? 14 : 6,
            height: 5,
            borderRadius: 3,
            background: showExercises ? rarityStyle.border : "rgba(255,255,255,0.2)",
            transition: "width 0.3s, background 0.3s",
          }}
        />
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
