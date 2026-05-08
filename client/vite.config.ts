import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://trading-terminal-l3jb.onrender.com",
        changeOrigin: true,
      },
      "/ws": {
        target: "wss://trading-terminal-l3jb.onrender.com",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
