import { type MouseEvent, type TouchEvent, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "motion/react";
import {
  Ellipsis,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Heart,
  ImageIcon,
} from "lucide-react";
import { HEX_CLIP } from "../constants";
import type { WorkoutPost, WorkoutPostAuthor } from "../types";
import { getMuscleBadgeStyle } from "../utils";
import { HexAvatar } from "./shared";
import { AuthenticatedImage } from "../../AuthenticatedImage";
import { DeveloperBadge } from "../../DeveloperBadge";
import { BeeButton } from "../../BeeButton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../ui/sheet";

interface WorkoutPostCardBaseProps {
  post: WorkoutPost;
  author: WorkoutPostAuthor;
  bodyWeight: number;
  liked: boolean;
  likes: number;
  templateSaved: boolean;
  onToggleLike: () => void;
  onToggleTemplate: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  muscleVariant?: "accent" | "neutral";
}

export function WorkoutPostCardBase({
  post,
  author,
  bodyWeight: _bodyWeight,
  liked,
  likes,
  templateSaved,
  onToggleLike,
  onToggleTemplate,
  onDelete,
  onReport,
  muscleVariant = "accent",
}: WorkoutPostCardBaseProps) {
  const [showExercises, setShowExercises] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const touchStartX = useRef(0);
  const lastTapRef = useRef<number>(0);

  function handleCardTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 380 && now - lastTapRef.current > 0) {
      triggerLike();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }

  function triggerLike() {
    if (!liked) {
      onToggleLike();
    }
    setShowHeartBurst(true);
    setIsLiking(true);
    setTimeout(() => setShowHeartBurst(false), 900);
    setTimeout(() => setIsLiking(false), 500);
  }

  function handleLikeClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsLiking(true);
    if (!liked) {
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
    }
    onToggleLike();
    setTimeout(() => setIsLiking(false), 500);
  }

  function handleTemplateClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsSavingTemplate(true);
    onToggleTemplate();
    setTimeout(() => setIsSavingTemplate(false), 500);
  }

  const swipeHandlers = {
    onTouchStart: (event: TouchEvent) => {
      touchStartX.current = event.touches[0].clientX;
    },
    onTouchEnd: (event: TouchEvent) => {
      const diff = event.changedTouches[0].clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
      else if (Math.abs(diff) <= 24) handleCardTap();
    },
    onMouseDown: (event: MouseEvent) => {
      touchStartX.current = event.clientX;
    },
    onMouseUp: (event: MouseEvent) => {
      const diff = event.clientX - touchStartX.current;
      if (diff < -48) setShowExercises(true);
      else if (diff > 48) setShowExercises(false);
    },
    onDoubleClick: () => {
      triggerLike();
    },
  };

  return (
    <article
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid #2D2D2D",
        background: "#1A1A1A",
        boxShadow: "none",
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
          <div className="h-[340px] sm:h-[400px] lg:h-[460px]" style={{ width: "50%", position: "relative" }}>
            {post.photoUrl ? (
              <AuthenticatedImage
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

            <AnimatePresence>
              {showHeartBurst && (
                <Motion.div
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 1.35, 1.2, 0.8], y: [0, -10, -25, -45] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Heart
                      size={88}
                      fill="#FFD700"
                      color="#FFD700"
                      style={{ filter: "drop-shadow(0 0 24px rgba(255,215,0,0.9))" }}
                    />
                    <Motion.div
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{
                        position: "absolute",
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,215,0,0.7)",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

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
                <button
                  type="button"
                  onClick={author.onClick}
                  disabled={!author.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: author.onClick ? "pointer" : "default",
                    textAlign: "left",
                  }}
                >
                  <HexAvatar src={author.avatarUrl} initials={author.initials} size={26} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#ffffff",
                          display: "block",
                        }}
                      >
                        {author.name}
                      </span>
                      {author.isDeveloper && <DeveloperBadge compact />}
                    </div>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                      {post.date}
                    </span>
                  </div>
                </button>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {(onDelete || onReport) && (
                    <Sheet open={isActionMenuOpen} onOpenChange={setIsActionMenuOpen}>
                      <button
                        type="button"
                        data-no-card-flip="true"
                        className="beefit-tap-target text-[#8A8A8A] hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsActionMenuOpen(true);
                        }}
                        aria-label="Abrir ações da publicação"
                      >
                        <Ellipsis size={18} />
                      </button>
                      <SheetContent
                        side="bottom"
                        className="beefit-sheet-width rounded-t-[28px] border-[#2D2D2D] bg-[#141414] px-5 pb-7 pt-3 text-white"
                      >
                        <SheetHeader>
                          <SheetTitle className="font-montserrat text-[20px] font-bold text-white">
                            {post.title ?? "Publicação"}
                          </SheetTitle>
                          <SheetDescription className="font-inter text-[13px] text-[#8A8A8A]">
                            Escolha uma ação para esta publicação.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="flex flex-col gap-2.5">
                          {onReport && (
                            <BeeButton
                              variant="outline-red"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsActionMenuOpen(false);
                                onReport();
                              }}
                            >
                              Denunciar
                            </BeeButton>
                          )}
                          {onDelete && (
                            <BeeButton
                              variant="red"
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsActionMenuOpen(false);
                                onDelete();
                              }}
                            >
                              Apagar treino
                            </BeeButton>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                  <button
                    type="button"
                    className="beefit-tap-target"
                    onClick={() => setShowExercises(true)}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "none",
                      borderRadius: 16,
                      padding: "4px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                      Exercícios
                    </span>
                    <ChevronRight size={11} color="rgba(255,255,255,0.45)" />
                  </button>
                </div>
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
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
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
                {post.muscles.map((muscle) => {
                  const style = getMuscleBadgeStyle(muscle, muscleVariant);
                  return (
                    <span
                      key={muscle}
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        borderRadius: 100,
                        padding: "3px 9px",
                        fontFamily: "var(--font-inter)",
                        fontSize: 10,
                        fontWeight: muscleVariant === "neutral" ? 500 : 600,
                        color: style.text,
                      }}
                    >
                      {muscle}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-[340px] sm:h-[400px] lg:h-[460px]" style={{ width: "50%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 14px 10px", borderBottom: "1px solid #2D2D2D", flexShrink: 0 }}>
              <button
                type="button"
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
                <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 700, color: "#ffffff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {post.title}
                </span>
                <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#8A8A8A" }}>
                  {post.exerciseDetails.length} exercícios · {post.duration}
                </span>
              </div>
            </div>

            <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto", flex: 1 }}>
              {post.exerciseDetails.map((exercise, index) => {
                return (
                  <div
                    key={exercise.name}
                    style={{ padding: "11px 0", borderBottom: index < post.exerciseDetails.length - 1 ? "1px solid #222" : "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                      <div
                        style={{
                          width: 6,
                          height: 7,
                          clipPath: HEX_CLIP,
                          background: "#FFD700",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#ffffff",
                          flex: "1 1 0%",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exercise.name}
                      </span>
                      <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#8A8A8A", marginLeft: "auto", flexShrink: 0 }}>
                        {exercise.sets.length} séries
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, paddingLeft: 13 }}>
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          style={{
                            background: "rgba(255,215,0,0.12)",
                            border: "1px solid #FFD700",
                            borderRadius: 7,
                            padding: "4px 9px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 48,
                            boxShadow: "0 0 0 1px rgba(255,215,0,0.25)",
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 800, color: "#FFE44D", lineHeight: 1 }}>
                            {set.weight > 0 ? `${set.weight}kg` : "PC"}
                          </span>
                          <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#8A8A8A", lineHeight: 1 }}>
                            x {set.reps}
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

      <div className="flex items-center justify-between gap-2 border-t border-[#2D2D2D] bg-[#151515] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Motion.button
            type="button"
            onClick={handleLikeClick}
            animate={{ scale: isLiking ? [1, 1.35, 0.9, 1] : 1 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            whileTap={{ scale: 0.88 }}
            aria-label={liked ? "Descurtir treino" : "Curtir treino"}
            className="beefit-tap-target flex h-10 w-10 items-center justify-center rounded-full border relative overflow-hidden"
            style={{
              borderColor: liked ? "#FFD700" : "#404040",
              background: liked ? "rgba(255,215,0,0.14)" : "#1A1A1A",
              color: liked ? "#FFD700" : "#A3A3A3",
              boxShadow: liked ? "0 0 14px rgba(255,215,0,0.3)" : "none",
              transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <Heart
              size={18}
              fill={liked ? "#FFD700" : "none"}
              color={liked ? "#FFD700" : "#A3A3A3"}
              style={{
                transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                transform: liked ? "scale(1.1)" : "scale(1)",
              }}
            />
          </Motion.button>
          <Motion.button
            type="button"
            onClick={handleTemplateClick}
            animate={{ scale: isSavingTemplate ? [1, 1.35, 0.9, 1] : 1 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            whileTap={{ scale: 0.88 }}
            aria-label={templateSaved ? "Remover template salvo" : "Salvar template"}
            className="beefit-tap-target flex h-10 w-10 items-center justify-center rounded-full border relative overflow-hidden"
            style={{
              borderColor: templateSaved ? "#FFD700" : "#404040",
              background: templateSaved ? "rgba(255,215,0,0.14)" : "#1A1A1A",
              color: templateSaved ? "#FFD700" : "#A3A3A3",
              boxShadow: templateSaved ? "0 0 14px rgba(255,215,0,0.3)" : "none",
              transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <Bookmark
              size={18}
              fill={templateSaved ? "#FFD700" : "none"}
              color={templateSaved ? "#FFD700" : "#A3A3A3"}
              style={{
                transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                transform: templateSaved ? "scale(1.1)" : "scale(1)",
              }}
            />
          </Motion.button>
        </div>

        <div className="flex items-center gap-3 font-inter text-[11px] font-semibold text-[#8A8A8A]">
          <span>{likes} curtidas</span>
        </div>
      </div>
    </article>
  );
}
