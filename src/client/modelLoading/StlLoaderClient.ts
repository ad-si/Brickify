import { runStlJob } from "./StlLoaderJob.js"
import type { StlJobResult, StlLoadingStage } from "./StlLoaderJob.js"
import type { StlWorkerReply } from "./stlLoader.worker.js"

declare const IS_STATIC_BUILD: boolean | undefined

export type { StlJobResult, StlLoadingStage }

let nextRequestId = 0

const createWorker = (): Worker | null => {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null
  }
  const workerPath = (typeof IS_STATIC_BUILD !== "undefined" && IS_STATIC_BUILD)
    ? "./js/workers/stlLoader.worker.js"
    : "/js/workers/stlLoader.worker.js"
  try {
    return new Worker(workerPath)
  }
  catch {
    return null
  }
}

// Parses an STL file into a face-vertex mesh in a Web Worker.
// The buffer is transferred to the worker and unusable afterwards.
export function loadStl (
  buffer: ArrayBuffer,
  modelName: string,
  onProgress: (stage: StlLoadingStage, progress: number) => void = () => {},
): Promise<StlJobResult> {
  const worker = createWorker()

  if (!worker) {
    try {
      return Promise.resolve(runStlJob(buffer, modelName, onProgress))
    }
    catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)))
    }
  }

  const requestId = ++nextRequestId

  return new Promise<StlJobResult>((resolve, reject) => {
    worker.addEventListener("message", (event: MessageEvent<StlWorkerReply>) => {
      const reply = event.data
      if (reply.requestId !== requestId) return

      if (reply.state === "progress") {
        onProgress(reply.stage, reply.progress)
        return
      }
      worker.terminate()
      if (reply.state === "finished") {
        resolve(reply.data)
      }
      else {
        reject(new Error(reply.error))
      }
    })
    worker.addEventListener("error", (event: ErrorEvent) => {
      worker.terminate()
      reject(new Error(event.message || "STL loader worker failed"))
    })
    worker.postMessage({ requestId, buffer, modelName }, [buffer])
  })
}
