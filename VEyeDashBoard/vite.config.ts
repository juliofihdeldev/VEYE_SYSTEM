import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Pin root + env to this package so `.env` loads even when Vite is started from the monorepo root
// (e.g. `yarn dev` or `vite` with cwd ≠ VEyeDashBoard).
const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: packageDir,
  envDir: packageDir,
  plugins: [react()],
});
