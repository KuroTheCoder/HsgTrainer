/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute Worker URL when the SPA is served from a different origin
   *  (Cloudflare Pages → standalone Worker). Empty in local dev (Vite proxy). */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
