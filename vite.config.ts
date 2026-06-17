/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El SW solo se registra en producción (devOptions.enabled = false).
      devOptions: { enabled: false },
      includeAssets: ['icons/apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'ctlmoney',
        short_name: 'ctlmoney',
        description: 'Gestión integral de finanzas personales',
        theme_color: '#0E0E0E',
        background_color: '#E8B923',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // CacheFirst para assets estáticos (precache automático).
        // NetworkFirst para las llamadas al backend de Apps Script.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('script.google.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gas-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
