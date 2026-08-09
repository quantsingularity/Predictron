/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0F14", // page background: near-black graphite, not pure black
        panel: "#121821", // card/panel surface
        "panel-raised": "#182130",
        border: "#1E2833",
        text: {
          primary: "#E8EDF2",
          muted: "#7C8A9A",
          faint: "#4E5C6B",
        },
        // Bet direction signals, deliberately distinct from the brand
        // accent below so "this button bets Up" is never visually confused
        // with "this button is a primary action."
        up: "#2DD4A7",
        down: "#FF6B5E",
        // Brand / CTA accent
        brand: {
          DEFAULT: "#7C6CFF",
          dim: "#5B4FD1",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
        // Homepage only: an editorial pairing distinct from the app's
        // utilitarian dashboard type, for the one page that gets to make
        // a first impression before someone is looking at live numbers.
        editorial: ["'Cormorant Garamond'", "serif"],
        dmsans: ["'DM Sans'", "sans-serif"],
      },
      borderRadius: {
        panel: "10px",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(-16px, 14px)" },
        },
        travel: {
          "0%": { offsetDistance: "0%" },
          "100%": { offsetDistance: "100%" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-soft": "pulseSoft 2.6s ease-in-out infinite",
        drift: "drift 14s ease-in-out infinite",
        travel: "travel 3.2s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
