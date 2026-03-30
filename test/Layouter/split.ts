import { expect } from "chai"

import PlateLayouter from "../../src/plugins/newBrickator/pipeline/Layout/PlateLayouter.js"
import LayoutOptimizer from "../../src/plugins/newBrickator/pipeline/Layout/LayoutOptimizer.js"
import Grid from "../../src/plugins/newBrickator/pipeline/Grid.js"
import type Brick from "../../src/plugins/newBrickator/pipeline/Brick.js"

describe("brickLayouter split", () => { it("should split one brick and relayout locally", () => {
  const plateLayouter = new PlateLayouter(true)
  const layoutOptimizer = new LayoutOptimizer(null, plateLayouter, true)
  const grid = new Grid()

  const v0 = grid.setVoxel({ x: 0, y: 0, z: 0 })
  const v1 = grid.setVoxel({ x: 1, y: 0, z: 0 })
  const v2 = grid.setVoxel({ x: 0, y: 1, z: 0 })
  const v3 = grid.setVoxel({ x: 1, y: 1, z: 0 })
  const v4 = grid.setVoxel({ x: 1, y: 2, z: 0 })

  void grid.initializeBricks()

  // merge bricks to one single (invalid) brick
  const b0 = v0.brick as Brick
  b0.mergeWith(v1.brick as Brick)
  b0.mergeWith(v2.brick as Brick)
  b0.mergeWith(v3.brick as Brick)
  b0.mergeWith(v4.brick as Brick)

  // split it up and relayout
  const bricksToSplit = new Set<Brick>([v0.brick as Brick])
  void layoutOptimizer.splitBricksAndRelayoutLocally(bricksToSplit, grid, true, false)

  // expect to be more than 1 brick
  const bricks = grid.getAllBricks()
  return expect(bricks.size > 1).to.equal(true)
}) })
