import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1E73BE",   // Adjust slightly if needed
          green: "#3E8E2F",
          light: "#F8FAFC",
          dark: "#1F2937",
        },
      },
    },
  },
  plugins: [],
};

export default config;