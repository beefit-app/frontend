// Logos oficiais (glifo simplificado) de cada provedor de login social, como SVG
// inline — não há lib de brand icons no projeto (lucide-react não cobre marcas),
// então seguem o mesmo padrão dos ícones locais já usados em LoginScreen.tsx
// (EmailIcon/LockIcon). aria-hidden porque o texto do botão já descreve a ação.

export function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.468 2.1-1.137 2.81-.728.773-1.92 1.37-2.903 1.29-.127-1.1.43-2.24 1.08-2.95.76-.84 2.08-1.46 2.96-1.15Zm2.973 16.57c-.32.73-.47 1.05-.88 1.69-.57.9-1.38 2.02-2.38 2.03-.89.01-1.12-.58-2.32-.57-1.2.01-1.46.58-2.35.57-1-.01-1.76-1.02-2.33-1.92-1.6-2.52-1.77-5.48-.78-7.05.7-1.12 1.81-1.78 2.86-1.78 1.07 0 1.74.59 2.63.59.86 0 1.38-.59 2.63-.59.93 0 1.92.51 2.62 1.38-2.3 1.26-1.93 4.54.22 5.65Z" />
    </svg>
  );
}

export function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

export function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
