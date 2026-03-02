/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}", // Caminho para o Tremor
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: colors.blue[50],
            muted: colors.blue[200],
            subtle: colors.blue[400],
            default: colors.blue[500],
            emphasis: colors.blue[700],
            inverted: colors.white,
          },
          background: {
            muted: "#111827",
            subtle: "#1f2937",
            default: "#09090b", // Zinc 950 (Dark Mode)
            emphasis: "#d1d5db",
          },
          border: {
            default: "#27272a", // Zinc 800
          },
          ring: {
            default: "#1f2937",
          },
          content: {
            subtle: "#9ca3af",
            default: "#6b7280",
            emphasis: "#e5e7eb",
            strong: "#f9fafb",
            inverted: "#000000",
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
