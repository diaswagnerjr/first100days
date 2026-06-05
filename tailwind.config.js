/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        leaf: "#2f6f4e",
        moss: "#78956a",
        paper: "#f8f7f1",
        line: "#d9ded2",
        coral: "#d86f52",
        sky: "#5d91a8"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 33, 27, 0.10)"
      }
    }
  },
  plugins: []
};
