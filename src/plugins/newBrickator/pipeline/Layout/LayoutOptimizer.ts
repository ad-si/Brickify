import log from "loglevel"

import * as DataHelper from "../DataHelper.js"
import * as Random from "../Random.js"
import type Grid from "../Grid.js"
import type Brick from "../Brick.js"

interface Layouter {
  layout: (grid: Grid, bricks: Set<Brick>) => Promise<unknown>
}

export default class LayoutOptimizer {
  private brickLayouter: Layouter | null
  private plateLayouter: Layouter

  constructor (brickLayouter: Layouter | null, plateLayouter: Layouter, pseudoRandom?: boolean) {
    this.optimizeLayoutStability = this.optimizeLayoutStability.bind(this)
    this._findConnectedComponents = this._findConnectedComponents.bind(this)
    this._bricksOnComponentInterfaces = this._bricksOnComponentInterfaces.bind(this)
    this.splitBricksAndRelayoutLocally = this.splitBricksAndRelayoutLocally.bind(this)
    this.brickLayouter = brickLayouter
    this.plateLayouter = plateLayouter
    if (pseudoRandom == null) {
      pseudoRandom = false
    }
    Random.usePseudoRandom(pseudoRandom)
  }

  optimizeLayoutStability (grid: Grid) {
    let pass
    let asc; let end
    const maxNumPasses = 15

    for (pass = 0, end = maxNumPasses, asc = end >= 0; asc ? pass < end : pass > end; asc ? pass++ : pass--) {
      const bricks = grid.getAllBricks()
      log.debug("\t# of bricks: ", bricks.size)

      bricks.forEach((brick: Brick) => brick.label = null)

      const numberOfComponents = this._findConnectedComponents(bricks)
      log.debug("\t# of components: ", numberOfComponents)

      const bricksToSplit = this._bricksOnComponentInterfaces(bricks)
      log.debug("\t# of bricks to split: ", bricksToSplit.size)

      if (bricksToSplit.size === 0) {
        break
      }
      else {
        void this.splitBricksAndRelayoutLocally(bricksToSplit, grid, false, false)
      }
    }

    log.debug("\tfinished optimization after ", pass, "passes")
    return Promise.resolve(grid)
  }

  // Connected components using the connected component labelling algo
  _findConnectedComponents (bricks: Set<Brick>): number {
    const labels: number[] = []
    let id = 0

    // First pass
    bricks.forEach((brick: Brick) => {
      const conBricks = brick.connectedBricks()
      const conLabels = new Set<number>()

      conBricks.forEach((conBrick: Brick) => {
        if (conBrick.label != null) {
          conLabels.add(conBrick.label)
        }
      })

      if (conLabels.size > 0) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const smallestLabel = DataHelper.smallestElement(conLabels)!
        // Assign label to this brick
        brick.label = labels[smallestLabel]!
        for (let i = 0, end = labels.length, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
          if (conLabels.has(labels[i])) {
            labels[i] = labels[smallestLabel]!
          }
        }
        /* eslint-enable @typescript-eslint/no-non-null-assertion */

      }
      else { // No neighbor has a label
        brick.label = id
        labels[id] = id

        id++
      }
    })

    // Second pass - applying labels
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    bricks.forEach((brick: Brick) => brick.label = labels[brick.label!]!)

    // Count number of components
    const finalLabels = new Set<number>()
    for (const label of Array.from(labels)) {
      finalLabels.add(label)
    }
    const numberOfComponents = finalLabels.size

    return numberOfComponents
  }

  _bricksOnComponentInterfaces (bricks: Set<Brick>): Set<Brick> {
    const bricksOnInterfaces = new Set<Brick>()

    bricks.forEach((brick: Brick) => {
      const neighborsXY = brick.getNeighborsXY()
      neighborsXY.forEach((neighbor: Brick) => {
        if (neighbor.label !== brick.label) {
          bricksOnInterfaces.add(neighbor)
          bricksOnInterfaces.add(brick)
        }
      })
    })

    return bricksOnInterfaces
  }


  /*
   * Split up all supplied bricks into single bricks and relayout locally. This
   * means that all supplied bricks and (optionally) their neighbors
   * will be relayouted.
   *
   * @param {Set<Brick>} bricks bricks that should be split
   * @param {Grid} grid the grid the bricks belong to
   * @param {Boolean} [splitNeighbors=true ] whether or not neighbors will be
   * split up and relayouted
   * @param {Boolean} [useThreeLayers=true] whether BrickLayouter should be used
   * first before PlateLayouter
   */
  splitBricksAndRelayoutLocally (bricks: Set<Brick>, grid: Grid,
    splitNeighbors?: boolean, useThreeLayers?: boolean) {
    if (splitNeighbors == null) {
      splitNeighbors = true
    }
    if (useThreeLayers == null) {
      useThreeLayers = true
    }
    const bricksToSplit = new Set<Brick>()

    bricks.forEach((brick: Brick) => {
      // add this brick to be split
      bricksToSplit.add(brick)


      if (splitNeighbors) {
        // Get neighbors in same z layer
        const neighbors = brick.getNeighborsXY()
        // Add them all to be split as well
        neighbors.forEach((nBrick: Brick) => bricksToSplit.add(nBrick))
      }
    })

    const newBricks = this._splitBricks(bricksToSplit)

    const bricksToBeDeleted = new Set<Brick>()

    newBricks.forEach((brick: Brick) => { brick.forEachVoxel((voxel) => {
      // Delete bricks where voxels are disabled (3d printed)
      if (!voxel.enabled) {
        // Remove from relayout list
        bricksToBeDeleted.add(brick)
        // Delete brick from structure
        brick.clear()
      }
    }) })

    bricksToBeDeleted.forEach((brick: Brick) => newBricks.delete(brick))

    if (useThreeLayers && this.brickLayouter) {
      void this.brickLayouter.layout(grid, newBricks)
    }
    return this.plateLayouter.layout(grid, newBricks)
      .then(() => ({
        removedBricks: bricksToSplit,
        newBricks,
      }))
  }

  // Splits each brick in bricks to split, returns all newly generated
  // bricks as a set
  _splitBricks (bricksToSplit: Set<Brick>): Set<Brick> {
    const newBricks = new Set<Brick>()

    bricksToSplit.forEach((brick: Brick) => {
      const splitGenerated = brick.splitUp()
      splitGenerated.forEach((newBrick: Brick) => newBricks.add(newBrick))
    })

    return newBricks
  }
}
