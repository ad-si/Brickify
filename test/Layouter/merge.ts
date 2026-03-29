import { expect } from "chai"

import PlateLayouter from "../../src/plugins/newBrickator/pipeline/Layout/PlateLayouter.js"
import Grid from "../../src/plugins/newBrickator/pipeline/Grid.js"
import type Brick from "../../src/plugins/newBrickator/pipeline/Brick.js"

describe("brickLayouter merge", () => {
  it("should find mergeable neighbor brick xp and xm", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 1, y: 0, z: 0})

    const plateLayouter = new PlateLayouter()
    grid.initializeBricks()

    let mergeableNeighbors = (plateLayouter as any)._findMergeableNeighbors(v0.brick as Brick)
    const mergeableNeighborsXp = mergeableNeighbors[3]!
    expect(mergeableNeighborsXp.has(v1.brick as Brick)).to.equal(true)

    mergeableNeighbors = (plateLayouter as any)._findMergeableNeighbors(v1.brick as Brick)
    const mergeableNeighborsXm = mergeableNeighbors[2]!
    return expect(mergeableNeighborsXm.has(v0.brick as Brick)).to.equal(true)
  })

  it("should find mergeable neighbor brick yp and ym", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 0, y: 1, z: 0})

    const plateLayouter = new PlateLayouter()
    grid.initializeBricks()

    let mergeableNeighbors = (plateLayouter as any)._findMergeableNeighbors(v0.brick as Brick)
    const mergeableNeighborsYp = mergeableNeighbors[0]!
    expect(mergeableNeighborsYp.has(v1.brick as Brick)).to.equal(true)

    mergeableNeighbors = (plateLayouter as any)._findMergeableNeighbors(v1.brick as Brick)
    const mergeableNeighborsYm = mergeableNeighbors[1]!
    return expect(mergeableNeighborsYm.has(v0.brick as Brick)).to.equal(true)
  })

  it("should choose the better brick 10 out of 10 times", () => {
    const grid = new Grid()
    grid.setVoxel({x: 0, y: 0, z: 0})
    const v0 = grid.setVoxel({x: 1, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 2, y: 0, z: 0})
    grid.setVoxel({x: 2, y: 0, z: 1})

    const plateLayouter = new PlateLayouter()
    grid.initializeBricks()
    const brick = v0.brick as Brick

    return (() => {
      const result: Chai.Assertion[] = []
      for (let num = 1; num <= 10; num++) {
        const mergeableNeighbors = (plateLayouter as any)._findMergeableNeighbors(brick)
        const mergeDirection =
          (plateLayouter as any)._chooseNeighborsToMergeWith(mergeableNeighbors)

        result.push(expect(mergeableNeighbors[mergeDirection]!.has(v1.brick as Brick)).to.equal(true))
      }
      return result
    })()
  })

  it("should not merge a single voxel", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 5, y: 5, z: 0})
    const plateLayouter = new PlateLayouter()

    grid.initializeBricks()
    plateLayouter.layout(grid)

    expect((v0.brick as Brick).getPosition()).to.eql({x: 5, y: 5, z: 0})
    return expect((v0.brick as Brick).getSize()).to.eql({x: 1, y: 1, z: 1})
  })

  it("should merge two bricks 2x1", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 5, y: 5, z: 0})
    const v1 = grid.setVoxel({x: 5, y: 6, z: 0})
    const plateLayouter = new PlateLayouter()

    grid.initializeBricks()
    plateLayouter.layout(grid)

    expect(grid.getAllBricks().size).to.equal(1)
    expect(v0.brick).to.equal(v1.brick)
    expect((v0.brick as Brick).getPosition()).to.eql({x: 5, y: 5, z: 0})
    return expect((v0.brick as Brick).getSize()).to.eql({x: 1, y: 2, z: 1})
  })

  it("should merge four bricks", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 5, y: 5, z: 0})
    grid.setVoxel({x: 5, y: 6, z: 0})
    grid.setVoxel({x: 6, y: 5, z: 0})
    grid.setVoxel({x: 6, y: 6, z: 0})

    const plateLayouter = new PlateLayouter()
    grid.initializeBricks()
    plateLayouter.layout(grid)

    expect(grid.getAllBricks().size).to.equals(1)
    expect((v0.brick as Brick).getPosition()).to.eql({x: 5, y: 5, z: 0})
    return expect((v0.brick as Brick).getSize()).to.eql({x: 2, y: 2, z: 1})
  })
})
