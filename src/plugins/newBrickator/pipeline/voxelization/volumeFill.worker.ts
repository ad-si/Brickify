import VolumeFillWorker from './VolumeFillWorker'

interface WorkerMessage {
  type: string
  data: {
    gridPOJO: unknown[][][]
  }
}

interface CallbackMessage {
  state: "progress" | "finished"
  progress?: number
  data?: unknown
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data
  if (type === 'fillGrid') {
    const { gridPOJO } = data
    const callback = (message: CallbackMessage) => {
      self.postMessage(message)
    }
    try {
      VolumeFillWorker.fillGrid(gridPOJO as import("./VolumeFillWorker.js").VoxelGrid, callback)
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : String(err)
      self.postMessage({ state: 'error', error: errorMessage })
    }
  }
}
