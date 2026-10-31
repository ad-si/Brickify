import { runStlJob } from "./StlLoaderJob"
import type { StlJobResult, StlLoadingStage } from "./StlLoaderJob"

interface LoadMessage {
  requestId: number
  buffer: ArrayBuffer
  modelName: string
}

export type StlWorkerReply =
  | { state: "progress", requestId: number, stage: StlLoadingStage, progress: number }
  | { state: "finished", requestId: number, data: StlJobResult }
  | { state: "error", requestId: number, error: string }

const post = (reply: StlWorkerReply, transfer: Transferable[] = []) => {
  self.postMessage(reply, { transfer })
}

self.onmessage = (event: MessageEvent<LoadMessage>) => {
  const { requestId, buffer, modelName } = event.data

  try {
    const data = runStlJob(buffer, modelName, (stage, progress) => {
      post({ state: "progress", requestId, stage, progress })
    })
    post({ state: "finished", requestId, data }, [
      data.vertexCoordinates.buffer,
      data.faceVertexIndices.buffer,
      data.vertexNormalCoordinates.buffer,
      data.faceNormalCoordinates.buffer,
    ])
  }
  catch (err) {
    post({
      state: "error",
      requestId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
