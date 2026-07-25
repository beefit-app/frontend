import { InputHTMLAttributes, useId, useState, ReactNode } from "react";
import { IonInput, IonItem } from "@ionic/react";

interface BeeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BeeInput({
  label,
  error,
  icon,
  rightElement,
  onChange,
  value,
  type = "text",
  placeholder,
  min,
  max,
  step,
  disabled,
}: BeeInputProps) {
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const borderColor = error ? "#EF4444" : focused ? "#FFD700" : "#404040";
  const shadowStyle = error
    ? "0 0 0 3px rgba(239,68,68,0.1)"
    : focused
    ? "0 0 0 3px rgba(255,215,0,0.1)"
    : "none";

  function handleIonChange(ev: CustomEvent) {
    if (!onChange) return;
    const val = ev.detail.value ?? "";
    const synthetic = {
      target: { value: val },
      currentTarget: { value: val },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(synthetic);
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "var(--font-montserrat)",
            fontSize: "14px",
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
            "--highlight-color-focused": "#FFD700",
            "--inner-padding-end": "0",
            "--padding-start": "0",
            "--padding-end": "0",
            "--min-height": "unset",
            borderRadius: "12px",
            boxShadow: shadowStyle,
            transition: "box-shadow 0.2s, border-color 0.2s",
          } as React.CSSProperties
        }
      >
        {icon && (
          <span
            slot="start"
            style={{
              color: "#737373",
              display: "flex",
              alignItems: "center",
              paddingLeft: "16px",
              paddingRight: "4px",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}

        <IonInput
          id={inputId}
          type={type as any}
          value={value as string}
          placeholder={placeholder}
          disabled={disabled}
          min={min as string}
          max={max as string}
          step={step as string}
          onIonInput={handleIonChange}
          onIonChange={handleIonChange}
          onIonFocus={() => setFocused(true)}
          onIonBlur={() => setFocused(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          style={
            {
              "--color": "#ffffff",
              "--placeholder-color": "#737373",
              "--placeholder-opacity": 1,
              "--background": "transparent",
              "--padding-start": icon ? "8px" : "16px",
              "--padding-end": rightElement ? "8px" : "16px",
              "--padding-top": "16px",
              "--padding-bottom": "16px",
              fontFamily: "var(--font-inter)",
              fontSize: "16px",
            } as React.CSSProperties
          }
        />

        {rightElement && (
          <span
            slot="end"
            style={{
              color: "#737373",
              display: "flex",
              alignItems: "center",
              paddingRight: "16px",
              paddingLeft: "4px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {rightElement}
          </span>
        )}
      </IonItem>

      {error && (
        <span
          id={errorId}
          role="alert"
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "12px",
            color: "#EF4444",
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
