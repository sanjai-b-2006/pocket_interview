export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 320 220"
      className="w-full max-w-sm mx-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hero-grad-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--accent-2)" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="hero-grad-2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      {/* soft glow blobs */}
      <circle cx="60" cy="50" r="55" fill="var(--accent)" opacity="0.12" />
      <circle cx="260" cy="170" r="65" fill="var(--accent-2)" opacity="0.1" />

      {/* chat bubble */}
      <rect x="70" y="30" width="180" height="110" rx="24" fill="url(#hero-grad-1)" opacity="0.16" />
      <rect x="70" y="30" width="180" height="110" rx="24" fill="none" stroke="var(--panel-border)" strokeWidth="1.5" />
      <path d="M110 140 L110 165 L140 140 Z" fill="url(#hero-grad-1)" opacity="0.16" />
      <path d="M110 140 L110 165 L140 140 Z" fill="none" stroke="var(--panel-border)" strokeWidth="1.5" />

      {/* microphone */}
      <g transform="translate(160,85)">
        <rect x="-14" y="-40" width="28" height="52" rx="14" fill="url(#hero-grad-2)" />
        <path
          d="M-24 -2 C-24 18 -13 30 0 30 C13 30 24 18 24 -2"
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity="0.5"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line x1="0" y1="30" x2="0" y2="44" stroke="var(--foreground)" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
        <line x1="-14" y1="44" x2="14" y2="44" stroke="var(--foreground)" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* soundwave bars */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={205 + i * 10}
          y={70 - [10, 20, 8, 24, 14][i]}
          width="5"
          height={[20, 40, 16, 48, 28][i]}
          rx="2.5"
          fill="var(--accent-2)"
          opacity={0.5 + i * 0.08}
        />
      ))}

      {/* floating sparkles */}
      <circle cx="40" cy="150" r="4" fill="var(--accent-3)" opacity="0.8" />
      <circle cx="280" cy="55" r="3" fill="var(--accent-2)" opacity="0.7" />
      <circle cx="255" cy="30" r="2.5" fill="var(--accent)" opacity="0.7" />
    </svg>
  );
}
