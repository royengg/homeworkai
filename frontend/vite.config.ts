import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Never ship sourcemaps in production by default. If error monitoring is
    // added later, switch to 'hidden' and upload maps to the monitoring service.
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Split vendor code into cacheable chunks. react/react-router together,
        // framer-motion separate (it's heavy and only matters for animated
        // views), icons tree-shaken into their own chunk.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});