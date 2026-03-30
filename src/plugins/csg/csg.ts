import CsgExtractor from "./CsgExtractor.js"
import * as threeHelper from "../../client/threeHelper.js"
import clean from "./csgCleaner.js"
import * as threeConverter from "../../client/threeConverter.js"

interface CsgOptions {
  minimalPrintVolume?: number
  holeSize?: { radius: number; height: number }
  studSize?: { radius: number; height: number }
  addStuds?: boolean
  transformedModel?: THREE.Geometry
  modelBsp?: unknown
  split?: boolean
  filterSmallGeometries?: boolean
}

interface CsgDefaults {
  minimalPrintVolume: number
  holeSize: { radius: number; height: number }
  studSize: { radius: number; height: number }
  addStuds: boolean
}

interface CachedData {
  grid?: unknown
  csgNeedsRecalculation?: boolean
  csg?: THREE.Geometry | THREE.Geometry[] | null
  transformedThreeGeometry?: THREE.Geometry
  modelBsp?: unknown
  oldOptions?: string
}

interface Bundle {
  globalConfig: {
    minimalPrintVolume: number
    holeSize: { radius: number; height: number }
    studSize: { radius: number; height: number }
    addStuds: boolean
  }
}

interface SelectedNode {
  getPluginData(plugin: string): Promise<unknown>
  storePluginData(plugin: string, data: unknown, flag: boolean): void
  getModel(): Promise<{ model: THREE.Object3D }>
}

export default class CSG {
  defaults: CsgDefaults | null = null
  csgExtractor: CsgExtractor | null = null

  constructor () {
    this.init = this.init.bind(this)
    this.getCSG = this.getCSG.bind(this)
    this._createCSG = this._createCSG.bind(this)
  }

  init (bundle: Bundle) {
    const {
      globalConfig,
    } = bundle
    return this.defaults = {
      minimalPrintVolume: globalConfig.minimalPrintVolume,
      holeSize: globalConfig.holeSize,
      studSize: globalConfig.studSize,
      addStuds: globalConfig.addStuds,
    }
  }

  /*
   * Returns a promise which will, when resolved, provide
   * the volumetric subtraction of ModelGeometry - LegoBricks
   * as a THREE.Mesh
   *
   * @return {THREE.Mesh} the volumetric subtraction
   * @param {Object} options the options which may consist out of:
   * @param {Object} options.studSize radius and height of LEGO studs
   * @param {Object} options.holeSize radius and height of holes for
   * LEGO studs
   * @param {Boolean} options.addStuds whether studs are added at all
   */
  getCSG (selectedNode: SelectedNode, options: CsgOptions = {}) {
    this._applyDefaultValues(options)
    return this._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        return this._createCSG(cachedData, selectedNode, options)
      })
  }

  // applies default values if they don't exist yet
  _applyDefaultValues (options: CsgOptions) {
    return (() => {
      const result: unknown[] = []
      if (!this.defaults) return result
      for (const key in this.defaults) {
        const value = this.defaults[key as keyof CsgDefaults]
        if ((options as Record<string, unknown>)[key] == null) {
          result.push((options as Record<string, unknown>)[key] = value)
        }
        else {
          result.push(undefined)
        }
      }
      return result
    })()
  }

  // returns own cached data and links grid from newBrickator data
  // resets newBrickator's csgNeedsRecalculation flag
  _getCachedData (selectedNode: SelectedNode) {
    return selectedNode.getPluginData("csg")
      .then((rawData: unknown) => {
        let data = rawData as CachedData | null
        if (data == null) {
          // create empty data set for own data
          data = {}
          selectedNode.storePluginData("csg", data, true)
        }

        // link grid and dirty flag from newBrickator
        return selectedNode.getPluginData("newBrickator")
          .then((newBrickatorData: unknown) => {
            const brickatorData = newBrickatorData as { grid: unknown; csgNeedsRecalculation: boolean }
            data.grid = brickatorData.grid
            if (brickatorData.csgNeedsRecalculation) {
              data.csgNeedsRecalculation = true
            }
            brickatorData.csgNeedsRecalculation = false
            // finally return own data + newBrickator grid
            return data
          })
      })
  }

  // Creates a CSG subtraction between the node - lego voxels from grid
  _createCSG (cachedData: CachedData, selectedNode: SelectedNode, options: CsgOptions) {
    if (!this._csgNeedsRecalculation(cachedData, options)) {
      return Promise.resolve(cachedData.csg)
    }

    return this._prepareModel(cachedData, selectedNode)
      .then(threeGeometry => {
        cachedData.transformedThreeGeometry = threeGeometry
        if (this.csgExtractor == null) {
          this.csgExtractor = new CsgExtractor()
        }

        options.transformedModel = cachedData.transformedThreeGeometry
        options.modelBsp = cachedData.modelBsp

        const result = this.csgExtractor.extractGeometry(
          cachedData.grid as Parameters<CsgExtractor["extractGeometry"]>[0],
          options as Parameters<CsgExtractor["extractGeometry"]>[1],
        )
        cachedData.modelBsp = result.modelBsp

        options.split = true
        options.filterSmallGeometries = !result.isOriginalModel
        cachedData.csg = clean(result.csg, options)

        cachedData.csgNeedsRecalculation = false
        return cachedData.csg
      })
  }

  // Converts the optimized model from the selected node to a three model
  // that is transformed to match the grid
  _prepareModel (cachedData: CachedData, selectedNode: SelectedNode): Promise<THREE.Geometry> {
    return new Promise((resolve, reject) => {
      if (cachedData.transformedThreeGeometry != null) {
        resolve(cachedData.transformedThreeGeometry)
        return
      }

      selectedNode.getModel()
        .then((model: { model: THREE.Object3D }) => {
          const threeGeometry = threeConverter.toStandardGeometry(model.model as unknown as Parameters<typeof threeConverter.toStandardGeometry>[0])
          threeGeometry.applyMatrix(threeHelper.getTransformMatrix(selectedNode as unknown as Parameters<typeof threeHelper.getTransformMatrix>[0]))
          resolve(threeGeometry)
        })
        .catch((error: unknown) => { reject(error instanceof Error ? error : new Error(String(error))) })
    })
  }

  // determines whether the CSG operation needs recalculation
  _csgNeedsRecalculation (cachedData: CachedData, options: CsgOptions) {
    const newOptions = JSON.stringify(options)

    // check if options changed
    if (cachedData.oldOptions == null) {
      cachedData.oldOptions = newOptions
      return true
    }

    if (cachedData.oldOptions !== newOptions) {
      cachedData.oldOptions = newOptions
      return true
    }

    cachedData.oldOptions = newOptions

    // check if there was a brush action that forces us
    // to recreate CSG
    if (cachedData.csgNeedsRecalculation) {
      return true
    }
    return false
  }
}
