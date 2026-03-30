import THREE, { Matrix4 } from "three"

import Voxel from "./Voxel.js"
import Brick from "./Brick.js"
import * as Random from "./Random.js"

interface Point3D {
  x: number
  y: number
  z: number
}

interface GridSpacing {
  x: number
  y: number
  z: number
}

type VoxelMap = Partial<Record<string, Voxel>>

interface Model {
  getBoundingBox: () => Promise<{ min: Point3D; max: Point3D }>
}

export interface SetupOptions {
  modelTransform?: Matrix4
}

export default class Grid {
  spacing: GridSpacing
  origin: Point3D
  heightRatio: number
  voxels: VoxelMap
  modelTransform?: Matrix4
  private _maxVoxelX: number = 0
  private _maxVoxelY: number = 0
  private _maxVoxelZ: number = 0
  private _minVoxelX: number = 0
  private _minVoxelY: number = 0
  private _minVoxelZ: number = 0

  constructor (spacing?: GridSpacing) {
    this.setUpForModel = this.setUpForModel.bind(this)
    this.getNumVoxelsX = this.getNumVoxelsX.bind(this)
    this.getNumVoxelsY = this.getNumVoxelsY.bind(this)
    this.getNumVoxelsZ = this.getNumVoxelsZ.bind(this)
    this.getLegoVoxelsZRange = this.getLegoVoxelsZRange.bind(this)
    this.getMaxZ = this.getMaxZ.bind(this)
    this._updateMinMax = this._updateMinMax.bind(this)
    this.mapWorldToGrid = this.mapWorldToGrid.bind(this)
    this.mapModelToGrid = this.mapModelToGrid.bind(this)
    this.mapModelToVoxelSpace = this.mapModelToVoxelSpace.bind(this)
    this.mapGridToVoxel = this.mapGridToVoxel.bind(this)
    this.mapVoxelToGrid = this.mapVoxelToGrid.bind(this)
    this.mapVoxelToWorld = this.mapVoxelToWorld.bind(this)
    this.getVoxel = this.getVoxel.bind(this)
    this.hasVoxelAt = this.hasVoxelAt.bind(this)
    this.forEachVoxel = this.forEachVoxel.bind(this)
    this.getDisabledVoxels = this.getDisabledVoxels.bind(this)
    this.getNeighbors = this.getNeighbors.bind(this)
    this.getSurrounding = this.getSurrounding.bind(this)
    this.initializeBricks = this.initializeBricks.bind(this)
    this.getAllBricks = this.getAllBricks.bind(this)
    this.getAllVoxels = this.getAllVoxels.bind(this)
    this.chooseRandomBrick = this.chooseRandomBrick.bind(this)
    this.intersectVoxels = this.intersectVoxels.bind(this)
    this._intersectVoxel = this._intersectVoxel.bind(this)
    if (spacing == null) {
      spacing = {x: 8, y: 8, z: 3.2}
    }
    this.spacing = spacing
    this.origin = {x: 0, y: 0, z: 0}
    this.heightRatio = ((this.spacing.x + this.spacing.y) / 2) / this.spacing.z

    this.voxels = {}
  }

  setUpForModel (model: Model, options: SetupOptions) {
    if (options.modelTransform !== undefined) {
      this.modelTransform = options.modelTransform
    }

    return model
      .getBoundingBox()
      .then((boundingBox: { min: Point3D; max: Point3D }) => {
        // If the object is moved in the scene (not in the origin),
        // think about that while building the grid
        let bbMinWorld: Point3D
        if (this.modelTransform) {
          const vec = new THREE.Vector3(
            boundingBox.min.x,
            boundingBox.min.y,
            boundingBox.min.z,
          )
          vec.applyProjection(this.modelTransform)
          bbMinWorld = vec
        }
        else {
          bbMinWorld = boundingBox.min
        }

        // 1.) Align bb minimum to next voxel position
        // 2.) spacing / 2 is subtracted to make the grid be aligned to the
        // voxel center
        // 3.) minimum z is to assure that grid is never below z=0
        let calculatedZ = Math.floor(bbMinWorld.z / this.spacing.z) * this.spacing.z
        calculatedZ -= this.spacing.z / 2
        const minimumZ = this.spacing.z / 2

        return this.origin = {
          x: (Math.floor(bbMinWorld.x / this.spacing.x) *
          this.spacing.x) - (this.spacing.x / 2),
          y: (Math.floor(bbMinWorld.y / this.spacing.y) *
          this.spacing.y) - (this.spacing.y / 2),
          z: Math.max(calculatedZ, minimumZ),
        }
      })
  }

