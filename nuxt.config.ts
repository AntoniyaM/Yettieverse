import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  // The title screen is server-rendered; the game itself is a canvas, so SSR buys nothing there.
  routeRules: { '/play': { ssr: false } },
  app: {
    head: {
      title: 'Yettieverse',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'A cozy pixel-art island adventure starring Yettie.' },
        { name: 'theme-color', content: '#2b2340' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'preload', href: '/fonts/jersey-10.woff2', as: 'font', type: 'font/woff2', crossorigin: '' },
      ],
    },
  },
  nitro: {
    // Cloud saves. Swap the driver (redis, cloudflare-kv, vercel-kv, …) when deploying.
    storage: { saves: { driver: 'fs', base: './.data/saves' } },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { include: ['phaser'] },
    // Phaser is one ~1.4 MB chunk, lazy-loaded only on /play.
    build: { chunkSizeWarningLimit: 1600 },
  },
})
