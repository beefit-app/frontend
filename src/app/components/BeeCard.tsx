import { ReactNode } from "react";
import { IonCard, IonCardContent } from "@ionic/react";

interface BeeCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function BeeCard({ children, className = "", hover = true }: BeeCardProps) {
  return (
    <IonCard
      className={className}
      style={
        {
          "--background": "#1A1A1A",
          "--color": "#ffffff",
          "--border-radius": "16px",
          border: "1px solid #404040",
          boxShadow: "none",
          margin: 0,
          position: "relative",
          overflow: "hidden",
          transition: hover
            ? "border-color 0.3s, box-shadow 0.3s, transform 0.3s"
            : "none",
        } as React.CSSProperties
      }
      onMouseEnter={
        hover
          ? (e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "#FFD700";
              el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              el.style.transform = "translateY(-4px)";
            }
          : undefined
      }
      onMouseLeave={
        hover
          ? (e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "#404040";
              el.style.boxShadow = "none";
              el.style.transform = "translateY(0)";
            }
          : undefined
      }
    >
      {/* Hex watermark decoration */}
      <div
        className="pointer-events-none absolute -top-4 -right-4 opacity-[0.05]"
        style={{
          width: 60,
          height: 69,
          background: "#FFD700",
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        }}
      />
      <IonCardContent style={{ padding: "32px" }}>{children}</IonCardContent>
    </IonCard>
  );
}
