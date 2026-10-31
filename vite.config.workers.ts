import path from 'path'
import { fileURLToPath } from 'url'

import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workers: Record<string, string> = {
  'hullVoxel.worker': 'src/plugins/newBrickator/pipeline/voxelization/hullVoxel.worker.ts',
  'volumeFill.worker': 'src/plugins/newBrickator/pipeline/voxelization/volumeFill.worker.ts',
  'csg.worker': 'src/plugins/csg/csg.worker.ts',
  'stlLoader.worker': 'src/client/modelLoading/stlLoader.worker.ts',
}

// Separate config for building standalone worker files.
// Workers are loaded as classic scripts and can not import shared chunks,
// so each worker is built on its own (selected via the WORKER variable).
export default defineConfig(() => {
  const worker = process.env.WORKER
  if (!worker || !(worker in workers)) {
    throw new Error(
      `Set WORKER to one of: ${Object.keys(workers).join(', ')}`,
    )
  }

  return {
    publicDir: false,
    build: {
      lib: {
        entry: { [worker]: path.resolve(__dirname, workers[worker]) },
        formats: ['es'],
        fileName: (_, entryName) => `${entryName}.js`,
      },
      outDir: 'public/js/workers',
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        output: {
          // Ensure everything is bundled into a single file
          codeSplitting: false,
        },
      },
    },
  }
})
