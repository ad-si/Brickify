import stlExporter from "stl-exporter"
import log from "loglevel"

import LegoPipeline from "./pipeline/LegoPipeline.js"
import PipelineSettings from "./pipeline/PipelineSettings.js"
import Brick from "./pipeline/Brick.js"
import * as threeHelper from "../../client/threeHelper.js"
import * as threeConverter from "../../client/threeConverter.js"
import type Voxel from "./pipeline/Voxel.js"
import type Grid from "./pipeline/Grid.js"
// Spinner is only available in the browser; load lazily when needed

interface Bundle {
  globalConfig: {
    gridSpacing: { x: number; y: number; z: number }
    studSize: { radius: number; height: number }
    holeSize: { radius: number; height: number }
  }
  getPlugin: (name: string) => unknown
  renderer: {
    getDomElement: () => HTMLElement
  }
}

interface NodeVisualizer {
  objectModified: (node: Node, data: CachedData) => void
}

interface CsgPlugin {
  getCSG: (node: Node, options: CsgOptions) => Promise<unknown[]>
}

interface Node {
  getModel: () => Promise<Model>
  getPluginData: (name: string) => Promise<CachedData | null>
  storePluginData: (name: string, data: CachedData, flag: boolean) => void
  getName: () => Promise<string>
}

interface Model {
  optimizedModel?: unknown
}

interface CachedData {
  node: Node
  grid: Grid
  optimizedModel: unknown
  csgNeedsRecalculation: boolean
}

interface CsgOptions {
  studSize?: { radius: number; height: number }
  holeSize?: { radius: number; height: number }
  addStuds?: boolean
}

interface DownloadOptions {
  type: string
  studRadius?: number
  holeRadius?: number
}

interface SpinnerModule {
  startOverlay: (target: HTMLElement) => void
  stop: (target: HTMLElement) => void
}

interface FaceVertexMesh {
  vertexCoordinates: number[]
  faceVertexIndices: number[]
  name?: string
}

/*
 * @class NewBrickator
 */
export default class NewBrickator {
  pipeline: LegoPipeline
  Spinner: SpinnerModule | null
  bundle!: Bundle
  nodeVisualizer: NodeVisualizer | null = null
  csg: CsgPlugin | null = null

  constructor () {
    this.init = this.init.bind(this)
    this.onNodeAdd = this.onNodeAdd.bind(this)
    this.onNodeRemove = this.onNodeRemove.bind(this)
    this.runLegoPipeline = this.runLegoPipeline.bind(this)
    this.relayoutModifiedParts = this.relayoutModifiedParts.bind(this)
    this._createDataStructure = this._createDataStructure.bind(this)
    this.getNodeData = this.getNodeData.bind(this)
    this.getDownload = this.getDownload.bind(this)
    this._prepareCSGOptions = this._prepareCSGOptions.bind(this)
    this.getHotkeys = this.getHotkeys.bind(this)
    this.pipeline = new LegoPipeline()
    this.Spinner = null
    this._runWithSpinner = this._runWithSpinner.bind(this)
  }

  init (bundle: Bundle) {
    this.bundle = bundle
  }

  onNodeAdd (node: Node) {
    this.nodeVisualizer = this.bundle.getPlugin("nodeVisualizer") as NodeVisualizer | null
    return this._runWithSpinner(() =>
      this.getNodeData(node)
        .then((cachedData: CachedData) => {
          if (this.nodeVisualizer != null) {
            this.nodeVisualizer.objectModified(node, cachedData)
          }
        })
    ).catch((error: unknown) => {
      const msg = (error instanceof Error && (error.stack || error.message)) ? (error.stack || error.message) : String(error)
      log.error("newBrickator.onNodeAdd failed:", msg)
    })
  }

  onNodeRemove (_node: Node) {
    this.pipeline.terminate()
  }

  runLegoPipeline (selectedNode: Node) {
    return this._runWithSpinner(() =>
      this.getNodeData(selectedNode)
        .then((cachedData: CachedData) => {
          // since cached data already contains voxel grid, only run lego
          const settings = new PipelineSettings(this.bundle.globalConfig)
          settings.deactivateVoxelizing()

          settings.setModelTransform(threeHelper.getTransformMatrix(selectedNode as any))

          const data = {
            optimizedModel: cachedData.optimizedModel,
            grid: cachedData.grid,
          }

          return this.pipeline.run(data, settings, true)
            .then(() => {
              cachedData.csgNeedsRecalculation = true

              if (this.nodeVisualizer != null) {
                this.nodeVisualizer.objectModified(selectedNode, cachedData)
              }
            })
        })
    ).catch((error: unknown) => {
      const msg = (error instanceof Error && (error.stack || error.message)) ? (error.stack || error.message) : String(error)
      log.error("newBrickator.runLegoPipeline failed:", msg)
    })
  }