  getNumVoxelsX () {
    return (this._maxVoxelX - this._minVoxelX) + 1
  }

  getNumVoxelsY () {
    return (this._maxVoxelY - this._minVoxelY) + 1
  }

  getNumVoxelsZ () {
    return (this._maxVoxelZ - this._minVoxelZ) + 1
  }

  getLegoVoxelsZRange () {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY

    this.forEachVoxel((voxel: Voxel): void => {
      if (!voxel.isLego()) {
        return
      }
      min = Math.min(min, voxel.position.z)
      max = Math.max(max, voxel.position.z)
    })

    return {
      min: min === Number.POSITIVE_INFINITY ? null : min,
      max: max === Number.NEGATIVE_INFINITY ? null : max,
    }
  }

  // Use this if you are not interested in the actual number of layers
  // e.g. if you want to use them zero-indexed
  getMaxZ () {
    return this._maxVoxelZ
  }

  _updateMinMax ({x, y, z}: Point3D) {
    this._maxVoxelX = Math.max(this._maxVoxelX, x)
    this._maxVoxelY = Math.max(this._maxVoxelY, y)
    this._maxVoxelZ = Math.max(this._maxVoxelZ, z)

    this._minVoxelX = Math.min(this._minVoxelX, x)
    this._minVoxelY = Math.min(this._minVoxelY, y)
    return this._minVoxelZ = Math.min(this._minVoxelZ, z)
  }

  mapWorldToGrid (point: Point3D): Point3D {
    // Maps world coordinates to aligned grid coordinates
    // aligned grid coordinates are world units, but relative to the
    // grid origin

    return {
      x: point.x - this.origin.x,
      y: point.y - this.origin.y,
      z: point.z - this.origin.z,
    }
  }

  mapModelToGrid (point: Point3D): Point3D {
    // Maps the model local coordinates to the grid coordinates by first
    // transforming it with the modelTransform to world coordinates
    // and then converting it to aligned grid coordinates

    if (this.modelTransform != null) {
      const v = new THREE.Vector3(point.x, point.y, point.z)
      v.applyProjection(this.modelTransform)
      return this.mapWorldToGrid(v)
    }
    else {
      // If model is placed at 0|0|0,
      // model and world coordinates are in the same system
      return this.mapWorldToGrid(point)
    }
  }

  mapModelToVoxelSpace (point: Point3D): Point3D {
    const gridPoint = this.mapModelToGrid(point)
    return this.mapGridToVoxel(gridPoint, false)
  }

  mapGridToVoxel (point: Point3D, round?: boolean): Point3D {
    // Maps aligned grid coordinates to voxel indices
    // cut z<0 to z=0, since the grid cannot have
    // voxels in negative direction
    if (round == null) {
      round = true
    }
    let x = point.x / this.spacing.x
    let y = point.y / this.spacing.y
    let z = Math.max(point.z / this.spacing.z, 0)
    if (round) {
      x = Math.round(x)
      y = Math.round(y)
      z = Math.round(z)
    }
    return {x, y, z}
  }

  mapVoxelToGrid (point: Point3D): Point3D {
    // Maps voxel indices to aligned grid coordinates
    return {
      x: point.x * this.spacing.x,
      y: point.y * this.spacing.y,
      z: point.z * this.spacing.z,
    }
  }

  mapVoxelToWorld (point: Point3D): Point3D {
    // Maps voxel indices to world coordinates
    const relative = this.mapVoxelToGrid(point)
    return {
      x: relative.x + this.origin.x,
      y: relative.y + this.origin.y,
      z: relative.z + this.origin.z,
    }
  }

