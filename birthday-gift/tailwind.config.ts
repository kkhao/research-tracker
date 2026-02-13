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
        cake: {
          cream: "#fef3e2",
          pink: "#f8b4c4",
          gold: "#e8c547",
        },
      },
      animation: {
        "flicker": "flicker 0.15s ease-in-out infinite alternate",
        "float": "float 3s ease-in-out infinite",
        "rose-float": "rose-float 5s ease-in-out infinite",
      },
      keyframes: {
        flicker: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0.9", transform: "scale(1.05)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "rose-float": {
          "0%, 100%": { transform: "translateY(0) rotate(-5deg)" },
          "50%": { transform: "translateY(-15px) rotate(5deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
