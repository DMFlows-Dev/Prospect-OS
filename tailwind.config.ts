import type { Config } from "tailwindcss";

// Same DM Flows green palette used in Prospect Wire, so the two feel like
// one product family while this platform is built out.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#14160f",
        surface: "#1c1f16",
        "surface-2": "#262a1d",
        border: "#2e3323",
        text: "#eef1e2",
        "text-dim": "#b4b9a2",
        "text-faint": "#7d8368",
        accent: "#7fae3a",
        "accent-dark": "#a3cc5c",
        "accent-soft": "#2a3a17",
        info: "#55b4c9",
        "info-soft": "#17323a",
        warn: "#e0aa4a",
        "warn-soft": "#3a2e14",
        danger: "#e6736c",
        "danger-soft": "#3d1f1d",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
