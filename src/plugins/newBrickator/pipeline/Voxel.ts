import Brick from "./Brick.js"

interface Position {
  x: number
  y: number
  z: number
}

interface VoxelNeighbors {
  Zp: Voxel | null
  Zm: Voxel | null
  Xp: Voxel | null
  Xm: Voxel | null
  Yp: Voxel | null
  Ym: Voxel | null
}

export default class Voxel {
  position: Position
  brick: Brick | false
  enabled: boolean
  neighbors: VoxelNeighbors

  constructor (position: Position) {
    this.isLego = this.isLego.bind(this)
    this.makeLego = this.makeLego.bind(this)
    this.make3dPrinted = this.make3dPrinted.bind(this)
    this.position = position
    this.brick = false
    this.enabled = true
    this.neighbors = {
      Zp: null,
      Zm: null,
      Xp: null,
      Xm: null,
      Yp: null,
      Ym: null,
    }
  }

  static sizeFromVoxels: (voxels: Set<Voxel>) => { x: number; y: number; z: number }
  static fractionOfConnections: (voxels: Set<Voxel>) => number

  static initClass () {
    this.sizeFromVoxels = (voxels: Set<Voxel>) => {
      const size: { minX?: number; maxX?: number; minY?: number; maxY?: number; minZ?: number; maxZ?: number } = {}
      voxels.forEach((voxel: Voxel) => {
        // init values
        if (size.maxX == null) {
          size.maxX = size.minX != null ? size.minX : size.minX = voxel.position.x
        }
        if (size.maxY == null) {
          size.maxY = size.minY != null ? size.minY : size.minY = voxel.position.y
        }
        if (size.maxZ == null) {
          size.maxZ = size.minZ != null ? size.minZ : size.minZ = voxel.position.z
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (size.minX! > voxel.position.x) {
          size.minX = voxel.position.x
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (size.minY! > voxel.position.y) {
          size.minY = voxel.position.y
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (size.minZ! > voxel.position.z) {
          size.minZ = voxel.position.z
        }

        if (size.maxX < voxel.position.x) {
          size.maxX = voxel.position.x
        }
        if (size.maxY < voxel.position.y) {
          size.maxY = voxel.position.y
        }
        if (size.maxZ < voxel.position.z) {
          size.maxZ = voxel.position.z
        }
      })

      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      return {
        x: (size.maxX! - size.minX!) + 1,
        y: (size.maxY! - size.minY!) + 1,
        z: (size.maxZ! - size.minZ!) + 1,
      }
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    }

    this.fractionOfConnections = (voxels: Set<Voxel>) => {
      let minZ: number | null = null
      let maxZ: number | null = null

      let voxelCounter = 0
      let connectionCounter = 0

      voxels.forEach((voxel: Voxel) => {
        if (maxZ == null) {
          maxZ = minZ != null ? minZ : minZ = voxel.position.z
        }
        if (maxZ < voxel.position.z) {
          maxZ = voxel.position.z
        }
      })
      voxels.forEach((voxel: Voxel) => {
        if (voxel.position.z === maxZ) {
          voxelCounter++
          if (voxel.neighbors.Zp !== null) {
            connectionCounter++
          }
        }
        else if (voxel.position.z === minZ) {
          voxelCounter++
          if (voxel.neighbors.Zm !== null) {
            connectionCounter++
          }
        }
      })

      return connectionCounter / voxelCounter
    }
  }

  isLego () {
    return this.enabled
  }

  makeLego () {
    return this.enabled = true
  }

  make3dPrinted () {
    return this.enabled = false
  }
}
Voxel.initClass()
