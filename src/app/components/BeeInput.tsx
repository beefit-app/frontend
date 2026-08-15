import { useId, useState, ReactNode, ComponentProps } from "react";
import { IonInput, IonItem } from "@ionic/react";

// Os nomes das props do IonInput sao minusculos (autocomplete, inputmode), ao
// contrario dos do React (autoComplete, inputMode). Derivar os tipos do proprio
// IonInput mantem a traducao abaixo checada pelo compilador.
type IonInputProps = ComponentProps<typeof IonInput>;

// Declara so o que e de fato repassado. A versao anterior estendia
// InputHTMLAttributes e desestruturava dez props, entao tudo o mais —
// autoComplete, name, inputMode — era descartado em silencio: por isso nenhum
// formulario do app funcionava com gerenciador de senha.
interface BeeInputProps {
  label?: string;
  error?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
  value?: string | number | null;
  type?: IonInputProps["type"];
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: string;
  disabled?: boolean;
  name?: string;
  autoComplete?: IonInputProps["autocomplete"];
  inputMode?: IonInputProps["inputmode"];
  maxLength?: number;
  required?: boolean;
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
  name,
  autoComplete,
  inputMode,
  maxLength,
  required,
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
            "--placeholder-color": "#8A8A8A",
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
              color: "#8A8A8A",
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
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          name={name}
          autocomplete={autoComplete}
          inputmode={inputMode}
          maxlength={maxLength}
          required={required}
          onIonInput={handleIonChange}
          onIonChange={handleIonChange}
          onIonFocus={() => setFocused(true)}
          onIonBlur={() => setFocused(false)}
          // String, nao booleano: IonInput e um custom element e o React nao
          // serializa `aria-invalid={true}` como atributo nele — verificado em
          // browser real, onde o aria-describedby aparecia e o aria-invalid nao.
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          style={
            {
              "--color": "#ffffff",
              "--placeholder-color": "#8A8A8A",
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
              color: "#8A8A8A",
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
