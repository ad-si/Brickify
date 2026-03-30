import log from "loglevel"

import ThreeBSP from "./ThreeCSG.js"
import VoxelUnion from "./VoxelUnion.js"

interface Voxel {
  enabled: boolean
  position: { x: number; y: number; z: number }
}

interface Grid {
  forEachVoxel(callback: (voxel: Voxel) => void): void
  hasVoxelAt(x: number, y: number, z: number): boolean
  getVoxel(x: number, y: number, z: number): Voxel
}

interface LegoVoxel {
  x: number
  y: number
  z: number
  studOnTop: boolean
  studFromBelow: boolean
}

interface GridAnalysisResult {
  legoVoxels: LegoVoxel[]
  everythingBricks: boolean
}

interface ExtractorOptions {
  addStuds?: boolean
  studSize?: { radius: number; height: number }
  holeSize?: { radius: number; height: number }
  modelBsp?: ThreeBSP
  transformedModel?: THREE.Geometry
}

interface ExtractResult {
  modelBsp: ThreeBSP | undefined
  csg: THREE.Geometry | null
  isOriginalModel: boolean
}

export default class CsgExtractor {
  extractGeometry (grid: Grid, options: ExtractorOptions = {}): ExtractResult {
    // extracts voxel that are not selected for
    // legofication (where enabled = false)
    // intersected with the original geometry
    // as a THREE.Geometry

    // options may be
    // {
    //  addStuds: true/false # add lego studs to csg (slow!)
    //  studSize: {radius, height} of studs
    //  holeSize: {radius, height} of holes (to fit lego studs into)
    // }

    log.debug("Creating CSG...")

    let d = new Date()
    const gridAnalysis = this._analyzeGrid(grid)
    log.debug(`Grid analysis took ${String(+new Date() - +d)}ms`)

    if (gridAnalysis.everythingBricks) {
      log.debug("Everything is made out of bricks. Skipped CSG.")
      return {
        modelBsp: options.modelBsp,
        csg: null,
        isOriginalModel: false,
      }
    }

    if (gridAnalysis.legoVoxels.length === 0) {
      return {
        modelBsp: options.modelBsp,
        csg: options.transformedModel || null,
        isOriginalModel: true,
      }
    }

    d = new Date()
    const voxunion = new VoxelUnion(grid as any)
    const voxelHull = voxunion.run(gridAnalysis.legoVoxels, options)
    log.debug(`Voxel Geometrizer took ${String(+new Date() - +d)}ms`)

    const extraction = this._extractPrintGeometry(
      options.modelBsp as any,
      options.transformedModel,
      voxelHull as any,
    )

    return {
      modelBsp: extraction.modelBsp,
      csg: extraction.printGeometry,
      isOriginalModel: false,
    }
  }

  _analyzeGrid (grid: Grid): GridAnalysisResult {
    // creates a list of voxels to be legotized
    const legoVoxels: LegoVoxel[] = []
    let everythingBricks = true

    grid.forEachVoxel((voxel: Voxel): void => {
      if (!voxel.enabled) {
        everythingBricks = false
        return
      }

      const {
        x,
      } = voxel.position
      const {
        y,
      } = voxel.position
      const {
        z,
      } = voxel.position

      // check if the voxel above is 3d printed.
      // if yes, add a stud to current voxel
      let studOnTop = false
      if (grid.hasVoxelAt(x, y, z + 1) && !grid.getVoxel(x, y, z + 1).enabled) {
        studOnTop = true
      }

      // check if the voxel has a 3d printed voxel below it
      // if yes, create space for stud below
      let studFromBelow = false
      if (grid.hasVoxelAt(x, y, z - 1) && !grid.getVoxel(x, y, z - 1).enabled) {
        studFromBelow = true
      }

      legoVoxels.push({
        x,
        y,
        z,
        studOnTop,
        studFromBelow,
      })
    })

    return {
      legoVoxels,
      everythingBricks,
    }
  }

  _extractPrintGeometry (modelBsp: ThreeBSP | undefined, originalModel: THREE.Geometry | undefined, voxelHull: ThreeBSP) {
    // returns volumetric subtraction (3d Geometry - LegoVoxels)
    let d: Date
    if (!modelBsp) {
      d = new Date()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      modelBsp = new ThreeBSP(originalModel!)
      log.debug(`ThreeBsp generation took ${String(+new Date() - +d)}ms`)
    }
    else {
      log.debug("ThreeBSP already exists. Skipped ThreeBSP generation.")
    }

    d = new Date()
    const printBsp = modelBsp.subtract(voxelHull)
    log.debug(`Print geometry took ${String(+new Date() - +d)}ms`)

    return {
      modelBsp,
      printGeometry: printBsp.toGeometry(),
    }
  }
}
