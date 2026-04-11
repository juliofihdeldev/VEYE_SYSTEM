/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_PROCESS_ALERT_SECRET?: string;
  readonly VITE_TELEGRAM_MONITOR_RUN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
