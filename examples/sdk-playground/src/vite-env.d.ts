/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARCUSX_API_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_ARCUSX_API_KEY?: string;
  readonly VITE_ARCUSX_USER_JWT?: string;
  readonly VITE_ARCUSX_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
