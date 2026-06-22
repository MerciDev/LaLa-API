import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sgdbKey = env.VITE_STEAMGRIDDB_API_KEY || ''

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/igdb': {
          target: 'https://api.igdb.com/v4',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/igdb/, ''),
        },
        '/api/sgdb': {
          target: 'https://www.steamgriddb.com/api/v2',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sgdb/, ''),
          headers: sgdbKey ? { Authorization: `Bearer ${sgdbKey}` } : {},
        },
      },
    },
  }
})
