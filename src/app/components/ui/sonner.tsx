"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

/**
 * Toaster do app.
 *
 * O tema e fixo em "dark": o BeeFit nao monta ThemeProvider do next-themes, entao
 * o useTheme que este arquivo usava antes caia sempre no default e o toast saia
 * com a paleta errada. As cores vem dos tokens do proprio app.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      toastOptions={{
        style: {
          background: "#141414",
          border: "1px solid #2D2D2D",
          color: "#FFFFFF",
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
          borderRadius: "18px",
        },
      }}
      style={
        {
          "--normal-bg": "#141414",
          "--normal-text": "#FFFFFF",
          "--normal-border": "#2D2D2D",
          "--error-bg": "var(--beefit-danger-surface)",
          "--error-text": "var(--beefit-danger)",
          "--error-border": "var(--beefit-danger-border)",
          "--success-bg": "var(--beefit-success-surface)",
          "--success-text": "var(--beefit-success)",
          "--success-border": "var(--beefit-success-border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
