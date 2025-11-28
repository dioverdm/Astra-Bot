import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // UI libraries
          if (id.includes('node_modules/framer-motion') || 
              id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          // State management
          if (id.includes('node_modules/zustand') || 
              id.includes('node_modules/@tanstack')) {
            return 'vendor-state';
          }
          // Other vendor libs
          if (id.includes('node_modules/axios') || 
              id.includes('node_modules/recharts') ||
              id.includes('node_modules/react-hot-toast')) {
            return 'vendor-utils';
          }
          // Settings pages
          if (id.includes('/pages/settings/')) {
            return 'pages-settings';
          }
          // Guild pages
          if (id.includes('/pages/guild/')) {
            return 'pages-guild';
          }
        },
      },
    },
  },
  // Base path for production (served from API)
  base: '/',
});
