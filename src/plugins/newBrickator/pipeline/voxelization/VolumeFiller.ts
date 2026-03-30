import VolumeFillWorker from "./VolumeFillWorker.js"
import type Grid from "../Grid.js"

interface WorkerMessage {
  state: "progress" | "finished" | "error"
  progress?: number
  data?: unknown
  error?: string
}

interface WorkerInterface {
  postMessage: (message: unknown) => void
  addEventListener: (event: string, handler: (e: unknown) => void, options?: { once?: boolean }) => void
  removeEventListener: (event: string, handler: (e: unknown) => void) => void
  terminate: () => void
}

type ProgressCallback = (progress: number) => void

declare const IS_STATIC_BUILD: boolean | undefined

export default class VolumeFiller {
  worker: WorkerInterface | null = null

  constructor () {
    this.terminate = this.terminate.bind(this)
  }

  fillGrid (grid: Grid, gridPOJO: unknown, _options: unknown, progressCallback: ProgressCallback): Promise<{ grid: Grid }> {
    // fills spaces in the grid. Goes up from z=0 to z=max and looks for
    // voxels facing downwards (start filling), stops when it sees voxels
    // facing upwards

    return this._getWorker().then(worker => {
      this.worker = worker
      // Fallback to synchronous execution when worker is unavailable
      if (!worker || typeof worker.postMessage !== 'function') {
        return new Promise((resolve) => {
          const cb = (message: WorkerMessage) => {
            if (message.state === 'progress') {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              progressCallback(message.progress!)
            } else if (message.state === 'finished') {
              grid.fromPojo(message.data as Record<string, Record<string, Record<string, unknown>>>)
              resolve({ grid })
            }
          }
          VolumeFillWorker.fillGrid(gridPOJO as any, cb)
        })
      }

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          worker.removeEventListener('message', handleMessage)
          worker.removeEventListener('error', handleError)
        }
        const handleMessage = (e: unknown) => {
          const event = e as { data: WorkerMessage }
          const message = event.data
          if (message.state === 'progress') {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            progressCallback(message.progress!)
          } else if (message.state === 'finished') {
            cleanup()
            grid.fromPojo(message.data as Record<string, Record<string, Record<string, unknown>>>)
            resolve({ grid })
          } else {
            cleanup()
            reject(new Error(message.error || "Worker error"))
          }
        }
        const handleError = (e: unknown) => {
          cleanup()
          reject(e instanceof Error ? e : new Error(String(e)))
        }
        worker.addEventListener('message', handleMessage)
        worker.addEventListener('error', handleError, { once: true })
        worker.postMessage({ type: 'fillGrid', data: { gridPOJO } })
      })
    })
  }

  terminate () {
    if (this.worker != null && typeof this.worker.terminate === 'function') {
      this.worker.terminate()
    }
    this.worker = null
  }

  _getWorker (): Promise<WorkerInterface | null> {
    if (this.worker != null) {
      return Promise.resolve(this.worker)
    }
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Web Worker not available in this context'))
    }
    try {
      // Use relative path for static builds, absolute for server builds
      const workerPath = (typeof IS_STATIC_BUILD !== "undefined" && IS_STATIC_BUILD)
        ? "./js/workers/volumeFill.worker.js"
        : "/js/workers/volumeFill.worker.js"
      const worker = new Worker(workerPath) as unknown as WorkerInterface
      this.worker = worker
      return Promise.resolve(worker)
    } catch {
      // Fallback: provide a dummy
      this.worker = {
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        terminate: () => {},
      }
      return Promise.resolve(this.worker)
    }
  }
}
