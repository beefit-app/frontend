import { IonItem, IonTextarea } from "@ionic/react";
import { ShieldCheck } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { BeeCard } from "../../BeeCard";
import { DAY_LABELS, HEX_CLIP, MONTH_PT } from "../constants";
export { HexAvatar } from "../../workout-post";

export function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "#2D2D2D" }} />
      <div style={{ width: 9, height: 10, clipPath: HEX_CLIP, background: "#FFD700" }} />
      <div style={{ flex: 1, height: 1, background: "#2D2D2D" }} />
    </div>
  );
}

export function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      {icon}
      <span
        style={{
          fontFamily: "var(--font-montserrat)",
          fontSize: 11,
          fontWeight: 700,
          color: "#737373",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#1A1A1A",
        border: "1px solid #2D2D2D",
        borderRadius: 14,
        padding: "16px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        flex: 1,
      }}
    >
      <div style={{ color }}>{icon}</div>
      <span
        style={{
          fontFamily: "var(--font-montserrat)",
          fontSize: 20,
          fontWeight: 800,
          color: "#ffffff",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: 10,
          color: "#737373",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function TrainingCalendar({ trainedDays }: { trainedDays: number[] }) {
  const today = new Date(2026, 4, 15);
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const offset = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let index = 0; index < offset; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel icon={<ShieldCheck size={13} color="#FFD700" />} label="Frequência" />
        <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, fontWeight: 600, color: "#FFD700" }}>
          {MONTH_PT[month]} {year}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {DAY_LABELS.map((dayLabel) => (
          <div key={dayLabel} style={{ textAlign: "center" }}>
            <span
              style={{
                fontFamily: "var(--font-inter)",
                fontSize: 9,
                fontWeight: 600,
                color: "#404040",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {dayLabel}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, index) => {
          if (day === null) return <div key={`e-${index}`} />;

          const trained = trainedDays.includes(day);
          const isToday = day === todayDate;
          const isFuture = day > todayDate;

          return (
            <div key={day} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 38 }}>
              {trained ? (
                <div
                  style={{
                    width: 30,
                    height: 34,
                    clipPath: HEX_CLIP,
                    background: "#FFD700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(255,215,0,0.35)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 10, fontWeight: 800, color: "#0A0A0A", lineHeight: 1 }}>
                    {day}
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    width: 30,
                    height: 34,
                    clipPath: HEX_CLIP,
                    background: isToday ? "rgba(255,215,0,0.08)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-inter)",
                      fontSize: 11,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#FFD700" : isFuture ? "#2D2D2D" : "#737373",
                      lineHeight: 1,
                    }}
                  >
                    {day}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 11, clipPath: HEX_CLIP, background: "#FFD700" }} />
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373" }}>Treinou</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 11, clipPath: HEX_CLIP, background: "#2D2D2D" }} />
          <span style={{ fontFamily: "var(--font-inter)", fontSize: 10, color: "#737373" }}>Descansou</span>
        </div>
      </div>
    </div>
  );
}

export function CalendarCard({ trainedDays }: { trainedDays: number[] }) {
  return (
    <BeeCard hover={false}>
      <TrainingCalendar trainedDays={trainedDays} />
    </BeeCard>
  );
}

export function BeeTextarea({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#EF4444" : focused ? "#FFD700" : "#404040";
  const shadow = error
    ? "0 0 0 3px rgba(239,68,68,0.1)"
    : focused
    ? "0 0 0 3px rgba(255,215,0,0.1)"
    : "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {label && (
        <label
          style={{
            fontFamily: "var(--font-montserrat)",
            fontSize: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#D4D4D4",
          }}
        >
          {label}
        </label>
      )}
      <IonItem
        lines="none"
        style={
          {
            "--background": "#1A1A1A",
            "--border-radius": "12px",
            "--border-color": borderColor,
            "--border-width": "2px",
            "--border-style": "solid",
            "--color": "#ffffff",
            "--placeholder-color": "#737373",
            "--inner-padding-end": "0",
            "--padding-start": "0",
            "--padding-end": "0",
            "--min-height": "unset",
            borderRadius: "12px",
            boxShadow: shadow,
            transition: "box-shadow 0.2s, border-color 0.2s",
          } as CSSProperties
        }
      >
        <IonTextarea
          value={value}
          placeholder={placeholder}
          rows={4}
          autoGrow={false}
          onIonChange={(event) => onChange(event.detail.value ?? "")}
          onIonFocus={() => setFocused(true)}
          onIonBlur={() => setFocused(false)}
          style={
            {
              "--color": "#ffffff",
              "--placeholder-color": "#737373",
              "--placeholder-opacity": 1,
              "--background": "transparent",
              "--padding-start": "16px",
              "--padding-end": "16px",
              "--padding-top": "14px",
              "--padding-bottom": "14px",
              fontFamily: "var(--font-inter)",
              fontSize: "15px",
            } as CSSProperties
          }
        />
      </IonItem>
      {error && (
        <span style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
}
