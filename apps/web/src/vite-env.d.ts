/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the backend API. Defaults to '/api' (proxied by Vite in dev). */
  readonly VITE_API_URL?: string;
  /** WebSocket endpoint for upload progress. */
  readonly VITE_WS_URL?: string;
  /**
   * Which path files below the chunk threshold take: 'presigned' (default,
   * browser PUTs straight to object storage) or 'proxy' (bytes through the
   * backend). Used by scripts/benchmark to compare the two architectures.
   */
  readonly VITE_UPLOAD_MODE?: 'presigned' | 'proxy';
  /** '1' enables benchmark timing marks on window.__bench. Off by default. */
  readonly VITE_BENCH?: string;
  /** Overrides MAX_CONCURRENT_UPLOADS. Used by the benchmark's concurrency sweep. */
  readonly VITE_MAX_CONCURRENT_UPLOADS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
