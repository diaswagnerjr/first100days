/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        leaf: "#2f6f4e",
        moss: "#78956a",
        paper: "var(--color-paper)",
        card: "var(--color-card)",
        surface: "var(--color-surface)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        coral: "#d86f52",
        sky: "#5d91a8"
      },
      boxShadow: {
        soft: "0 14px 40px var(--color-shadow)"
      }
    }
  },
  plugins: []
};
