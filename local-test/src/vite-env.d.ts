/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARCUSX_API_KEY?: string;
  readonly VITE_ARCUSX_API_URL?: string;
  readonly VITE_TEST_CLIENT_WALLET?: string;
  readonly VITE_TEST_WORKER_WALLET?: string;
  readonly VITE_AGENTIC_EXECUTOR_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
