import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Pin root + env to this package so `.env` loads even when Vite is started from the monorepo root
// (e.g. `yarn dev` or `vite` with cwd ≠ VEyeDashBoard).
const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  /** Tauri injects TAURI_* during `beforeBuildCommand`; `--mode desktop` is the desktop/live build (see package.json). */
  const tauriBundle = Boolean(
    process.env.TAURI_PLATFORM || process.env.TAURI_FAMILY || process.env.TAURI_ARCH
  );
  const desktopMode = mode === "desktop";
  const useRelativeBase = tauriBundle || desktopMode;

  return {
    root: packageDir,
    envDir: packageDir,
    base: useRelativeBase ? "./" : "/",
    plugins: [react()],
  };
});
