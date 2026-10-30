import { fileURLToPath } from 'node:url'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const frontendRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const app = mode === 'admin' ? 'admin' : 'owner'
  const websiteRoot = path.join(frontendRoot, 'src', '(website)')
  const webRoot = app === 'admin' ? path.join(websiteRoot, 'admin') : websiteRoot
  const env = loadEnv(mode, frontendRoot, 'VITE_')
  const apiTarget = env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

  return {
    root: webRoot,
    publicDir: path.join(frontendRoot, 'assets'),
    envDir: frontendRoot,
    cacheDir: path.join(frontendRoot, 'node_modules', '.vite', app),
    plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom'] },
    build: {
      outDir: path.join(frontendRoot, 'dist', app),
      emptyOutDir: true,
      ...(app === 'admin' ? { rolldownOptions: { input: path.join(webRoot, 'admin.html') } } : {}),
    },
    server: {
      host: '127.0.0.1',
      port: app === 'admin' ? 5174 : 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (urlPath) => urlPath.replace(/^\/api/, ''),
        },
        '/uploads': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
