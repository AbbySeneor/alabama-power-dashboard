import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        treelyon: {
          dark: "var(--treelyon-dark)",
          surface: "var(--treelyon-surface)",
          border: "var(--treelyon-border)",
          primary: "var(--treelyon-primary)",
          "primary-muted": "var(--treelyon-primary-muted)",
          "green-900": "var(--treelyon-green-900)",
          "green-700": "var(--treelyon-green-700)",
          "green-500": "var(--treelyon-green-500)",
          "green-400": "var(--treelyon-green-400)",
          "green-300": "var(--treelyon-green-300)",
          "green-100": "var(--treelyon-green-100)",
          text: "var(--treelyon-text)",
          muted: "var(--treelyon-muted)",
        },
        ap: {
          navy: "var(--ap-navy)",
          gold: "var(--ap-gold)",
          light: "var(--ap-light)",
        },
        risk: {
          high: "var(--risk-high)",
          medium: "var(--risk-medium)",
          low: "var(--risk-low)",
          clear: "var(--risk-clear)",
        },
      },
      fontFamily: {
        sans: ["var(--font-rubik)", "system-ui", "sans-serif"],
        heading: ["var(--font-manrope)", "var(--font-rubik)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        input: "4px",
        card: "8px",
      },
      transitionDuration: {
        hover: "150ms",
        panel: "250ms",
      },
    },
  },
  plugins: [],
};
export default config;