  mapVoxelSpaceToVoxel (point: Point3D): Point3D {
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
      z: Math.round(point.z),
    }
  }

  // Generates a key for a hashmap from the given coordinates
  _generateKey (x: number, y: number, z: number): string {
    return `${String(x)}-${String(y)}-${String(z)}`
  }

  setVoxel (position: Point3D): Voxel {
    const key = this._generateKey(position.x, position.y, position.z)
    let v = this.voxels[key]

    if (v == null) {
      v = new Voxel(position)
      this._linkNeighbors(v)
      this.voxels[key] = v
      this._updateMinMax(position)
    }
    return v
  }

  // Links neighbors of this voxel with this voxel
  _linkNeighbors (voxel: Voxel): void {
    const p = voxel.position

    const zp = this.getVoxel(p.x, p.y, p.z + 1)
    const zm = this.getVoxel(p.x, p.y, p.z - 1)
    const xp = this.getVoxel(p.x + 1, p.y, p.z)
    const xm = this.getVoxel(p.x - 1, p.y, p.z)
    const yp = this.getVoxel(p.x, p.y + 1, p.z)
    const ym = this.getVoxel(p.x, p.y - 1, p.z)

    if (zp) {
      voxel.neighbors.Zp = zp
      zp.neighbors.Zm = voxel
    }

    if (zm) {
      voxel.neighbors.Zm = zm
      zm.neighbors.Zp = voxel
    }

    if (xp) {
      voxel.neighbors.Xp = xp
      xp.neighbors.Xm = voxel
    }

    if (xm) {
      voxel.neighbors.Xm = xm
      xm.neighbors.Xp = voxel
    }

    if (yp) {
      voxel.neighbors.Yp = yp
      yp.neighbors.Ym = voxel
    }

    if (ym) {
      voxel.neighbors.Ym = ym
      ym.neighbors.Yp = voxel
    }
  }

  getVoxel (x: number, y: number, z: number): Voxel | undefined {
    return this.voxels[this._generateKey(x, y, z)]
  }

  hasVoxelAt (x: number, y: number, z: number): boolean {
    return this.voxels[this._generateKey(x, y, z)] != null
  }

  forEachVoxel (callback: (voxel: Voxel) => void) {
    for (const key of Object.keys(this.voxels)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      callback(this.voxels[key]!)
    }
  }

  getDisabledVoxels (): Voxel[] {
    const voxels: Voxel[] = []
    this.forEachVoxel((voxel) => {
      if (!voxel.enabled) {
        voxels.push(voxel)
      }
    })
    return voxels
  }

  getNeighbors (x: number, y: number, z: number, selectionCallback: (voxel: Voxel) => boolean): Voxel[] {
    // Returns a list of neighbors for this voxel position.
    // the selectionCallback(neighbor) defines what to return
    // and has to return true, if the voxel neighbor should be collected
    const list: Voxel[] = []

    const pos = [
      [x + 1, y, z],
      [x - 1, y, z],
      [x, y + 1, z],
      [x, y - 1, z],
      [x, y, z + 1],
      [x, y, z - 1],
    ]

    for (const [px, py, pz] of pos) {
      const v = this.voxels[this._generateKey(px, py, pz)]
      if ((v != null) && selectionCallback(v)) {
        list.push(v)
      }
    }

    return list
  }

  getSurrounding ({x, y, z}: Point3D, size: Point3D): Voxel[] {
    const list: Voxel[] = []

    const _collect = (vx: number, vy: number, vz: number) => {
      const voxel = this.voxels[this._generateKey(vx, vy, vz)]
      if (voxel != null) {
        list.push(voxel)
      }
    }

    const sizeX_2 = Math.floor(size.x / 2)
    const sizeY_2 = Math.floor(size.y / 2)
    const sizeZ_2 = Math.floor(size.z / 2)
    for (let vx = x - sizeX_2, end = x + sizeX_2; vx <= end; vx++) {
      for (let vy = y - sizeY_2, end1 = y + sizeY_2; vy <= end1; vy++) {
        for (let vz = z - sizeZ_2, end2 = z + sizeZ_2; vz <= end2; vz++) {
          _collect(vx, vy, vz)
        }
      }
    }

    return list
  }

  // Initializes the grid with a 1x1x1 brick for each voxel
  // Overrides existing bricks
  initializeBricks () {
    this.forEachVoxel((voxel: Voxel) => new Brick([voxel]))
    return Promise.resolve(this)
  }

  // Returns all bricks as a set
  getAllBricks (): Set<Brick> {
    const bricks = new Set<Brick>()

    this.forEachVoxel((voxel) => {
      if (voxel.enabled && voxel.brick) {
        bricks.add(voxel.brick)
      }
    })

    return bricks
  }

  getAllVoxels (): Set<Voxel> {
    const voxels = new Set<Voxel>()
    this.forEachVoxel((voxel: Voxel) => voxels.add(voxel))
    return voxels
  }

  // Chooses a random brick
  chooseRandomBrick (): Brick {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const x = this._minVoxelX + Random.next(this.getNumVoxelsX())
      const y = this._minVoxelY + Random.next(this.getNumVoxelsY())
      const z = this._minVoxelZ + Random.next(this.getNumVoxelsZ())

      const vox = this.getVoxel(x, y, z)

      if ((vox != null) && vox.brick) {
        return vox.brick
      }
    }
  }

  // Inserts voxels from a three-dimensional array in [x][y][z] order
  fromPojo (pojo: Record<string, Record<string, Record<string, unknown>>>) {
    const result: Voxel[][][] = []
    for (const xStr in pojo) {
      const voxelPlane = pojo[xStr]
      const x = parseInt(xStr)
      const result1: Voxel[][] = []
      for (const yStr in voxelPlane) {
        const voxelColumn = voxelPlane[yStr]
        const y = parseInt(yStr)
        const result2: Voxel[] = []
        for (const zStr in voxelColumn) {
          const z = parseInt(zStr)
          result2.push(this.setVoxel({x, y, z}))
        }
        result1.push(result2)
      }
      result.push(result1)
    }
    return result
  }

  intersectVoxels (rayOrigin: Point3D, rayDirection: Point3D): { distance: number; voxel: Voxel }[] {
    const dirfrac = {
      x: 1.0 / rayDirection.x,
      y: 1.0 / rayDirection.y,
      z: 1.0 / rayDirection.z,
    }

    const intersections: { distance: number; voxel: Voxel }[] = []

    this.forEachVoxel((voxel: Voxel) => {
      const distance = this._intersectVoxel(voxel, dirfrac, rayOrigin)
      if (distance > 0) {
        intersections.push({
          distance,
          voxel,
        })
      }
    })

    intersections.sort((a, b) => a.distance - b.distance)
    return intersections
  }

  // Intersects a ray (1/direction + origin) with a voxel. returns the distance
  // until intersection, a value <0 means no intersection
  _intersectVoxel (voxel: Voxel, dirfrac: Point3D, rayOrigin: Point3D): number {
    // Source: http://gamedev.stackexchange.com/questions/18436/

    const worldPosition = this.mapVoxelToWorld(voxel.position)
    const lower = {
      x: worldPosition.x - (this.spacing.x / 2.0),
      y: worldPosition.y - (this.spacing.y / 2.0),
      z: worldPosition.z - (this.spacing.z / 2.0),
    }
    const upper = {
      x: worldPosition.x + (this.spacing.x / 2.0),
      y: worldPosition.y + (this.spacing.y / 2.0),
      z: worldPosition.z + (this.spacing.z / 2.0),
    }

    const t1 = (lower.x - rayOrigin.x) * dirfrac.x
    const t2 = (upper.x - rayOrigin.x) * dirfrac.x
    const t3 = (lower.y - rayOrigin.y) * dirfrac.y
    const t4 = (upper.y - rayOrigin.y) * dirfrac.y
    const t5 = (lower.z - rayOrigin.z) * dirfrac.z
    const t6 = (upper.z - rayOrigin.z) * dirfrac.z

    const tmin = Math.max(
      Math.min(t1, t2), Math.min(t3, t4), Math.min(t5, t6),
    )
    const tmax = Math.min(
      Math.max(t1, t2), Math.max(t3, t4), Math.max(t5, t6),
    )

    if ((tmax < 0) || (tmin > tmax)) {
      return -1
    }
    else {
      return tmin
    }
  }
}
