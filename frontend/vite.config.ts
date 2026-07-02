import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Force fresh bundle on every start (avoids stale ESM cache issues)
    force: true,
  },
})
