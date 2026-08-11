const PRE_LOCK_PATH =
  "M20,150 C70,120 110,175 160,140 C200,112 240,160 300,140";

/// A price line ticks toward the lock point, then splits into the Up
/// and Down outcomes, the actual mechanic PredictionGame.sol resolves.
export function RoundGlyph() {
  return (
    <svg
      viewBox="0 0 560 260"
      className="h-auto w-full max-w-xl"
      role="img"
      aria-label="A price line ticks toward a lock point, then diverges into an up outcome and a down outcome."
    >
      <defs>
        <filter id="glyph-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="glyph-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C6CFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7C6CFF" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Lock line */}
      <line
        x1="300"
        y1="24"
        x2="300"
        y2="236"
        stroke="#1E2833"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <text
        x="300"
        y="16"
        textAnchor="middle"
        className="fill-text-faint font-mono text-[10px] uppercase tracking-widest"
      >
        Lock
      </text>

      {/* Pre-lock price path */}
      <path
        d={PRE_LOCK_PATH}
        fill="none"
        stroke="url(#glyph-fade)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#glyph-glow)"
      />
      <circle
        r="4.5"
        className="fill-text-primary animate-travel"
        style={{
          offsetPath: `path('${PRE_LOCK_PATH}')`,
          offsetRotate: "0deg",
          filter: "drop-shadow(0 0 6px rgba(124,108,255,0.9))",
        }}
      />

      {/* Up outcome */}
      <path
        d="M300,140 C360,128 420,68 536,44"
        fill="none"
        stroke="#2DD4A7"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#glyph-glow)"
        opacity="0.9"
      />
      <circle
        cx="536"
        cy="44"
        r="5"
        className="fill-up animate-pulse-soft"
        style={{ filter: "drop-shadow(0 0 8px #2DD4A7)" }}
      />
      <text
        x="536"
        y="26"
        textAnchor="end"
        className="fill-up font-mono text-[11px] font-medium uppercase tracking-widest"
      >
        Up
      </text>

      {/* Down outcome */}
      <path
        d="M300,140 C360,152 420,206 536,228"
        fill="none"
        stroke="#FF6B5E"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#glyph-glow)"
        opacity="0.9"
      />
      <circle
        cx="536"
        cy="228"
        r="5"
        className="fill-down animate-pulse-soft [animation-delay:1.1s]"
        style={{ filter: "drop-shadow(0 0 8px #FF6B5E)" }}
      />
      <text
        x="536"
        y="250"
        textAnchor="end"
        className="fill-down font-mono text-[11px] font-medium uppercase tracking-widest"
      >
        Down
      </text>
    </svg>
  );
}
