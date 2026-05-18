import { HexagonPattern } from "./HexagonPattern";

export function PageBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden bg-[#0A0A0A]" style={{ minHeight: "100%" }}>
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
      {children}
    </div>
  );
}
