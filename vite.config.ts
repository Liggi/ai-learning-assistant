import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { denyImports } from 'vite-env-only'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      target: 'vercel',
      source: 'src',
      customViteReactPlugin: true,
    }),
    react(),
    denyImports({
      environment: 'client',
      patterns: ['@opentelemetry/*', 'fs', 'path', /^node:/, 'Buffer', 'process', 'os', 'url', 'crypto', 'stream', 'net']
    })
  ],
  optimizeDeps: {
    exclude: ['@tanstack/router-core'],
  },
  ssr: {
    noExternal: ['@tanstack/router-core'],
  },
  build: {
    rollupOptions: {
      external: ['node:stream', 'node:stream/web', 'node:async_hooks'],
    },
  },
})