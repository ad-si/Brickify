import log from "loglevel"

import HullVoxelizer, { type Model, type VoxelizeOptions } from "./voxelization/HullVoxelizer.js"
import VolumeFiller from "./voxelization/VolumeFiller.js"
import BrickLayouter from "./Layout/BrickLayouter.js"
import PlateLayouter from "./Layout/PlateLayouter.js"
import LayoutOptimizer from "./Layout/LayoutOptimizer.js"
import * as Random from "./Random.js"
import type Grid from "./Grid.js"
import type Brick from "./Brick.js"

interface PipelineOptions {
  voxelizing?: boolean
  layouting?: boolean
  reLayout?: boolean
  initLayout?: boolean
}

interface PipelineData {
  optimizedModel?: unknown
  grid?: Grid | undefined
  gridPOJO?: unknown
  modifiedBricks?: Set<Brick> | undefined
  [key: string]: unknown
}

type ProgressCallback = (progress: number) => void

interface PipelineStep {
  name: string
  decision: (options: PipelineOptions) => boolean
  worker: (lastResult: PipelineData, options: PipelineOptions, progressCallback: ProgressCallback) => Promise<PipelineData>
  terminate?: () => void
}

export default class LegoPipeline {
  voxelizer: HullVoxelizer
  volumeFiller: VolumeFiller
  brickLayouter: BrickLayouter
  plateLayouter: PlateLayouter
  layoutOptimizer: LayoutOptimizer
  pipelineSteps: PipelineStep[]
  terminated: boolean = false
  currentStep: PipelineStep | null = null
  reject: ((reason: string) => void) | null = null

  constructor () {
    this.run = this.run.bind(this)
    this.runPromise = this.runPromise.bind(this)
    this.terminate = this.terminate.bind(this)
    this.voxelizer = new HullVoxelizer()
    this.volumeFiller = new VolumeFiller()
    this.brickLayouter = new BrickLayouter()
    this.plateLayouter = new PlateLayouter()
    this.layoutOptimizer = new LayoutOptimizer(this.brickLayouter, this.plateLayouter)

    this.pipelineSteps = []
    this.pipelineSteps.push({
      name: "Hull voxelizing",
      decision (options: PipelineOptions) {
        return options.voxelizing ?? false
      },
      worker: (lastResult: PipelineData, options: PipelineOptions, progressCallback: ProgressCallback) => {
        return this.voxelizer.voxelize(
          lastResult.optimizedModel as Model,
          options as VoxelizeOptions,
          progressCallback,
        ) as Promise<PipelineData>
      },
    })

    this.pipelineSteps.push({
      name: "Volume filling",
      decision (options: PipelineOptions) {
        return options.voxelizing ?? false
      },
      worker: (lastResult: PipelineData, options: PipelineOptions, progressCallback: ProgressCallback) => {
        return this.volumeFiller.fillGrid(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          lastResult.grid!,
          lastResult.gridPOJO,
          options,
          progressCallback,
        )
      },
    })

    this.pipelineSteps.push({
      name: "Layout graph initialization",
      decision (options: PipelineOptions) {
        return options.initLayout ?? false
      },
      worker: (lastResult: PipelineData, _options: PipelineOptions, _progressCallback: ProgressCallback): Promise<PipelineData> => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return lastResult.grid!.initializeBricks() as unknown as Promise<PipelineData>
      },
    })

    this.pipelineSteps.push({
      name: "Layout Bricks",
      decision (options: PipelineOptions) {
        return options.layouting ?? false
      },
      worker: (lastResult: PipelineData, _options: PipelineOptions) => {
        return this.brickLayouter.layout(lastResult.grid)
      },
    })

    this.pipelineSteps.push({
      name: "Layout Plates",
      decision (options: PipelineOptions) {
        return options.layouting ?? false
      },
      worker: (lastResult: PipelineData, _options: PipelineOptions, _progressCallback: ProgressCallback) => {
        return this.plateLayouter.layout(lastResult.grid)
      },
    })

