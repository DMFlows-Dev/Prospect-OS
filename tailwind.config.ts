import type { Config } from "tailwindcss";

// Same DM Flows green palette used in Prospect Wire, so the two feel like
// one product family while this platform is built out.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f2f4eb",
        surface: "#ffffff",
        "surface-2": "#eaeee0",
        border: "#d9ddc9",
        text: "#262a1f",
        "text-dim": "#666a57",
        "text-faint": "#93977f",
        accent: "#6f9c33",
        "accent-dark": "#587d27",
        "accent-soft": "#e3ecd3",
        info: "#2f7d8f",
        "info-soft": "#dcebee",
        warn: "#b8791f",
        "warn-soft": "#f3e3c6",
        danger: "#b0403a",
        "danger-soft": "#f4dcd9",
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
