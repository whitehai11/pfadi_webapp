/// <reference types="svelte" />
/// <reference types="vite/client" />

// engineered by Maro Elias Goth
declare global {
  interface Window {
    __PFADI_META__?: {
      author: string;
      build: string;
      commit: string;
      engineered: boolean;
      environment: string;
    };
    __PFADI_SIGNATURE_LOGGED__?: boolean;
  }
}

export {};
