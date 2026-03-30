import log from "loglevel"
import THREE from "three"
import ThreeBSP from "./ThreeCSG.js"

interface Grid {
  spacing: { x: number; y: number; z: number }
  origin: { x: number; y: number; z: number }
  mapVoxelToWorld(voxel: { x: number; y: number; z: number }): { x: number; y: number; z: number }
}

interface VoxelInput {
  x: number
  y: number
  z: number
  studOnTop?: boolean
  studFromBelow?: boolean
}

interface VoxelUnionOptions {
  addStuds?: boolean
  threeBoxGeometryOnly?: boolean
  studSize?: { radius: number; height: number }
  holeSize?: { radius: number; height: number }
}

interface VoxelData {
  points: number[] | null
  voxel: boolean
}

interface DataStructure {
  zLayers: VoxelData[][][]
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

/*
 * creates one CSG geometry for all voxels to be 3d printed
 * @class VoxelUnion
 */
export default class VoxelUnion {
  grid: Grid

  constructor (grid: Grid) {
    this.run = this.run.bind(this)
    this._workOnVoxel = this._workOnVoxel.bind(this)
    this.grid = grid
  }

  /*
   * creates csg out of voxels. Expects an array of voxels, where
   * each voxel has to have x,y,z coordinates (in grid voxel coords) and may have
   * studOnTop / studFromBelow flags.
   * @param {Object} options
   * @param {Boolean} options.addStuds
   * @param {Boolean} options.threeBoxGeometryOnly
   */
  run (voxelsToBeGeometrized: VoxelInput[], options: VoxelUnionOptions = {}): THREE.Geometry | ThreeBSP {
    let d = new Date()

    const boxGeometry = this._createVoxelGeometry(voxelsToBeGeometrized)
    if (options.threeBoxGeometryOnly) {
      return boxGeometry
    }

    const boxGeometryBsp = new ThreeBSP(boxGeometry)
    log.debug(`Geometrizer: voxel geometry took ${String(+new Date() - +d)}ms`)

    if (options.addStuds) {
      d = new Date()
      const bspWithStuds = this._addStuds(
        boxGeometryBsp, options, voxelsToBeGeometrized, this.grid)
      log.debug(`Geometrizer: stud geometry took ${String(+new Date() - +d)}ms`)
      return bspWithStuds
    }

    return boxGeometryBsp
  }

  /*
   * create the rectangular THREE.Geometry for the voxels
   * @param {Array<Object>} voxelsToBeGeometrized Array of voxels
   */
  _createVoxelGeometry (voxelsToBeGeometrized: VoxelInput[]): THREE.Geometry {
    const dataStructure = this._prepareData(voxelsToBeGeometrized)
    const geo = new THREE.Geometry()

    for (let z = dataStructure.minZ, end = dataStructure.maxZ; z <= end; z++) {
      for (let x = dataStructure.minX, end1 = dataStructure.maxX; x <= end1; x++) {
        for (let y = dataStructure.minY, end2 = dataStructure.maxY; y <= end2; y++) {
          this._workOnVoxel(x, y, z, dataStructure, geo)
        }
      }
    }

    return geo
  }

