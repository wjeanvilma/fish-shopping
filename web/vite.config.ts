/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Finish 2.0 Phase 2: FISH_PAGES_BASE=/fish-shopping/play/ for GitHub Pages SPA under /play/.
const pagesBase = process.env.FISH_PAGES_BASE?.trim() || "/";

// The shared content pack, fixtures and 3D assets live in ../shared and are
// imported directly, so the web and Android clients always ship the same files.
export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  assetsInclude: ["**/*.glb"],
  build: {
    target: "es2022",
    sourcemap: true,
    // Three.js changes rarely: keep it in its own long-cached chunk.
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
    chunkSizeWarningLimit: 800,
  },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
