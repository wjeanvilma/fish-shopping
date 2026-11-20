/// <reference types="vitest" />
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Finish 2.0 Phase 2: FISH_PAGES_BASE=/fish-shopping/play/ for GitHub Pages SPA under /play/.
const pagesBase = process.env.FISH_PAGES_BASE?.trim() || "/";

/** Serve shared/fixtures/loadtest-*.json at /loadtest/* for GameHost boot probes. */
function loadtestBanksPlugin(): Plugin {
  const root = resolve(__dirname, "..");
  const map: Record<string, string> = {
    "/loadtest/loadtest-save-bank.json": resolve(root, "shared/fixtures/loadtest-save-bank.json"),
    "/loadtest/loadtest-telemetry-bank.json": resolve(
      root,
      "shared/fixtures/loadtest-telemetry-bank.json",
    ),
  };
  const attach = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split("?")[0] ?? "";
    const file = map[url];
    if (!file || !existsSync(file)) return next();
    const size = statSync(file).size;
    const range = req.headers.range;
    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Length", String(size));
      res.setHeader("Accept-Ranges", "bytes");
      res.end();
      return;
    }
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      if (m) {
        const start = Number(m[1]);
        const end = m[2] ? Number(m[2]) : Math.min(start + 4095, size - 1);
        res.statusCode = 206;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
        res.setHeader("Content-Length", String(end - start + 1));
        res.setHeader("Accept-Ranges", "bytes");
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Length", String(size));
    createReadStream(file).pipe(res);
  };
  return {
    name: "loadtest-banks",
    configureServer(server) {
      server.middlewares.use(attach);
    },
    configurePreviewServer(server) {
      server.middlewares.use(attach);
    },
  };
}

// The shared content pack, fixtures and 3D assets live in ../shared and are
// imported directly, so the web and Android clients always ship the same files.
export default defineConfig({
  base: pagesBase,
  plugins: [react(), loadtestBanksPlugin()],
  server: { fs: { allow: [".."] } },
  assetsInclude: ["**/*.glb"],
  build: {
    target: "es2022",
    sourcemap: true,
    // Three.js changes rarely: keep it in its own long-cached chunk.
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
    chunkSizeWarningLimit: 800,
    // FISH_INLINE_GLB=1: one self-contained bundle (hosts that only serve web file types).
    ...(process.env.FISH_INLINE_GLB === "1"
      ? { assetsInlineLimit: (file: string) => (file.endsWith(".glb") ? true : undefined) }
      : {}),
  },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
