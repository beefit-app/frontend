export function HexagonPattern() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 0, opacity: 0.03 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hex-pattern" x="0" y="0" width="40" height="70" patternUnits="userSpaceOnUse">
          <polygon
            points="20,0 40,10 40,35 20,45 0,35 0,10"
            fill="none"
            stroke="#FFD700"
            strokeWidth="0.8"
          />
          <polygon
            points="20,45 40,55 40,70 20,70 0,70 0,55"
            fill="none"
            stroke="#FFD700"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-pattern)" />
    </svg>
  );
}
