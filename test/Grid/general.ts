import { expect } from "chai"

import Grid from "../../src/plugins/newBrickator/pipeline/Grid.js"
import type Voxel from "../../src/plugins/newBrickator/pipeline/Voxel.js"

describe("Grid", () => {
  it("should set a voxel", () => {
    const grid = new Grid()
    grid.setVoxel({x: 0, y: 0, z: 0})
    return expect(grid.hasVoxelAt(0, 0, 0)).to.equal(true)
  })

  it("should correctly report whether it has a voxel at a position", () => {
    const grid = new Grid()

    grid.setVoxel({x: 0, y: 0, z: 0})
    grid.setVoxel({x: 0, y: 0, z: 1})
    grid.setVoxel({x: 0, y: 2, z: 0})
    grid.setVoxel({x: 3, y: 0, z: 0})

    expect(grid.hasVoxelAt(0, 0, 0)).to.equal(true)
    expect(grid.hasVoxelAt(0, 0, 1)).to.equal(true)
    expect(grid.hasVoxelAt(0, 2, 0)).to.equal(true)
    expect(grid.hasVoxelAt(3, 0, 0)).to.equal(true)

    expect(grid.hasVoxelAt(5, 0, 1)).to.equal(false)
    expect(grid.hasVoxelAt(0, 5, 0)).to.equal(false)
    return expect(grid.hasVoxelAt(0, 1, 0)).to.equal(false)
  })

  it("should enumerate over all voxels", () => {
    const grid = new Grid()

    grid.setVoxel({x: 1, y: 0, z: 0})
    grid.setVoxel({x: 0, y: 1, z: 0})
    grid.setVoxel({x: 0, y: 0, z: 1})

    let e1 = false
    let e2 = false
    let e3 = false
    let numEnum = 0

    grid.forEachVoxel((voxel: Voxel) => {
      numEnum++
      const p = voxel.position

      if ((p.x === 1) && (p.y === 0) && (p.z === 0)) {
        e1 = true
      }
      if ((p.x === 0) && (p.y === 1) && (p.z === 0)) {
        e2 = true
      }
      if ((p.x === 0) && (p.y === 0) && (p.z === 1)) {
        e3 = true
      }
    })

    expect(numEnum).to.equal(3)
    expect(e1).to.equal(true)
    expect(e2).to.equal(true)
    return expect(e3).to.equal(true)
  })

  it("should return the right voxel", () => {
    const grid = new Grid()

    grid.setVoxel({x: 1, y: 2, z: 3})

    let v = grid.getVoxel(0, 0, 0)
    expect(v).to.equal(undefined)

    v = grid.getVoxel(1, 2, 3)
    return expect(v).not.to.be.null
  })

  it("should link voxels correctly", () => {
    const grid = new Grid()

    const c = grid.setVoxel({x: 1, y: 1, z: 1})
    const xp = grid.setVoxel({x: 2, y: 1, z: 1})
    const xm = grid.setVoxel({x: 0, y: 1, z: 1})
    const yp = grid.setVoxel({x: 1, y: 2, z: 1})
    const ym = grid.setVoxel({x: 1, y: 0, z: 1})
    const zp = grid.setVoxel({x: 1, y: 1, z: 2})
    const zm = grid.setVoxel({x: 1, y: 1, z: 0})

    expect(c.neighbors.Xp).to.equal(xp)
    expect(c.neighbors.Xm).to.equal(xm)
    expect(c.neighbors.Yp).to.equal(yp)
    expect(c.neighbors.Ym).to.equal(ym)
    expect(c.neighbors.Zp).to.equal(zp)
    expect(c.neighbors.Zm).to.equal(zm)

    expect(xp.neighbors.Xm).to.equal(c)
    expect(xm.neighbors.Xp).to.equal(c)
    expect(yp.neighbors.Ym).to.equal(c)
    expect(ym.neighbors.Yp).to.equal(c)
    expect(zp.neighbors.Zm).to.equal(c)
    return expect(zm.neighbors.Zp).to.equal(c)
  })

  it("should initialize grid", () => {
    const grid = new Grid()

    grid.setVoxel({x: 0, y: 0, z: 0})
    grid.setVoxel({x: 1, y: 0, z: 0})

    void grid.initializeBricks()
    const bricks = grid.getAllBricks()

    return expect(bricks.size).to.equal(2)
  })

  it("should initialize correct number of bricks", () => {
    const grid = new Grid()
    const numVoxelsX = 5
    const numVoxelsY = 4
    const numVoxelsZ = 6

    for (let x = 0, end = numVoxelsX, asc = end >= 0; asc ? x < end : x > end; asc ? x++ : x--) {
      for (let y = 0, end1 = numVoxelsY, asc1 = end1 >= 0; asc1 ? y < end1 : y > end1; asc1 ? y++ : y--) {
        for (let z = 0, end2 = numVoxelsZ, asc2 = end2 >= 0; asc2 ? z < end2 : z > end2; asc2 ? z++ : z--) {
          grid.setVoxel({ x, y, z })
        }
      }
    }

    void grid.initializeBricks()

    const bricks = grid.getAllBricks()
    const numVoxels = numVoxelsX * numVoxelsY * numVoxelsZ
    return expect(bricks.size).to.equal(numVoxels)
  })

  it("should return correct number of bricks for a 1x1x1 configuration", () => {
    const testGrid = new Grid()
    testGrid.setVoxel({x: 0, y: 0, z: 0})

    void testGrid.initializeBricks()

    return expect(testGrid.getAllBricks().size).to.equal(1)
  })
})
