# VEyeDashBoard — Tauri desktop

The dashboard (`VEyeDashBoard/`) is a **Vite + React** SPA. **Tauri 2** wraps it as a native desktop app: the UI is still the web bundle, shipped in a small shell instead of Electron.

Related files:

| Path | Role |
|------|------|
| `VEyeDashBoard/src-tauri/` | Rust project + `tauri.conf.json`, capabilities, icons |
| `VEyeDashBoard/src-tauri/rust-toolchain.toml` | Pins **stable** Rust so Cargo supports **edition 2024** (required by current Tauri deps) |
| `VEyeDashBoard/vite.config.ts` | `base: './'` when building for Tauri (`--mode desktop` or `TAURI_*` env) |
| `VEyeDashBoard/.env.example` | Browser + `tauri dev` (local vs hosted Supabase) |
| `VEyeDashBoard/.env.desktop.example` | **Hosted** Supabase only for **packaged** desktop builds |

## Prerequisites

1. **Node / pnpm** — same as the rest of the monorepo (`pnpm install` at repo root).
2. **Rust** and OS toolchain per [Tauri prerequisites](https://tauri.app/start/prerequisites/) (e.g. Xcode Command Line Tools on macOS, MSVC/WebView2 on Windows). Use **Rust 1.85 or newer** (current **stable**): the Tauri 2 dependency tree includes crates on **Rust edition 2024**, which older toolchains cannot parse. This repo includes **`src-tauri/rust-toolchain.toml`** with `channel = "stable"` so `rustup` installs a compatible compiler when you build from `VEyeDashBoard/src-tauri/`. If your default toolchain is stale, run **`rustup update stable`** once.

## Install CLI and icon asset

`@tauri-apps/cli` is a **devDependency** of `veye-dashboard`. After adding or changing it:

```bash
cd /path/to/VEYE_SYSTEM
pnpm install
```

The Tauri CLI is **not** on your global `PATH`; scripts use **`pnpm exec tauri`**.

Generate the default bundle icon (teal placeholder) before the first `tauri build`:

```bash
cd VEyeDashBoard
pnpm run tauri:prep
```

Replace it later with real branding:

```bash
cd VEyeDashBoard
pnpm exec tauri icon /path/to/your-logo.png
```

## Development (`tauri dev` → localhost Supabase)

`tauri dev` runs `beforeDevCommand` (`pnpm dev`), then opens **`http://localhost:5173`** in the webview.

- Use **`VEyeDashBoard/.env`** (copy from `.env.example`) for normal dev settings.
- With the default rules in `src/lib/supabase.ts`, **localhost** in the dev server still targets **`http://127.0.0.1:54321`** when `supabase start` is running, unless you force hosted with `VITE_USE_REMOTE_SUPABASE=true`.

Commands:

```bash
# From VEyeDashBoard/
pnpm run tauri:dev

# From monorepo root
pnpm dev:dashboard:tauri
```

## Production desktop build (→ hosted / “live” Supabase)

Packaged builds use **`import.meta.env.PROD`** and **do not** use the dev-only “switch to local when hostname is localhost” path. You must bake **hosted** `VITE_*` values into the Vite bundle.

1. Copy **`VEyeDashBoard/.env.desktop.example`** → **`VEyeDashBoard/.env.desktop`**.
2. Set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**. Keep **`VITE_USE_REMOTE_SUPABASE=true`** so the bundle always targets hosted Supabase. Edge Functions authenticate the dashboard via the signed-in user's JWT + `public.user_roles`, so no shared secret is baked into the bundle.
3. **Do not commit** `.env.desktop` (gitignored via `.env.*`).

Build:

```bash
cd VEyeDashBoard
pnpm run tauri:build
```

This runs **`tauri:prep`** (icon), then **`pnpm exec tauri build`**, which runs **`beforeBuildCommand`**: `pnpm run build:tauri-frontend` → **`vite build --mode desktop`** (loads `.env.desktop`).

From repo root:

```bash
pnpm build:dashboard:tauri
```

Artifacts appear under **`VEyeDashBoard/src-tauri/target/`** (also gitignored).

## Web-only vs desktop Vite builds

| Command | `base` | Env files (typical) | Supabase target |
|--------|--------|---------------------|------------------|
| `pnpm build` | `/` | `.env`, `.env.production` | Whatever you set for production web |
| `pnpm run build:tauri-frontend` | `./` | `.env`, `.env.desktop`, … | Hosted values in `.env.desktop` |

## Monorepo scripts (root `package.json`)

| Script | Effect |
|--------|--------|
| `pnpm dev:dashboard:tauri` | `pnpm --filter veye-dashboard tauri:dev` |
| `pnpm build:dashboard:tauri` | `pnpm --filter veye-dashboard tauri:build` |

## Troubleshooting

**`tauri: command not found`**  
Use the package scripts (`pnpm run tauri:build`, etc.); they call **`pnpm exec tauri`**. If it still fails, run **`pnpm install`** from the repo root so `node_modules/.bin/tauri` exists under `VEyeDashBoard`.

**Blank screen or broken assets in the packaged app**  
The desktop bundle must be built with **`base: './'`** (handled when `--mode desktop` or Tauri’s `TAURI_*` vars are set during `vite build`). Re-run **`pnpm run tauri:build`** after changing `vite.config.ts`.

**Desktop app talks to the wrong Supabase project**  
Check **`.env.desktop`** and that you ran a fresh **`pnpm run tauri:build`** after editing it (values are compile-time for `VITE_*`).

**`feature edition2024 is required` / “that feature is not stabilized in this version of Cargo”**  
Your **rustc / Cargo is too old** (e.g. 1.81). Run **`rustup update stable`**, then rebuild. With **`rust-toolchain.toml`** present, `cargo` / `pnpm exec tauri build` run from the Tauri crate directory should pick up **stable** automatically after `rustup` has fetched it.

**Rust / linker errors**  
Follow [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS; clean **`VEyeDashBoard/src-tauri/target/`** and rebuild.

## Security notes

- **Never** put the Supabase **service_role** key in `VITE_*` env; the dashboard uses the **anon** key only.
- Role-gated Edge Functions (`dashboard-mutate`, `telegram-monitor`, `unblock-user`, `process-admin-alert`) require the caller's Supabase session to match a row in **`public.user_roles`** with `admin` / `moderator`. Manage roles in Supabase Studio → SQL Editor.

## See also

- `VEyeDashBoard/.env.example` — Supabase + Edge secrets for dev / web.
- `docs/FIRESTORE_IMPORT.md`, `docs/DATABASE.md` — backend data model (separate from Tauri).
