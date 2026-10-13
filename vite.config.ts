import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

// https://vite.dev/config/

function gitHash(): string {
  try {
    // stderr discarded: outside a git repo (e.g. plain zip extract), the
    // 'dev' fallback is used without a "fatal: not a git repository" message.
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim() || 'dev'
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    __GIT_HASH__: JSON.stringify(gitHash()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
