import log from "loglevel"

import Brick from "../Brick.js"
import * as Random from "../Random.js"
import Layouter from "./Layouter.js"
import type Grid from "../Grid.js"

interface Size3D {
  x: number
  y: number
  z: number
}

interface Position3D {
  x: number
  y: number
  z: number
}

/*
 * @class PlateLayouter
 */
export default class PlateLayouter extends Layouter {
  constructor (pseudoRandom?: boolean) {
    super()
    this._findMergeableNeighbors = this._findMergeableNeighbors.bind(this)
    this.finalLayoutPass = this.finalLayoutPass.bind(this)
    if (pseudoRandom == null) {
      pseudoRandom = false
    }
    Random.usePseudoRandom(pseudoRandom)
  }

  protected _isBrickLayouter (): boolean {
    return false
  }

  protected _isPlateLayouter (): boolean {
    return true
  }

  // Searches for mergeable neighbors in [x-, x+, y-, y+] direction
  // and returns an array out of arrays of IDs for each direction
  protected _findMergeableNeighbors (brick: Brick): (Set<Brick> | null)[] {
    if (brick.getSize().z === 3) {
      return [null, null, null, null]
    }

    const mergeableNeighbors: (Set<Brick> | null)[] = []

    mergeableNeighbors.push(this._findMergeableNeighborsInDirection(
      brick,
      Brick.direction.Yp,
      (obj: Size3D) => obj.x,
      (obj: Size3D) => obj.y),
    )
    mergeableNeighbors.push(this._findMergeableNeighborsInDirection(
      brick,
      Brick.direction.Ym,
      (obj: Size3D) => obj.x,
      (obj: Size3D) => obj.y),
    )
    mergeableNeighbors.push(this._findMergeableNeighborsInDirection(
      brick,
      Brick.direction.Xm,
      (obj: Size3D) => obj.y,
      (obj: Size3D) => obj.x),
    )
    mergeableNeighbors.push(this._findMergeableNeighborsInDirection(
      brick,
      Brick.direction.Xp,
      (obj: Size3D) => obj.y,
      (obj: Size3D) => obj.x),
    )

    return mergeableNeighbors
  }

  /*
   * Checks if brick can merge in the direction specified.
   *
   * @param {Brick} brick the brick whose neighbors to check
   * @param {Number} dir the merge direction as specified in Brick.direction
   * @param {Function} widthFn the function to determine the brick's width
   * @param {Function} lengthFn the function to determine the brick's length
   * @return {Array<Brick>} Bricks in the merge direction if this brick can merge
   * in this dir undefined otherwise.
   * @see Brick
   */
  _findMergeableNeighborsInDirection (
    brick: Brick,
    dir: string,
    widthFn: (obj: Size3D | Position3D) => number,
    lengthFn: (obj: Size3D | Position3D) => number
  ): Set<Brick> | null {
    const neighborsInDirection = brick.getNeighbors(dir)
    if (neighborsInDirection.size === 0) {
      return null
    }

    // Check that the neighbors together don't exceed this brick's width
    let width = 0
    let noMerge: boolean = false

    neighborsInDirection.forEach((neighbor: Brick) => {
      const neighborSize = neighbor.getSize()
      if (neighborSize.z !== brick.getSize().z) {
        noMerge = true
      }
      if (neighbor.getPosition().z !== brick.getPosition().z) {
        noMerge = true
      }
      return width += widthFn(neighborSize)
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (noMerge) {
      return null
    }

    // If they have the same accumulative width
    // check if they are in the correct positions,
    // i.e. no spacing between neighbors
    if (width !== widthFn(brick.getSize())) {
      return null
    }

    const minWidth = widthFn(brick.getPosition())

    const maxWidth = (minWidth + widthFn(brick.getSize())) - 1

    let length: number | null = null

    let invalidSize: boolean = false
    neighborsInDirection.forEach((neighbor: Brick) => {
      if (length == null) {
        length = lengthFn(neighbor.getSize())
      }
      if (widthFn(neighbor.getPosition()) < minWidth) {
        invalidSize = true
      }
      const neighborWidth = (widthFn(neighbor.getPosition()) +
        widthFn(neighbor.getSize())) - 1
      if (neighborWidth > maxWidth) {
        invalidSize = true
      }
      if (lengthFn(neighbor.getSize()) !== length) {
        invalidSize = true
      }
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (invalidSize) {
      return null
    }

    if (Brick.isValidSize(widthFn(brick.getSize()), lengthFn(brick.getSize()) +
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        length!, brick.getSize().z)) {
      return neighborsInDirection
    }
    else {
      return null
    }
  }



  // Returns the index of the mergeableNeighbors sub-set-in-this-array,
  // where the bricks have the most connected neighbors.
  // If multiple sub-sets have the same number of connected neighbors,
  // one is randomly chosen
  protected _chooseNeighborsToMergeWith (mergeableNeighbors: (Set<Brick> | null)[]): number {
    const numConnections: { num: number; index: number }[] = []
    let maxConnections = 0

    for (let i = 0; i < mergeableNeighbors.length; i++) {
      const neighborSet = mergeableNeighbors[i]
      if (neighborSet == null) {
        continue
      }

      const connectedBricks = new Set<Brick>()

      neighborSet.forEach((neighbor: Brick) => {
        const neighborConnections = neighbor.connectedBricks()
        neighborConnections.forEach(brick => connectedBricks.add(brick))
      })

      numConnections.push({
        num: connectedBricks.size,
        index: i,
      })

      maxConnections = Math.max(maxConnections, connectedBricks.size)
    }

    const largestConnections = numConnections.filter(element => element.num === maxConnections)

    const randomOfLargest = largestConnections[Random.next(largestConnections.length)]
    return randomOfLargest.index
  }

  finalLayoutPass (grid: Grid | undefined): Promise<{ grid: Grid | undefined }> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const bricksToLayout = grid!.getAllBricks()
    let finalPassMerges = 0
    bricksToLayout.forEach((brick): void => {
      const merged = this._mergeLoop(brick, bricksToLayout)
      if (merged) {
        finalPassMerges++
      }
    })

    log.debug("\tFinal pass merged ", finalPassMerges, " times.")
    return Promise.resolve({grid})
  }
}
