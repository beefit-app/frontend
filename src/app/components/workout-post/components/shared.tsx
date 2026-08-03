import { HEX_CLIP, RARITY_STYLE } from "../constants";
import type { Rarity } from "../types";
import { useAuthenticatedMediaUrl } from "../../../hooks/useAuthenticatedMediaUrl";

export function HexAvatar({
  src,
  initials,
  size = 42,
}: {
  src?: string | null;
  initials: string;
  size?: number;
}) {
  const resolvedSource = useAuthenticatedMediaUrl(src);
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
          background: resolvedSource ? undefined : "#2D2D2D",
          backgroundImage: resolvedSource ? `url(${resolvedSource})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!resolvedSource && (
          <span
            style={{
              fontFamily: "var(--font-montserrat)",
              fontSize: Math.round(size * 0.3),
              fontWeight: 800,
              color: "#FFD700",
            }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}

export function RarityTag({ rarity }: { rarity: Rarity }) {
  const rarityStyle = RARITY_STYLE[rarity];

  return (
    <span
      style={{
        background: rarityStyle.bg,
        border: `1px solid ${rarityStyle.border}`,
        borderRadius: 100,
        padding: "3px 10px",
        fontFamily: "var(--font-inter)",
        fontSize: 10,
        fontWeight: 700,
        color: rarityStyle.text,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {rarityStyle.label}
    </span>
  );
}
