import { expect } from "chai"
import NewBrick from "../../src/plugins/newBrickator/pipeline/Brick.js"
import Grid from "../../src/plugins/newBrickator/pipeline/Grid.js"
import type Voxel from "../../src/plugins/newBrickator/pipeline/Voxel.js"
import type Brick from "../../src/plugins/newBrickator/pipeline/Brick.js"

describe("Brick", () => {
  it("should take ownership of voxels", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 1, y: 0, z: 0})

    const nb = new NewBrick([v0, v1])

    expect(nb.voxels.size).to.equal(2)
    expect(v0.brick).to.equal(nb)
    return expect(v1.brick).to.equal(nb)
  })

  it("should iterate over all voxels exactly once", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 1, y: 0, z: 0})

    const nb = new NewBrick([v0, v1])

    let v0c = false
    let v1c = false
    let numIter = 0

    nb.forEachVoxel((voxel: Voxel) =>  {
      numIter++
      if (voxel === v0) {
        v0c = true
      }
      if (voxel === v1) {
        v1c = true
      }
    })

    expect(numIter).to.equal(2)
    expect(v0c).to.equal(true)
    return expect(v1c).to.equal(true)
  })

  it("should return the right neighbors", () => {
    const grid = new Grid()
    const vC = grid.setVoxel({x: 1, y: 1, z: 1})
    const vXp = grid.setVoxel({x: 2, y: 1, z: 1})
    const vXm = grid.setVoxel({x: 0, y: 1, z: 1})
    const vYp = grid.setVoxel({x: 1, y: 2, z: 1})
    const vYm = grid.setVoxel({x: 1, y: 0, z: 1})
    const vZp = grid.setVoxel({x: 1, y: 1, z: 2})
    const vZm = grid.setVoxel({x: 1, y: 1, z: 0})

    grid.forEachVoxel((voxel: Voxel) => new NewBrick([voxel]))

    const b = vC.brick as Brick

    const nXp = b.getNeighbors(NewBrick.direction.Xp)
    expect(nXp.size).to.equal(1)
    expect(nXp.has(vXp.brick as Brick)).to.equal(true)

    const nYp = b.getNeighbors(NewBrick.direction.Yp)
    expect(nYp.size).to.equal(1)
    expect(nYp.has(vYp.brick as Brick)).to.equal(true)

    const nXm = b.getNeighbors(NewBrick.direction.Xm)
    expect(nXm.size).to.equal(1)
    expect(nXm.has(vXm.brick as Brick)).to.equal(true)

    const nYm = b.getNeighbors(NewBrick.direction.Ym)
    expect(nYm.size).to.equal(1)
    expect(nYm.has(vYm.brick as Brick)).to.equal(true)

    const nZm = b.getNeighbors(NewBrick.direction.Zm)
    expect(nZm.size).to.equal(1)
    expect(nZm.has(vZm.brick as Brick)).to.equal(true)

    const nZp = b.getNeighbors(NewBrick.direction.Zp)
    expect(nZp.size).to.equal(1)
    return expect(nZp.has(vZp.brick as Brick)).to.equal(true)
  })

  it("should return the right connectedBricks", () => {
    let grid = new Grid()
    let v0 = grid.setVoxel({x: 0, y: 0, z: 0})

    grid.initializeBricks()

    let connectedBricks = (v0.brick as Brick).connectedBricks()
    expect(connectedBricks.size).to.equal(0)

    grid = new Grid()
    v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    grid.setVoxel({x: 0, y: 0, z: 1})

    grid.initializeBricks()

    connectedBricks = (v0.brick as Brick).connectedBricks()
    expect(connectedBricks.size).to.equal(1)

    grid = new Grid()
    grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 0, y: 0, z: 1})
    grid.setVoxel({x: 0, y: 0, z: 2})

    grid.initializeBricks()

    connectedBricks = (v1.brick as Brick).connectedBricks()
    return expect(connectedBricks.size).to.equal(2)
  })

  it("should split up", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 1, y: 0, z: 0})

    const b = new NewBrick([v0, v1])
    const newBricks = b.splitUp()

    expect(newBricks.size).to.equal(2)
    expect(v0.brick).to.not.equal(b)
    expect(v0.brick).to.not.equal(false)
    expect(v1.brick).to.not.equal(b)
    expect(v1.brick).to.not.equal(false)
    return expect(v1.brick).to.not.equal(v0.brick)
  })

  it("should clear itself", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const b = new NewBrick([v0])
    b.clear()
    expect(v0.brick).to.equal(false)
    return expect(b.voxels.size).to.equal(0)
  })

  it("should correctly merge", () => {
    const grid = new Grid()
    const v0 = grid.setVoxel({x: 0, y: 0, z: 0})
    const v1 = grid.setVoxel({x: 1, y: 0, z: 0})
    const v2 = grid.setVoxel({x: 0, y: 1, z: 0})
    const v3 = grid.setVoxel({x: 1, y: 2, z: 0})

    const b0 = new NewBrick([v0, v1])
    const b1 = new NewBrick([v2, v3])

    b0.mergeWith(b1)

    expect(v2.brick).to.equal(b0)
    expect(v3.brick).to.equal(b0)

    expect(b0.voxels.size).to.equal(4)
    return expect(b1.voxels.size).to.equal(0)
  })

  it("should report correct size", () => {
    let x: number; let y: number; let z: number
    let grid = new Grid()
    let voxels: Voxel[] = []

    for (x = 0; x < 4; x++) {
      for (y = 0; y < 3; y++) {
        for (z = 0; z < 2; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    let b = new NewBrick(voxels)
    let size = b.getSize()

    expect(size.x).to.equal(4)
    expect(size.y).to.equal(3)
    expect(size.z).to.equal(2)

    grid = new Grid()
    voxels = []

    for (x = 1; x < 4; x++) {
      for (y = 1; y < 3; y++) {
        for (z = 1; z < 2; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    b = new NewBrick(voxels)
    size = b.getSize()

    expect(size.x).to.equal(3)
    expect(size.y).to.equal(2)
    expect(size.z).to.equal(1)

    grid = new Grid()
    voxels = []

    for (x = 0; x < 2; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 3; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    b = new NewBrick(voxels)
    size = b.getSize()

    expect(size.x).to.equal(2)
    expect(size.y).to.equal(4)
    return expect(size.z).to.equal(3)
  })

  it("should report correct position", () => {
    let x: number; let y: number; let z: number
    const grid = new Grid()
    const voxels: Voxel[] = []

    for (x = 0; x < 4; x++) {
      for (y = 1; y < 3; y++) {
        for (z = 2; z < 3; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    const b = new NewBrick(voxels)
    const position = b.getPosition()

    expect(position.x).to.equal(0)
    expect(position.y).to.equal(1)
    return expect(position.z).to.equal(2)
  })

  it("should report whether it has a valid size", () => {
    // [2, 4, 3] is a valid lego brick
    let x: number; let y: number; let z: number
    let grid = new Grid()
    let voxels: Voxel[] = []

    for (x = 0; x < 2; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 3; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    let b = new NewBrick(voxels)
    expect(b.hasValidSize()).to.equal(true)

    // [1, 4, 4] is not a valid lego brick
    grid = new Grid()
    voxels = []

    for (x = 0; x < 1; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 4; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    b = new NewBrick(voxels)
    return expect(b.hasValidSize()).to.equal(false)
  })

  it("should report whether it is valid", () => {
    // [2, 4, 3] is a valid lego brick
    let x: number; let y: number; let z: number
    let grid = new Grid()
    let voxels: Voxel[] = []

    for (x = 0; x < 2; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 3; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    let b = new NewBrick(voxels)
    expect(b.isValid()).to.equal(true)

    // [2, 4, 3] is a valid lego brick
    // but give this one a hole
    grid = new Grid()
    voxels = []

    for (x = 0; x < 2; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 3; z++) {
          if (!((x === 0) && (y === 0) && (z === 0))) {
            voxels.push(grid.setVoxel({x, y, z}))
          }
        }
      }
    }

    b = new NewBrick(voxels)
    expect(b.isValid()).to.equal(false)

    // [1, 4, 4] is not a valid lego brick
    grid = new Grid()
    voxels = []

    for (x = 0; x < 1; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 4; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    b = new NewBrick(voxels)
    return expect(b.isValid()).to.equal(false)
  })

  return it("should report whether it is hole free", () => {
    let x: number; let y: number; let z: number
    let grid = new Grid()
    let voxels: Voxel[] = []

    for (x = 0; x < 2; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 3; z++) {
          voxels.push(grid.setVoxel({x, y, z}))
        }
      }
    }

    let b = new NewBrick(voxels)
    expect(b.isHoleFree()).to.equal(true)

    // give this one a hole
    grid = new Grid()
    voxels = []

    for (x = 0; x < 2; x++) {
      for (y = 0; y < 4; y++) {
        for (z = 0; z < 3; z++) {
          if (!((x === 0) && (y === 0) && (z === 0))) {
            voxels.push(grid.setVoxel({x, y, z}))
          }
        }
      }
    }

    b = new NewBrick(voxels)
    return expect(b.isHoleFree()).to.equal(false)
  })
})
