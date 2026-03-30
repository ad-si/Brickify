import path from 'path'
import { fileURLToPath } from 'url'
import type { Plugin } from 'vite'

import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import ViteYaml from '@modyfi/vite-plugin-yaml'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Plugin to replace server-dependent modules with static versions
function staticModulesPlugin(): Plugin {
  const staticModelCache = path.resolve(__dirname, 'src/client/modelLoading/modelCacheStatic.ts')
  const staticDataPackets = path.resolve(__dirname, 'src/client/sync/dataPacketsProxyStatic.ts')

  return {
    name: 'static-modules',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) return null

      // Replace modelCache imports (handles both ./modelCache and ./modelLoading/modelCache with extensions)
      if ((source.endsWith('modelCache') || source.endsWith('modelCache.js') || source.endsWith('modelCache.ts')) && !source.includes('Static')) {
        return staticModelCache
      }

      // Replace dataPacketsProxy imports (handles .js and .ts extensions)
      if ((source.endsWith('dataPacketsProxy') || source.endsWith('dataPacketsProxy.js') || source.endsWith('dataPacketsProxy.ts')) && !source.includes('Static')) {
        return staticDataPackets
      }

      return null
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    staticModulesPlugin(),
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
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'js/[name].[ext]',
      },
    },
    outDir: 'dist-static',
    emptyOutDir: true,
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  publicDir: 'public',

  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: 'text-encoding', replacement: path.resolve(__dirname, 'src/shims/text-encoding.ts') },
      { find: 'path', replacement: 'path-browserify' },
      { find: 'stream', replacement: 'stream-browserify' },
      // Use localStorage-based proxy for static builds instead of server API
      {
        find: path.resolve(__dirname, 'src/client/sync/dataPacketsProxy.ts'),
        replacement: path.resolve(__dirname, 'src/client/sync/dataPacketsProxyStatic.ts'),
      },
    ],
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    global: 'globalThis',
    IS_STATIC_BUILD: true,
  },

  worker: {
    format: 'es',
    plugins: () => [nodePolyfills()],
  },
})