  /*
   * creates points and faces needed for this voxel
   */
  _workOnVoxel (x: number, y: number, z: number, dataStructure: DataStructure, geo: THREE.Geometry): void {
    const s = dataStructure

    // if this is a voxel...
    if (s.zLayers[z][x][y].voxel) {
      let skipSidewalls; let upperIndices
      const v = s.zLayers[z][x][y]

      // create bottom plate if there is no voxel below us
      if (!s.zLayers[z - 1][x][y].voxel) {
        this._createGeoPoints(x, y, z, s, geo)

        // add faces clockwise, because the baseplate "looks down"
        // (we look at it from inside the model)
        const pts = v.points as number[]
        geo.faces.push(new THREE.Face3(pts[0], pts[1], pts[3]))
        geo.faces.push(new THREE.Face3(pts[3], pts[1], pts[2]))
      }

      // check if there are 4 neighbors in the same z-layer
      // (no need to create sidwalls)
      if (s.zLayers[z][x + 1][y].voxel && s.zLayers[z][x - 1][y].voxel &&
      s.zLayers[z][x][y + 1].voxel && s.zLayers[z][x][y - 1].voxel) {
        skipSidewalls = true
      }

      if (!skipSidewalls) {
        // create points for this baseplate
        this._createGeoPoints(x, y, z, s, geo)
        // create points for the voxel baseplate above this voxel
        upperIndices = this._createGeoPoints(x, y, z + 1, s, geo)
        const pts = v.points as number[]

        // create a sideplate if there is no voxel at this side
        // +x direction
        if (!s.zLayers[z][x + 1][y].voxel) {
          geo.faces.push(new THREE.Face3(
            upperIndices[3], upperIndices[0], pts[0]),
          )
          geo.faces.push(new THREE.Face3(
            pts[0], pts[3], upperIndices[3]),
          )
        }

        // -x direction
        if (!s.zLayers[z][x - 1][y].voxel) {
          geo.faces.push(new THREE.Face3(
            upperIndices[1], upperIndices[2], pts[2]),
          )
          geo.faces.push(new THREE.Face3(
            pts[2], pts[1], upperIndices[1]),
          )
        }

        // +y direction
        if (!s.zLayers[z][x][y + 1].voxel) {
          geo.faces.push(new THREE.Face3(
            upperIndices[2], upperIndices[3], pts[3]),
          )
          geo.faces.push(new THREE.Face3(
            pts[3], pts[2], upperIndices[2]),
          )
        }

        // -y direction
        if (!s.zLayers[z][x][y - 1].voxel) {
          geo.faces.push(new THREE.Face3(
            upperIndices[0], upperIndices[1], pts[0]),
          )
          geo.faces.push(new THREE.Face3(
            pts[1], pts[0], upperIndices[1]),
          )
        }
      }

      // is there a voxel above? if not, create a plate on top
      // facing upwards to close geometry
      if (!s.zLayers[z + 1][x][y].voxel) {
        upperIndices = this._createGeoPoints(x, y, z + 1, s, geo)
        geo.faces.push(new THREE.Face3(
          upperIndices[1], upperIndices[3], upperIndices[2]),
        )
        geo.faces.push(new THREE.Face3(
          upperIndices[0], upperIndices[3], upperIndices[1]),
        )
      }
    }
  }

