/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** `true`: force http://127.0.0.1:54321 (+ local anon). `false`: on localhost, still use hosted `VITE_SUPABASE_*`. */
  readonly VITE_USE_LOCAL_SUPABASE?: string;
  /** `true`: always use hosted `VITE_SUPABASE_*` even when the app runs on localhost (dev). */
  readonly VITE_USE_REMOTE_SUPABASE?: string;
  /** Override local API URL (default `http://127.0.0.1:54321`). */
  readonly VITE_LOCAL_SUPABASE_URL?: string;
  /** Override local anon key (`supabase status -o env` → ANON_KEY, or publishable if your CLI uses it). */
  readonly VITE_LOCAL_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
