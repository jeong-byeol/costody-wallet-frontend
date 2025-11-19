/// <reference types="vite/client" />

// Vite 환경 변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  // 다른 환경 변수들도 여기에 추가 가능
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