  /*
   * creates a data structure consisting of a
   * [z][x][y] nested array out of the voxel list
   * @param {Array<Object>} voxels Array of voxels
   */
  _prepareData (voxels: VoxelInput[]): DataStructure {
    const s: DataStructure = {
      zLayers: [],
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      minZ: 0,
      maxZ: 0,
    }
    let isFirst = true

    for (const v of Array.from(voxels)) {
      // min max values
      if (isFirst) {
        s.minX = v.x
        s.minY = v.y
        s.minZ = v.z
        s.maxX = v.x
        s.maxY = v.y
        s.maxZ = v.z
        isFirst = false
      }
      s.minX = Math.min(v.x, s.minX)
      s.minY = Math.min(v.y, s.minY)
      s.minZ = Math.min(v.z, s.minZ)
      s.maxX = Math.max(v.x, s.maxX)
      s.maxY = Math.max(v.y, s.maxY)
      s.maxZ = Math.max(v.z, s.maxZ)

      // initialize structure
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (s.zLayers[v.z] == null) {
        s.zLayers[v.z] = []
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (s.zLayers[v.z][v.x] == null) {
        s.zLayers[v.z][v.x] = []
      }
      s.zLayers[v.z][v.x][v.y] = {
        // these are points for the baseplate of this voxel
        // 0---1 (as seen from above (z-Layer), x goes left, y goes downwards)
        // |   |
        // 3---2
        points: null,
        voxel: true,
      }
    }

    // go through everything and initialize empty cells with voxel=false
    // (reduces []? in algorithm)
    for (let z = s.minZ - 1, end = s.maxZ + 1; z <= end; z++) {
      for (let x = s.minX - 1, end1 = s.maxX + 1; x <= end1; x++) {
        for (let y = s.minY - 1, end2 = s.maxY + 1; y <= end2; y++) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (__guard__(s.zLayers[z] != null ? s.zLayers[z][x] : undefined, (x1: VoxelData[]) => x1[y]) == null) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (s.zLayers[z] == null) {
              s.zLayers[z] = []
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (s.zLayers[z][x] == null) {
              s.zLayers[z][x] = []
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (s.zLayers[z][x][y] == null) {
              s.zLayers[z][x][y] = {
                points: null,
                voxel: false,
              }
            }
          }
        }
      }
    }
    return s
  }

  /*
   * creates baseplate points in transformed world coordinates
   * and adds them to geometry (if they don't exist yet)
   * @return {Array} indices Array of point indices [p0, p1, p2, p3]
   */
  _createGeoPoints (x: number, y: number, z: number, structure: DataStructure, geometry: THREE.Geometry): number[] {
    // return points if they already exist
    let p0i: number; let p1i: number; let p2i: number; let p3i: number
    if (structure.zLayers[z][x][y].points != null) {
      return structure.zLayers[z][x][y].points
    }

    const voxelCenter = this.grid.mapVoxelToWorld({x, y, z})

    // delta values to move from center to edge of voxel
    const pz = voxelCenter.z - (this.grid.spacing.z / 2)
    const dx = this.grid.spacing.x / 2
    const dy = this.grid.spacing.y / 2

    // check if this point already exists in a neighbor voxel
    // (a point can be used by up to 4 voxels in a layer, so check
    // if it already has been generated to prevent duplicates)

    // x----x----x----x  <---x---
    // |0  1|0  1|0  1|  |
    // |3  2|3  2|3  2|  y
    // x----§----x----x  |  point § of selected voxel can already exist as
    // |0  1|sel.|0  1|  v  point 1, 2 or 3 of neighbor voxels
    // |3  2|vox |3  2|
    // x----x----x----x
    // |0  1|0  1|0  1|
    // |3  2|3  2|3  2|
    // x----x----x----x

    // p0
    const vd_xp1_y = structure.zLayers[z][x + 1][y]
    const vd_xp1_ym1 = structure.zLayers[z][x + 1][y - 1]
    const vd_x_ym1 = structure.zLayers[z][x][y - 1]
    if (vd_xp1_y.points != null) {
      p0i = vd_xp1_y.points[1]
    }
    else if (vd_xp1_ym1.points != null) {
      p0i = vd_xp1_ym1.points[2]
    }
    else if (vd_x_ym1.points != null) {
      p0i = vd_x_ym1.points[3]
    }
    else {
      // this point did not exist, therefore create it
      const p0 = {
        x: voxelCenter.x + dx,
        y: voxelCenter.y - dy,
        z: pz,
      }
      geometry.vertices.push(new THREE.Vector3(p0.x, p0.y, p0.z))
      p0i = geometry.vertices.length - 1
    }

    // p1
    const vd_xm1_ym1 = structure.zLayers[z][x - 1][y - 1]
    const vd_xm1_y = structure.zLayers[z][x - 1][y]
    if (vd_x_ym1.points != null) {
      p1i = vd_x_ym1.points[2]
    }
    else if (vd_xm1_ym1.points != null) {
      p1i = vd_xm1_ym1.points[3]
    }
    else if (vd_xm1_y.points != null) {
      p1i = vd_xm1_y.points[0]
    }
    else {
      const p1 = {
        x: voxelCenter.x - dx,
        y: voxelCenter.y - dy,
        z: pz,
      }
      geometry.vertices.push(new THREE.Vector3(p1.x, p1.y, p1.z))
      p1i = geometry.vertices.length - 1
    }

    // p2
    const vd_xm1_yp1 = structure.zLayers[z][x - 1][y + 1]
    const vd_x_yp1 = structure.zLayers[z][x][y + 1]
    if (vd_xm1_y.points != null) {
      p2i = vd_xm1_y.points[3]
    }
    else if (vd_xm1_yp1.points != null) {
      p2i = vd_xm1_yp1.points[0]
    }
    else if (vd_x_yp1.points != null) {
      p2i = vd_x_yp1.points[1]
    }
    else {
      const p2 = {
        x: voxelCenter.x - dx,
        y: voxelCenter.y + dy,
        z: pz,
      }
      geometry.vertices.push(new THREE.Vector3(p2.x, p2.y, p2.z))
      p2i = geometry.vertices.length - 1
    }

    // p3
    const vd_xp1_yp1 = structure.zLayers[z][x + 1][y + 1]
    if (vd_x_yp1.points != null) {
      p3i = vd_x_yp1.points[0]
    }
    else if (vd_xp1_yp1.points != null) {
      p3i = vd_xp1_yp1.points[1]
    }
    else if (vd_xp1_y.points != null) {
      p3i = vd_xp1_y.points[2]
    }
    else {
      const p3 = {
        x: voxelCenter.x + dx,
        y: voxelCenter.y + dy,
        z: pz,
      }
      geometry.vertices.push(new THREE.Vector3(p3.x, p3.y, p3.z))
      p3i = geometry.vertices.length - 1
    }

    // set points
    structure.zLayers[z][x][y].points = [p0i, p1i, p2i, p3i]
    return structure.zLayers[z][x][y].points
  }

  /*
   * adds studs on top, subtracts studs from below
   */
  _addStuds (boxGeometry: ThreeBSP, options: VoxelUnionOptions, voxelsToBeGeometrized: VoxelInput[], grid: Grid): ThreeBSP {
    if (options.studSize == null || options.holeSize == null) {
      throw new Error("studSize and holeSize are required for addStuds")
    }
    const studGeometry = this._createStudGeometry(
      this.grid.spacing, options.studSize, options.holeSize,
    )
    let unionBsp = boxGeometry

    for (const voxel of Array.from(voxelsToBeGeometrized)) {
      // if this is the lowest voxel to be printed, or
      // there is lego below this voxel, subtract a stud
      // to make it fit to lego bricks
      let studBsp: ThreeBSP; let studMesh: THREE.Mesh
      if (voxel.studFromBelow) {
        studMesh = new THREE.Mesh(studGeometry.studGeometryBottom, undefined)
        studMesh.translateX( grid.origin.x + (grid.spacing.x * voxel.x) )
        studMesh.translateY( grid.origin.y + (grid.spacing.y * voxel.y) )
        studMesh.translateZ( grid.origin.z + (grid.spacing.z * voxel.z) )

        studBsp = new ThreeBSP(studMesh)
        unionBsp = unionBsp.subtract(studBsp)
      }

      // create a stud for lego above this voxel
      if (voxel.studOnTop) {
        studMesh = new THREE.Mesh(studGeometry.studGeometryTop, undefined)
        studMesh.translateX( grid.origin.x + (grid.spacing.x * voxel.x) )
        studMesh.translateY( grid.origin.y + (grid.spacing.y * voxel.y) )
        studMesh.translateZ( grid.origin.z + (grid.spacing.z * voxel.z) )

        studBsp = new ThreeBSP(studMesh)
        unionBsp = unionBsp.union(studBsp)
      }
    }

    return unionBsp
  }

  /*
   * creates Geometry needed for CSG operations
   */
  _createStudGeometry (gridSpacing: { x: number; y: number; z: number }, studSize: { radius: number; height: number }, holeSize: { radius: number; height: number }) {
    // Since this voxel geometry is subtracted from 3d printed geometry,
    // stud and hole sizes however are meant to be '3d-printed studs/holes'
    // the values for studs (creates 3d printed holes) and holes
    // (creates 3d printed studs) have to be switched

    const studRotation = new THREE.Matrix4()
      .makeRotationX(3.14159 / 2)
    const dzBottom = -(gridSpacing.z / 2) + (studSize.height / 2)
    const studTranslationBottom = new THREE.Matrix4()
      .makeTranslation(0, 0, dzBottom)
    const dzTop = (gridSpacing.z / 2) + (holeSize.height / 2)
    const studTranslationTop = new THREE.Matrix4()
      .makeTranslation(0, 0, dzTop)

    const studGeometryBottom = new THREE.CylinderGeometry(
      studSize.radius, studSize.radius, studSize.height, 20,
    )
    const studGeometryTop = new THREE.CylinderGeometry(
      holeSize.radius, holeSize.radius, holeSize.height, 20,
    )

    studGeometryBottom.applyMatrix(studRotation)
    studGeometryTop.applyMatrix(studRotation)
    studGeometryBottom.applyMatrix(studTranslationBottom)
    studGeometryTop.applyMatrix(studTranslationTop)

    return {
      // The shape of a stud that is subtracted from the bottom of the voxel
      studGeometryBottom,
      // The shape of a stud that is added on top of a voxel
      studGeometryTop,
    }
  }
}

function __guard__<T, R> (value: T | null | undefined, transform: (value: T) => R): R | undefined {
  return typeof value !== "undefined" && value !== null ? transform(value) : undefined
}
