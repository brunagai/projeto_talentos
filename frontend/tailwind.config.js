/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx,html}",
    "./src/components/**/*.{js,jsx,ts,tsx,html}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        primary: "#e11d48",
        accent: "#ff2a2a",
        surface: {
          DEFAULT: "#18181b",
          muted: "#27272a",
          elevated: "#3f3f46",
        },
        card: {
          DEFAULT: "#18181b",
          muted: "#27272a",
          elevated: "#3f3f46",
        },
      },
    },
  },
  plugins: [],
};
