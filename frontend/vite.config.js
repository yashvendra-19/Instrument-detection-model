import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the production build works from any static folder (python -m http.server, GitHub Pages, ...)
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1200 },
});
