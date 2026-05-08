import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0c10",
          panel: "#0f1117",
          border: "#1e2332",
          header: "#141720",
          green: "#00e676",
          red: "#ff3d57",
          blue: "#4d9fff",
          yellow: "#ffd740",
          muted: "#4a5568",
          text: "#e2e8f0",
          dim: "#8892a4",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
