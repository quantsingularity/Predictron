/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0F14", // page background — near-black graphite, not pure black
        panel: "#121821", // card/panel surface
        "panel-raised": "#182130",
        border: "#1E2833",
        text: {
          primary: "#E8EDF2",
          muted: "#7C8A9A",
          faint: "#4E5C6B",
        },
        // Bet direction signals — deliberately distinct from the brand
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
      },
      borderRadius: {
        panel: "10px",
      },
    },
  },
  plugins: [],
};
