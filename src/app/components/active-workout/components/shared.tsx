import { muscleStyle } from "../utils";

export function MuscleTag({ group }: { group: string }) {
  const style = muscleStyle(group);

  return (
    <span
      style={{
        border: `1px solid ${style.border}`,
        color: style.text,
        background: style.bg,
        borderRadius: 999,
        padding: "7px 12px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
        width: "fit-content",
        maxWidth: "100%",
        flex: "0 0 auto",
        fontFamily: "var(--font-inter)",
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {group}
    </span>
  );
}

export function SurfaceCard({
  children,
  border = "#2D2D2D",
  background = "rgba(20,20,20,0.92)",
  style,
  onClick,
  ...props
}: {
  children: React.ReactNode;
  border?: string;
  background?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 24,
        border: `1px solid ${border}`,
        background,
        padding: 16,
        display: "grid",
        gap: 14,
        boxShadow: "0 18px 48px rgba(0,0,0,0.18)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
