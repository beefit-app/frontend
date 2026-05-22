import { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "motion/react";
import { Flame } from "lucide-react";

export function StreakCard({
  count,
  isFedToday,
  burstToken,
}: {
  count: number;
  isFedToday: boolean;
  burstToken: number;
}) {
  const [isBursting, setIsBursting] = useState(false);
  const [localBurstToken, setLocalBurstToken] = useState(0);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  useEffect(() => {
    if (burstToken === 0 && localBurstToken === 0) return;

    setIsBursting(true);
    const timer = window.setTimeout(() => setIsBursting(false), 1600);

    return () => window.clearTimeout(timer);
  }, [burstToken, localBurstToken]);

  useEffect(() => {
    if (!isInfoVisible) return;

    const timer = window.setTimeout(() => setIsInfoVisible(false), 3600);

    return () => window.clearTimeout(timer);
  }, [isInfoVisible]);

  function handleClick() {
    if (!isFedToday) return;

    setLocalBurstToken((current) => current + 1);
    setIsInfoVisible(true);
  }

  return (
    <div
      style={{
        minWidth: 132,
        position: "relative",
        overflow: "visible",
      }}
    >
      <AnimatePresence>
        {isInfoVisible && (
          <Motion.div
            initial={{ opacity: 0, y: 18, scale: 0.9, rotate: -2.5, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, scale: 0.94, rotate: -1.5, filter: "blur(4px)" }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 220,
              borderRadius: 18,
              border: "1px solid rgba(249,115,22,0.28)",
              background: "rgba(20,20,20,0.98)",
              padding: "12px 14px",
              boxShadow: "0 18px 42px rgba(0,0,0,0.32), 0 0 0 1px rgba(251,146,60,0.08) inset",
              zIndex: 6,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -6,
                right: 18,
                width: 12,
                height: 12,
                transform: "rotate(45deg)",
                background: "rgba(20,20,20,0.98)",
                borderLeft: "1px solid rgba(249,115,22,0.28)",
                borderTop: "1px solid rgba(249,115,22,0.28)",
              }}
            />
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-montserrat)",
                fontSize: 12,
                fontWeight: 700,
                color: "#FFFFFF",
                marginBottom: 6,
              }}
            >
              O que são Honeys?
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-inter)",
                fontSize: 12,
                lineHeight: 1.55,
                color: "#D4D4D4",
              }}
            >
              Honeys representam sua ofensiva: dias consecutivos em que você alimentou sua sequência com um treino concluído.
            </span>
          </Motion.div>
        )}
      </AnimatePresence>

      <Motion.div
        animate={
          isBursting
            ? {
                scale: [1, 1.08, 1],
                boxShadow: [
                  "0 10px 28px rgba(0,0,0,0.22)",
                  "0 18px 48px rgba(249,115,22,0.3)",
                  "0 10px 28px rgba(0,0,0,0.22)",
                ],
              }
            : undefined
        }
        transition={{ duration: 0.75, ease: "easeOut" }}
        style={{
          borderRadius: 22,
          border: `1px solid ${isFedToday ? "rgba(249,115,22,0.45)" : "#2D2D2D"}`,
          background: isFedToday
            ? "linear-gradient(160deg, rgba(249,115,22,0.18) 0%, rgba(36,18,10,0.96) 100%)"
            : "rgba(20,20,20,0.92)",
          padding: "10px 12px",
          boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isBursting && (
          <>
            <Motion.span
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.1, 0.6], x: 28, y: -32 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{ position: "absolute", right: 22, top: 10, pointerEvents: "none" }}
            >
              <Flame size={14} color="#FB923C" fill="#FB923C" />
            </Motion.span>
            <Motion.span
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.6], x: 8, y: -38 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.08 }}
              style={{ position: "absolute", right: 34, top: 18, pointerEvents: "none" }}
            >
              <Flame size={12} color="#FDBA74" fill="#FDBA74" />
            </Motion.span>
            <Motion.span
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.6], x: -12, y: -28 }}
              transition={{ duration: 0.88, ease: "easeOut", delay: 0.12 }}
              style={{ position: "absolute", right: 18, top: 22, pointerEvents: "none" }}
            >
              <Flame size={10} color="#FED7AA" fill="#FED7AA" />
            </Motion.span>
          </>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={!isFedToday}
          aria-label={isFedToday ? "Ver explicacao dos Honeys" : "Honeys inativos hoje"}
          style={{
            width: "100%",
            border: "none",
            background: "transparent",
            padding: 0,
            margin: 0,
            textAlign: "left",
            cursor: isFedToday ? "pointer" : "default",
          }}
        >
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <Motion.div
            animate={
              isBursting
                ? { rotate: [-6, 8, -3, 0], scale: [1, 1.15, 1] }
                : undefined
            }
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: `1px solid ${isFedToday ? "rgba(249,115,22,0.4)" : "#2D2D2D"}`,
              background: isFedToday ? "rgba(249,115,22,0.18)" : "#171717",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Flame
              size={18}
              color={isFedToday ? "#FB923C" : "#525252"}
              fill={isFedToday ? "#FB923C" : "none"}
            />
          </Motion.div>

          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-inter)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isFedToday ? "#FDBA74" : "#737373",
                marginBottom: 3,
              }}
            >
              Honeys
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-montserrat)",
                fontSize: 20,
                fontWeight: 800,
                lineHeight: 1,
                color: isFedToday ? "#FFFFFF" : "#8A8A8A",
              }}
            >
              {count} dias
            </span>
          </div>
        </div>
        </button>
      </Motion.div>
    </div>
  );
}
