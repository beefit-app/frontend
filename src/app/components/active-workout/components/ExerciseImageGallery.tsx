import { useEffect, useState } from "react";
import { Dumbbell, Pause, Play } from "lucide-react";
import { getExerciseImageUrl } from "../../../utils/exerciseImage";

interface ExerciseImageGalleryProps {
  images?: string[];
  exerciseName: string;
}

function getFrameLabel(index: number, total: number): string {
  if (total === 2) {
    return index === 0 ? "1. Posição inicial" : "2. Execução / Pico";
  }
  if (index === 0) return "1. Posição inicial";
  if (index === total - 1) return `${total}. Execução / Pico`;
  return `Passo ${index + 1}`;
}

export function ExerciseImageGallery({ images, exerciseName }: ExerciseImageGalleryProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hasError, setHasError] = useState<Record<number, boolean>>({});

  const totalImages = images?.length ?? 0;

  // Alterna as imagens em loop automaticamente como um GIF
  useEffect(() => {
    if (!isPlaying || totalImages <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalImages);
    }, 1100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, totalImages]);

  if (!images || images.length === 0) {
    return null;
  }

  // Se houver apenas 1 imagem disponível
  if (images.length === 1) {
    const url = getExerciseImageUrl(images[0]);
    return (
      <div
        style={{
          position: "relative",
          width: "65%",
          margin: "0 auto",
          aspectRatio: "1 / 1",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid #2D2D2D",
          background: "#D8ECF8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        }}
      >
        {hasError[0] || !url ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#555" }}>
            <Dumbbell size={36} />
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 13 }}>Foto do exercício</span>
          </div>
        ) : (
          <img
            src={url}
            alt={`${exerciseName} - Posição inicial`}
            onError={() => setHasError((prev) => ({ ...prev, [0]: true }))}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            loading="lazy"
          />
        )}
      </div>
    );
  }

  const allHaveErrors = images.every((_, idx) => hasError[idx]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleSelectFrame = (idx: number) => {
    if (idx === currentFrame) {
      // Clicar no mesmo frame alterna play/pause
      setIsPlaying((prev) => !prev);
    } else {
      setCurrentFrame(idx);
      setIsPlaying(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      {/* Seletor direto entre Inicial e Pico - Ocupa 100% da largura sem sobras */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${images.length}, 1fr)`,
          gap: 8,
          width: "100%",
        }}
      >
        {images.map((_, idx) => {
          const isCurrent = idx === currentFrame;
          const label = getFrameLabel(idx, images.length);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectFrame(idx)}
              aria-pressed={isCurrent}
              style={{
                border: isCurrent ? "1px solid rgba(255,215,0,0.4)" : "1px solid #282828",
                borderRadius: 12,
                padding: "9px 12px",
                background: isCurrent ? "rgba(255,215,0,0.14)" : "rgba(255,255,255,0.03)",
                color: isCurrent ? "#FFD700" : "#A3A3A3",
                fontFamily: "var(--font-montserrat)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isCurrent ? "0 0 14px rgba(255,215,0,0.12)" : "none",
              }}
              title={isCurrent ? "Clique para pausar/reproduzir" : `Ver ${label}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Reprodutor de Imagens estilo GIF - Preenche 100% da largura */}
      <div
        onClick={togglePlay}
        role="region"
        aria-label={`Animação de ${exerciseName}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            togglePlay();
          }
        }}
        style={{
          position: "relative",
          width: "65%",
          margin: "0 auto",
          aspectRatio: "1 / 1",
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid #2D2D2D",
          background: "#D8ECF8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
          userSelect: "none",
        }}
        title={isPlaying ? "Clique para pausar animação" : "Clique para reproduzir animação"}
      >
        {allHaveErrors ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#555" }}>
            <Dumbbell size={36} />
            <span style={{ fontFamily: "var(--font-inter)", fontSize: 13 }}>Foto do exercício</span>
          </div>
        ) : (
          images.map((path, idx) => {
            const url = getExerciseImageUrl(path);
            const isActive = idx === currentFrame;
            if (!url || hasError[idx]) return null;

            return (
              <img
                key={path}
                src={url}
                alt={`${exerciseName} - ${getFrameLabel(idx, images.length)}`}
                onError={() => setHasError((prev) => ({ ...prev, [idx]: true }))}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.18s ease-in-out",
                  pointerEvents: "none",
                }}
                loading="eager"
              />
            );
          })
        )}

        {/* Badge de Status no Canto Superior Esquerdo */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(0,0,0,0.68)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            padding: "4px 9px",
            color: "#FFFFFF",
            fontFamily: "var(--font-montserrat)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.03em",
            display: "flex",
            alignItems: "center",
            gap: 5,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: isPlaying ? "#22C55E" : "#EAB308",
              boxShadow: isPlaying ? "0 0 6px #22C55E" : "none",
              display: "inline-block",
            }}
          />
          {isPlaying ? "GIF" : "PAUSADO"}
        </div>

        {/* Botão de Play / Pause no Canto Inferior Esquerdo */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          aria-label={isPlaying ? "Pausar animação" : "Reproduzir animação"}
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            background: "rgba(0,0,0,0.68)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            padding: "5px 11px",
            color: "#FFFFFF",
            fontFamily: "var(--font-inter)",
            fontSize: 11,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPlaying ? "Pausar" : "Play"}</span>
        </button>

        {/* Contador de Frame no Canto Inferior Direito */}
        <div
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            background: "rgba(0,0,0,0.68)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            padding: "4px 8px",
            color: "#E5E5E5",
            fontFamily: "var(--font-montserrat)",
            fontSize: 11,
            fontWeight: 700,
            pointerEvents: "none",
          }}
        >
          {currentFrame + 1}/{images.length}
        </div>
      </div>
    </div>
  );
}
