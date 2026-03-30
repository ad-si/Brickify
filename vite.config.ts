import path from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import ViteYaml from '@modyfi/vite-plugin-yaml'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  base: '/js/',
  plugins: [
    nodePolyfills(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    viteCommonjs(),
    ViteYaml(),
  ],

  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'src/client/main.ts'),
        landingpage: path.resolve(__dirname, 'src/client/landingpage.ts'),
        shared: path.resolve(__dirname, 'src/client/shared.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    outDir: 'public/js',
    emptyOutDir: false,
    assetsDir: '',
  },
  publicDir: false,

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'text-encoding': path.resolve(__dirname, 'src/shims/text-encoding.ts'),
      path: 'path-browserify',
      stream: 'stream-browserify',
    },
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    global: 'globalThis',
  },

  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  worker: {
    format: 'es',
    plugins: () => [nodePolyfills()],
  },
})