    this.pipelineSteps.push({
      name: "Final merge pass",
      decision (options: PipelineOptions) {
        return options.layouting ?? false
      },
      worker: (lastResult: PipelineData, _options: PipelineOptions) => {
        return this.plateLayouter.finalLayoutPass(lastResult.grid)
      },
    })

    this.pipelineSteps.push({
      name: "Local reLayout",
      decision (options: PipelineOptions) {
        return options.reLayout ?? false
      },
      worker: (lastResult: PipelineData, _options: PipelineOptions, _progressCallback: ProgressCallback) => {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        return this.layoutOptimizer.splitBricksAndRelayoutLocally(
          lastResult.modifiedBricks!,
          lastResult.grid!,
        )
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
      },
    })

    this.pipelineSteps.push({
      name: "Stability optimization",
      decision (options: PipelineOptions) {
        return (options.layouting ?? false) || (options.reLayout ?? false)
      },
      worker: (lastResult: PipelineData, _options: PipelineOptions): Promise<PipelineData> => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.layoutOptimizer.optimizeLayoutStability(lastResult.grid!) as unknown as Promise<PipelineData>
      },
    })
  }

  run (data: PipelineData, options: PipelineOptions | null = null, _useWorker?: boolean): Promise<PipelineData> {
    this.terminated = false
    log.debug(`Starting Lego Pipeline \
(voxelizing: ${String(options?.voxelizing)}, layouting: ${String(options?.layouting)}, \
onlyReLayout: ${String(options?.reLayout)})`,
    )

    const randomSeed = Math.floor(Math.random() * 1000000)
    Random.setSeed(randomSeed)
    log.debug("Using random seed", randomSeed)

    const start = new Date()

    const runPromise = this.runPromise(0, data, options ?? {})
      .then((result: PipelineData) => {
        log.debug(`Finished Lego Pipeline in ${String(new Date().getTime() - start.getTime())}ms`)
        return result
      })

    const cancelPromise = new Promise<PipelineData>((_resolve, reject) => {
      this.reject = reject
    })

    return Promise.race([runPromise, cancelPromise])
  }

  runPromise (i: number, data: PipelineData, options: PipelineOptions): Promise<PipelineData> {
    const progressCallback: ProgressCallback = (progress: number) => {
      const _overallProgress =
        ((100 * i) / this.pipelineSteps.length) + (progress / this.pipelineSteps.length)
      return _overallProgress
    }
    const finished = (i >= this.pipelineSteps.length) || this.terminated
    if (finished) {
      this.currentStep = null
      this.terminated = true
      return Promise.resolve(data)
    }
    else {
      return this.runStep(i, data, options, progressCallback)
        .then((result: PipelineData) => {
          for (const key of Object.keys(result)) {
            data[key] = result[key]
          }
          return this.runPromise(++i, data, options)
        })
    }
  }

  runStep (i: number, lastResult: PipelineData, options: PipelineOptions, progressCallback: ProgressCallback): Promise<PipelineData> {
    const step = this.pipelineSteps[i]
    this.currentStep = step

    if (step.decision(options)) {
      log.debug(`Running step ${step.name}`)
      const start = new Date()
      return step.worker(lastResult, options, progressCallback)
        .then((result: PipelineData) => {
          const stop = new Date().getTime() - start.getTime()
          log.debug(`Step ${step.name} finished in ${String(stop)}ms`)
          return result
        })
    }
    else {
      log.debug(`(Skipping step ${step.name})`)
      return Promise.resolve(lastResult)
    }
  }

  terminate () {
    if (this.terminated) {
      return
    }
    this.terminated = true
    __guardMethod__(this.currentStep, "terminate", (o: PipelineStep) => o.terminate?.())

    // Terminate persistent workers
    this.voxelizer.terminate()
    this.volumeFiller.terminate()

    if (typeof this.reject === "function") {
      this.reject(`LegoPipeline was terminated at step ${this.currentStep ? this.currentStep.name : 'unknown'}`)
    }
    this.currentStep = null
    this.reject = null
  }
}

function __guardMethod__<T extends object> (obj: T | null | undefined, methodName: keyof T, transform: (o: T) => void): void {
  if (typeof obj !== "undefined" && obj !== null && typeof obj[methodName] === "function") {
    transform(obj)
  }
}
