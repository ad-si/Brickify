import Grid from "../Grid.js"

const floatDelta = 1e-10
const voxelRoundingThreshold = 1e-5

import HullVoxelWorker from "./HullVoxelWorker.js"

interface VoxelizeOptions {
  accuracy?: number
  zTolerance?: number
  gridSpacing?: { x: number; y: number; z: number }
  modelTransform?: unknown
}

interface FaceVertexMesh {
  vertexCoordinates: number[]
  faceVertexIndices: number[]
  faceNormalCoordinates: number[]
}

interface Model {
  getFaceVertexMesh: () => Promise<FaceVertexMesh>
  getBoundingBox: () => Promise<{ min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }>
}

interface VoxelSpaceModel {
  coordinates: number[]
  faceVertexIndices: number[]
  directions: number[]
}

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

export default class Voxelizer {
  voxelGrid: Grid | null
  worker: WorkerInterface | null = null

  constructor () {
    this.voxelize = this.voxelize.bind(this)
    this.terminate = this.terminate.bind(this)
    this._getOptimizedVoxelSpaceModel = this._getOptimizedVoxelSpaceModel.bind(this)
    this.voxelGrid = null
  }

  _addDefaults (options: VoxelizeOptions): VoxelizeOptions {
    if (options.accuracy == null) {
      options.accuracy = 16
    }
    return options.zTolerance != null ? options : (options.zTolerance = 0.01, options)
  }

  voxelize (model: Model, options: VoxelizeOptions, progressCallback: ProgressCallback): Promise<{ grid: Grid; gridPOJO: unknown }> {
    this._addDefaults(options)

    return new Promise((resolve, reject) => {
      void this.setupGrid(model, options)
        .then((voxelGrid: Grid) => {

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const lineStepSize = voxelGrid.heightRatio / options.accuracy!

          const progressAndFinishedCallback = (message: WorkerMessage) => {
            if (message.state === "progress") {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              progressCallback(message.progress!)
      return
            }
            else { // if state is 'finished'
              resolve({
                grid: voxelGrid,
                gridPOJO: message.data,
              })
      return
            }
          }

          return this._getOptimizedVoxelSpaceModel(model, options)
            .then((voxelSpaceModel: VoxelSpaceModel) => this._getWorker()
              .then(worker => {
                // Fallback to synchronous execution when worker is unavailable
                if (!worker || typeof worker.postMessage !== "function") {
                  HullVoxelWorker.voxelize(
                    voxelSpaceModel,
                    lineStepSize,
                    floatDelta,
                    voxelRoundingThreshold,
                    progressAndFinishedCallback,
                  )
                  return undefined
                }

                return new Promise<void>((resolveWorker, rejectWorker) => {
                  const cleanup = () => {
                    worker.removeEventListener("message", handleMessage)
                    worker.removeEventListener("error", handleError)
                  }
                  const handleMessage = (e: unknown) => {
                    const event = e as { data: WorkerMessage }
                    const message = event.data
                    if (message.state === "progress") {
                      progressAndFinishedCallback(message)
                    }
                    else if (message.state === "finished") {
                      cleanup()
                      progressAndFinishedCallback(message)
                      resolveWorker()
                    }
                    else {
                      cleanup()
                      rejectWorker(new Error(message.error || "Worker error"))
                    }
                  }
                  const handleError = (e: unknown) => {
                    cleanup()
                    rejectWorker(e instanceof Error ? e : new Error(String(e)))
                  }
                  worker.addEventListener("message", handleMessage)
                  worker.addEventListener("error", handleError, { once: true })
                  worker.postMessage({
                    type: "voxelize",
                    data: {
                      model: voxelSpaceModel,
                      lineStepSize,
                      floatDelta,
                      voxelRoundingThreshold,
                    },
                  })
                })
              }))
        })
        .catch((error: unknown) => { reject(error instanceof Error ? error : new Error(String(error))) })
    })
  }

  terminate () {
    if (this.worker != null && typeof this.worker.terminate === "function") {
      this.worker.terminate()
    }
    this.worker = null
  }

  _getOptimizedVoxelSpaceModel (model: Model, options: VoxelizeOptions): Promise<VoxelSpaceModel> {
    return model
      .getFaceVertexMesh()
      .then((faceVertexMesh: FaceVertexMesh) => {
        let i: number
        let end: number
        let end1: number
        const coordinates = faceVertexMesh.vertexCoordinates
        const voxelSpaceCoordinates = new Array(coordinates.length)
        for (i = 0, end = coordinates.length; i < end; i += 3) {
          const position = {
            x: coordinates[i],
            y: coordinates[i + 1],
            z: coordinates[i + 2],
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const coordinate = this.voxelGrid!.mapModelToVoxelSpace(position)
          voxelSpaceCoordinates[i] = coordinate.x
          voxelSpaceCoordinates[i + 1] = coordinate.y
          voxelSpaceCoordinates[i + 2] = coordinate.z
        }

        const normals = faceVertexMesh.faceNormalCoordinates
        const directions: number[] = []
        for (i = 2, end1 = normals.length; i < end1; i += 3) {
          const z = normals[i]
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          directions.push(this._getTolerantDirection(z, options.zTolerance!))
        }

        return {
          coordinates: voxelSpaceCoordinates,
          faceVertexIndices: faceVertexMesh.faceVertexIndices,
          directions,
        }
      })
  }

  _getWorker (): Promise<WorkerInterface | null> {
    if (this.worker != null) {
      return Promise.resolve(this.worker)
    }
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Web Worker not available in this context"))
    }
    try {
      // Use relative path for static builds, absolute for server builds
      const workerPath = (typeof IS_STATIC_BUILD !== "undefined" && IS_STATIC_BUILD)
        ? "./js/workers/hullVoxel.worker.js"
        : "/js/workers/hullVoxel.worker.js"
      const worker = new Worker(workerPath) as unknown as WorkerInterface
      this.worker = worker
      return Promise.resolve(worker)
    }
    catch {
      // Fallback: provide a dummy that won't crash callers
      this.worker = {
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        terminate: () => {},
      }
      return Promise.resolve(this.worker)
    }
  }

  _getTolerantDirection (dZ: number, tolerance: number): number {
    if (dZ > tolerance) {
      return 1
    }
    else if (dZ < -tolerance) {
      return -1
    }
    else {
      return 0
    }
  }

  setupGrid (model: Model, options: VoxelizeOptions): Promise<Grid> {
    this.voxelGrid = new Grid(options.gridSpacing)

    return this.voxelGrid
      .setUpForModel(model, options as any)
      .then(() => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.voxelGrid!
      })
  }
}
