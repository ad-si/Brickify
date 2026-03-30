import HullVoxelWorker from './HullVoxelWorker'

interface VoxelizeData {
  model: {
    faceVertexIndices: number[]
    coordinates: number[]
    directions: number[]
  }
  lineStepSize: number
  floatDelta: number
  voxelRoundingThreshold: number
}

interface WorkerMessage {
  type: string
  data: VoxelizeData
}

interface ProgressMessage {
  state: "progress" | "finished"
  progress?: number
  data?: unknown
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data
  if (type === 'voxelize') {
    const { model, lineStepSize, floatDelta, voxelRoundingThreshold } = data
    const progressCallback = (message: ProgressMessage) => {
      // Forward progress/finished messages to main thread
      self.postMessage(message)
    }
    try {
      HullVoxelWorker.voxelize(
        model,
        lineStepSize,
        floatDelta,
        voxelRoundingThreshold,
        progressCallback,
      )
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : String(err)
      self.postMessage({ state: 'error', error: errorMessage })
    }
  }
}
