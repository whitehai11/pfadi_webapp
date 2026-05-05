import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

const appVersion = process.env.VITE_APP_VERSION || process.env.npm_package_version || 'dev';
const gitCommit = (() => {
  if (process.env.VITE_GIT_COMMIT) return process.env.VITE_GIT_COMMIT;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ["matrix-js-sdk"]
  },
  optimizeDeps: {
    include: ["matrix-js-sdk"]
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_GIT_COMMIT': JSON.stringify(gitCommit),
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit)
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/calendar.ics': 'http://localhost:4000'
    }
  }
});