  /*
   * If voxels have been selected as lego / as 3d print, the brick layout
   * needs to be locally regenerated
   * @param {Object} cachedData reference to cachedData
   * @param {Array<BrickObject>} modifiedVoxels list of voxels that have
   * been modified
   * @param {Boolean} createBricks creates Bricks if a voxel has no associated
   * brick. this happens when using the lego brush to create new bricks
   */
  relayoutModifiedParts (selectedNode: Node, modifiedVoxels: Voxel[], createBricks?: boolean) {
    if (createBricks == null) {
      createBricks = false
    }
    log.debug("relayouting modified parts, creating bricks:", createBricks)
    return this.getNodeData(selectedNode)
      .then((cachedData: CachedData) => {
        const modifiedBricks = new Set<Brick>()
        for (const v of Array.from(modifiedVoxels)) {
          if (v.brick) {
            modifiedBricks.add(v.brick)
          }
          else if (createBricks) {
            modifiedBricks.add(new Brick([v]))
          }
        }

        const settings = new PipelineSettings(this.bundle.globalConfig)
        settings.onlyRelayout()

        const data = {
          optimizedModel: cachedData.optimizedModel,
          grid: cachedData.grid,
          modifiedBricks,
        }

        return this.pipeline.run(data, settings, true)
          .then(() => {
            cachedData.csgNeedsRecalculation = true

            if (this.nodeVisualizer != null) {
              this.nodeVisualizer.objectModified(selectedNode, cachedData)
            }
          })
      })
      .catch((error: unknown) => {
        const msg = (error instanceof Error && (error.stack || error.message)) ? (error.stack || error.message) : String(error)
        log.error("newBrickator.relayoutModifiedParts failed:", msg)
      })
  }

  _createDataStructure (selectedNode: Node) {
    return selectedNode.getModel()
      .then((model: Model) => {
      // Create grid
        const settings = new PipelineSettings(this.bundle.globalConfig)
        settings.setModelTransform(threeHelper.getTransformMatrix(selectedNode as any))

        return this.pipeline.run(
          {optimizedModel: model},
          settings,
          true,
        )
          .then((results) => {
          // Create data structure
            const data: CachedData = {
              node: selectedNode,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              grid: results.grid!,
              optimizedModel: model,
              csgNeedsRecalculation: false,
            }
            selectedNode.storePluginData("newBrickator", data, true)
            return data
          })
      })
  }

  _checkDataStructure (_selectedNode: Node, _data: CachedData) {
    return true // Later: Check for node transforms
  }

  getNodeData (selectedNode: Node): Promise<CachedData> {
    return selectedNode.getPluginData("newBrickator")
      .then((data: CachedData | null) => {
        if ((data != null) && this._checkDataStructure(selectedNode, data)) {
          return data
        }
        else {
          return this._createDataStructure(selectedNode)
        }
      })
  }

  getDownload (selectedNode: Node, downloadOptions: DownloadOptions) {
    if (downloadOptions.type !== "stl") {
      return null
    }

    const options = this._prepareCSGOptions(
      downloadOptions.studRadius, downloadOptions.holeRadius,
    )

    if (this.csg == null) {
      this.csg = this.bundle.getPlugin("csg") as CsgPlugin | null
    }
    if (this.csg == null) {
      log.warn("Unable to create download due to CSG Plugin missing")
      return Promise.resolve({ data: "", fileName: "" })
    }

    const downloadPromise = new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.csg!
        .getCSG(selectedNode, options)
        .then((csgGeometries: unknown[]) => {

          if (csgGeometries.length === 0) {
            resolve([{
              data: "",
              fileName: "",
            }])
            return
          }

          void selectedNode
            .getName()
            .then((name: string) => {

              const results = csgGeometries.map((threeGeometry: any, index: number) => {

                const fileName = "brickify-" +
              name.replace(/.stl$/, `-${String(index)}.stl`)

                const faceVertexMesh = threeConverter
                  .threeGeometryToFaceVertexMesh(threeGeometry) as FaceVertexMesh

                faceVertexMesh.name = name

                return {
                  data: stlExporter.toBinaryStl(faceVertexMesh as any),
                  fileName,
                }
              })

              resolve(results)
            })
        })
        .catch((error: unknown) => {
          log.error(error)
          reject(error instanceof Error ? error : new Error(String(error)))
        })
    })

    return downloadPromise
  }

  _prepareCSGOptions (studRadius?: number, holeRadius?: number): CsgOptions {
    const options: CsgOptions = {}

    // Set stud and hole size
    if (studRadius != null) {
      options.studSize = {
        radius: studRadius,
        height: this.bundle.globalConfig.studSize.height,
      }
    }

    if (holeRadius != null) {
      options.holeSize = {
        radius: holeRadius,
        height: this.bundle.globalConfig.holeSize.height,
      }
    }

    // Add studs
    options.addStuds = true

    return options
  }

  getHotkeys (): { title: string; events: { hotkey: string; description: string; callback: () => void }[] } | undefined {
    if (process.env.NODE_ENV !== "development") {
      return undefined
    }
    return {
      title: "newBrickator",
      events: [
        {
          hotkey: "c",
          description: "cancel current pipeline operation",
          callback: () => { this.pipeline.terminate() },
        },
      ],
    }
  }

  async _runWithSpinner<T> (action: () => Promise<T>): Promise<T> {
    // Ensure Spinner module is loaded first to avoid start/stop race
    if (typeof window === "undefined") {
      return action()
    }
    if (!this.Spinner) {
      try {
        this.Spinner = await import("../../client/Spinner.js") as unknown as SpinnerModule
      } catch {
        // If spinner cannot be loaded, run action without it
        return action()
      }
    }
    const target = this.bundle.renderer.getDomElement()
    this.Spinner.startOverlay(target)
    try {
      return await action()
    } finally {
      this.Spinner.stop(target)
    }
  }
}
