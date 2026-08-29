export function PageBackground({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0A0A0A] ${className}`}
      style={{ minHeight: "100%", ...style }}
    >
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
      {children}
    </div>
  );
}
