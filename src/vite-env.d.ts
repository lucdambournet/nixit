/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
    readonly NODE_ENV: "development" | "production" | "test";
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
