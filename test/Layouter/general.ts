import { expect } from "chai"

import Layouter from "../../src/plugins/newBrickator/pipeline/Layout/Layouter.js"
import Grid from "../../src/plugins/newBrickator/pipeline/Grid.js"

describe("Layouter", () => { it("should choose random brick", () => {
  const grid = new Grid()
  const layouter = new Layouter()
  grid.setVoxel({x: 0, y: 0, z: 0})

  grid.initializeBricks()

  const brick = layouter._chooseRandomBrick(grid.getAllBricks())
  const position = brick!.getPosition()
  expect(position.x).to.equal(0)
  expect(position.y).to.equal(0)
  return expect(position.z).to.equal(0)
}) })
