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
      // Recuo do topo pela safe-area: sem isso o toast fica sob a barra de status
      // num aparelho com notch — invisivel no browser, onde a variavel vale 0.
      offset={{ top: "calc(var(--ion-safe-area-top, 0px) + 16px)" }}
      // mobileOffset precisa declarar left e right: so com `offset`, o container
      // fica com width 100% e left 16px, vazando 16px em toda tela estreita.
      mobileOffset={{
        top: "calc(var(--ion-safe-area-top, 0px) + 16px)",
        left: "16px",
        right: "16px",
      }}
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
