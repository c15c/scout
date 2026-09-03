import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14161C",
        ink2: "#5A6070",
        line: "#E4E5EF",
        canvas: "#F6F6FA",
        panel: "#FFFFFF",
        accent: { DEFAULT: "#5B45E0", soft: "#EDEAFC" }
      },
      borderRadius: { xl: "12px", "2xl": "18px" }
    }
  },
  plugins: []
} satisfies Config;
