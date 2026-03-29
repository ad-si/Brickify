import * as THREE from "three"
import { expect } from "chai"

import Grid from "../../src/plugins/newBrickator/pipeline/Grid.js"
import VoxelUnion from "../../src/plugins/csg/VoxelUnion.js"

describe("VoxelUnion", () => {
  const grid = new Grid()
  grid.origin = {x: 0, y: 0, z: 0}

  it("should create a single cube csg", () => {
    const vg = new VoxelUnion(grid)
    const bsp = vg.run([ {x: 0, y: 0, z: 0} ])
    const {
      geometry,
    } = (bsp as any).toMesh(null)

    expect(geometry.faces.length).to.equal(12)
    expect(geometry.vertices.length).to.equal(8)

    const expectedFaceIndices = [
      0, 1, 2, 2, 1, 3, 4, 5, 0, 0, 2, 4, 6, 7, 3, 3, 1, 6, 7, 4, 2, 2, 3, 7, 5,
      6, 0, 1, 0, 6, 6, 4, 7, 5, 4, 6,
    ]
    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it("should create a 2x2 plate csg", () => {
    const vg = new VoxelUnion(grid)
    const bsp = vg.run([
      {x: 0, y: 0, z: 0},
      {x: 1, y: 0, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 0, y: 1, z: 0},
    ])
    const {
      geometry,
    } = (bsp as any).toMesh(null)

    expect(geometry.faces.length).to.equal(32)
    expect(geometry.vertices.length).to.equal(18)

    const expectedFaceIndices = [
      0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 6, 0, 7, 7, 0, 2, 7, 2, 8, 8, 2, 4, 9,
      10, 3, 3, 1, 9, 10, 11, 5, 5, 3, 10, 12, 9, 0, 1, 0, 9, 13, 12, 6, 0, 6,
      12, 9, 14, 10, 12, 14, 9, 10, 15, 11, 14, 15, 10, 12, 16, 14, 13, 16, 12,
      14, 17, 15, 16, 17, 14, 11, 15, 4, 4, 5, 11, 15, 17, 8, 8, 4, 15, 16, 13,
      6, 6, 7, 16, 17, 16, 7, 7, 8, 17,
    ]

    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it("should create a 2x2x2 cube csg with 26 vertices", () => {
    const vg = new VoxelUnion(grid)
    const bsp = vg.run([
      {x: 0, y: 0, z: 0},
      {x: 1, y: 0, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 0, y: 0, z: 1},
      {x: 1, y: 0, z: 1},
      {x: 1, y: 1, z: 1},
      {x: 0, y: 1, z: 1},
    ])
    const {
      geometry,
    } = (bsp as any).toMesh(null)

    expect(geometry.faces.length).to.equal(48)
    expect(geometry.vertices.length).to.equal(26)

    const expectedFaceIndices = [
      0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 6, 0, 7, 7, 0, 2, 7, 2, 8, 8, 2, 4, 9,
      10, 3, 3, 1, 9, 10, 11, 5, 5, 3, 10, 12, 13, 10, 10, 9, 12, 13, 14, 11,
      11, 10, 13, 15, 9, 0, 1, 0, 9, 16, 15, 6, 0, 6, 15, 17, 12, 15, 9, 15, 12,
      18, 17, 16, 15, 16, 17, 11, 19, 4, 4, 5, 11, 19, 20, 8, 8, 4, 19, 14, 21,
      19, 19, 11, 14, 21, 22, 20, 20, 19, 21, 23, 16, 6, 6, 7, 23, 20, 23, 7, 7,
      8, 20, 24, 18, 16, 16, 23, 24, 22, 24, 23, 23, 20, 22, 12, 25, 13, 17, 25,
      12, 13, 21, 14, 25, 21, 13, 17, 24, 25, 18, 24, 17, 25, 22, 21, 24, 22, 25,
    ]
    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it("should create a 2x2x2 cube THREE.Geometry with 27 vertices", () => {
    // the algorithm creates a point in the middle of the cube,
    // which is then not used in the geometry

    const vg = new VoxelUnion(grid)
    const geometry = vg._createVoxelGeometry([
      {x: 0, y: 0, z: 0},
      {x: 1, y: 0, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 0, y: 0, z: 1},
      {x: 1, y: 0, z: 1},
      {x: 1, y: 1, z: 1},
      {x: 0, y: 1, z: 1},
    ])

    expect(geometry.faces.length).to.equal(48)
    expect(geometry.vertices.length).to.equal(27)

    const expectedFaceIndices = [
      0, 1, 3, 3, 1, 2, 5, 6, 2, 2, 1, 5, 4, 5, 0, 1, 0, 5, 3, 2, 9, 9, 2, 8, 6,
      10, 8, 8, 2, 6, 10, 11, 9, 9, 8, 10, 12, 0, 13, 13, 0, 3, 15, 14, 12, 12,
      13, 15, 14, 4, 12, 0, 12, 4, 13, 3, 16, 16, 3, 9, 17, 15, 13, 13, 16, 17,
      11, 17, 16, 16, 9, 11, 19, 20, 6, 6, 5, 19, 18, 19, 4, 5, 4, 19, 19, 21,
      20, 18, 21, 19, 20, 22, 10, 10, 6, 20, 22, 23, 11, 11, 10, 22, 20, 23, 22,
      21, 23, 20, 25, 24, 14, 14, 15, 25, 24, 18, 14, 4, 14, 18, 18, 25, 21, 24,
      25, 18, 26, 25, 15, 15, 17, 26, 23, 26, 17, 17, 11, 23, 21, 26, 23, 25,
      26, 21,
    ]
    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it('should create a "+" with hole plate THREE.Geometry', () => {
    //  #
    // # #
    //  #

    const vg = new VoxelUnion(grid)
    const geometry = vg._createVoxelGeometry([
      {x: 1, y: 0, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 2, y: 1, z: 0},
      {x: 1, y: 2, z: 0},
    ])

    expect(geometry.vertices.length).to.equal(24)
    expect(geometry.faces.length).to.equal(8 + 32 + 8)

    const expectedFaceIndices = [
      0, 1, 3, 3, 1, 2, 7, 4, 0, 0, 3, 7, 5, 6, 2, 2, 1, 5, 6, 7, 3, 3, 2, 6, 4,
      5, 0, 1, 0, 5, 5, 7, 6, 4, 7, 5, 8, 9, 10, 10, 9, 0, 13, 11, 8, 8, 10, 13,
      12, 4, 0, 0, 9, 12, 4, 13, 10, 10, 0, 4, 11, 12, 8, 9, 8, 12, 12, 13, 4,
      11, 13, 12, 14, 3, 16, 16, 3, 15, 19, 17, 14, 14, 16, 19, 7, 18, 15, 15,
      3, 7, 18, 19, 16, 16, 15, 18, 17, 7, 14, 3, 14, 7, 7, 19, 18, 17, 19, 7,
      20, 10, 21, 21, 10, 14, 23, 22, 20, 20, 21, 23, 13, 17, 14, 14, 10, 13,
      17, 23, 21, 21, 14, 17, 22, 13, 20, 10, 20, 13, 13, 23, 17, 22, 23, 13,
    ]
    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it("should create a 3x3 plate THREE.Geometry", () => {
    const vg = new VoxelUnion(grid)
    const geometry = vg._createVoxelGeometry([
      {x: 0, y: 0, z: 0},
      {x: 1, y: 0, z: 0},
      {x: 2, y: 0, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 2, y: 1, z: 0},
      {x: 0, y: 2, z: 0},
      {x: 1, y: 2, z: 0},
      {x: 2, y: 2, z: 0},
    ])

    expect(geometry.vertices.length).to.equal(32)
    expect(geometry.faces.length).to.equal(18 + 24 + 18)

    const expectedFaceIndices = [
      0, 1, 3, 3, 1, 2, 5, 6, 2, 2, 1, 5, 4, 5, 0, 1, 0, 5, 5, 7, 6, 4, 7, 5, 3,
      2, 9, 9, 2, 8, 6, 10, 8, 8, 2, 6, 6, 11, 10, 7, 11, 6, 9, 8, 13, 13, 8,
      12, 10, 14, 12, 12, 8, 10, 14, 15, 13, 13, 12, 14, 10, 15, 14, 11, 15, 10,
      16, 0, 17, 17, 0, 3, 18, 4, 16, 0, 16, 4, 4, 19, 7, 18, 19, 4, 17, 3, 20,
      20, 3, 9, 7, 21, 11, 19, 21, 7, 20, 9, 22, 22, 9, 13, 15, 23, 22, 22, 13,
      15, 11, 23, 15, 21, 23, 11, 24, 16, 25, 25, 16, 17, 27, 26, 24, 24, 25,
      27, 26, 18, 24, 16, 24, 18, 18, 27, 19, 26, 27, 18, 25, 17, 28, 28, 17,
      20, 29, 27, 25, 25, 28, 29, 19, 29, 21, 27, 29, 19, 28, 20, 30, 30, 20,
      22, 31, 29, 28, 28, 30, 31, 23, 31, 30, 30, 22, 23, 21, 31, 23, 29, 31, 21,
    ]
    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it('should create a filled "+" plate THREE.Geometry', () => {
    //  #
    // ###
    //  #

    const vg = new VoxelUnion(grid)
    const geometry = vg._createVoxelGeometry([
      {x: 1, y: 0, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 2, y: 1, z: 0},
      {x: 1, y: 2, z: 0},
    ])

    expect(geometry.vertices.length).to.equal(24)
    expect(geometry.faces.length).to.equal(10 + 24 + 10)

    const expectedFaceIndices = [
      0, 1, 3, 3, 1, 2, 5, 6, 2, 2, 1, 5, 6, 7, 3, 3, 2, 6, 4, 5, 0, 1, 0, 5, 5,
      7, 6, 4, 7, 5, 8, 9, 10, 10, 9, 0, 13, 11, 8, 8, 10, 13, 12, 4, 0, 0, 9,
      12, 11, 12, 8, 9, 8, 12, 12, 13, 4, 11, 13, 12, 10, 0, 14, 14, 0, 3, 4,
      15, 7, 13, 15, 4, 14, 3, 17, 17, 3, 16, 19, 15, 14, 14, 17, 19, 7, 18, 16,
      16, 3, 7, 18, 19, 17, 17, 16, 18, 7, 19, 18, 15, 19, 7, 20, 10, 21, 21,
      10, 14, 23, 22, 20, 20, 21, 23, 15, 23, 21, 21, 14, 15, 22, 13, 20, 10,
      20, 13, 13, 23, 15, 22, 23, 13,
    ]
    return expect(faceEquality(geometry.faces, expectedFaceIndices)).to.equal(true)
  })

  it('should create a filled "+" plate datastructure', () => {
    //  #
    // ###
    //  #

    const vg = new VoxelUnion(grid)
    const data = vg._prepareData([
      {x: 1, y: 0, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 2, y: 1, z: 0},
      {x: 1, y: 2, z: 0},
    ])

    expect(data.minX).to.equal(0)
    expect(data.minY).to.equal(0)
    expect(data.minZ).to.equal(0)
    expect(data.maxX).to.equal(2)
    expect(data.maxY).to.equal(2)
    expect(data.maxZ).to.equal(0)

    expect(data.zLayers[-1]).to.not.equal(undefined)
    expect(data.zLayers[0]).to.not.equal(undefined)
    expect(data.zLayers[1]).to.not.equal(undefined)

    for (let z = -1; z <= 1; z++) {
      for (let x = -1; x <= 3; x++) {
        expect(data.zLayers[z]?.[x]).to.not.equal(undefined)
      }
    }

    expect(data.zLayers[0][0][0].voxel).to.equal(false)
    expect(data.zLayers[0][1][0].voxel).to.equal(true)
    expect(data.zLayers[0][2][0].voxel).to.equal(false)
    expect(data.zLayers[0][0][1].voxel).to.equal(true)
    expect(data.zLayers[0][1][1].voxel).to.equal(true)
    expect(data.zLayers[0][2][1].voxel).to.equal(true)
    expect(data.zLayers[0][0][2].voxel).to.equal(false)
    expect(data.zLayers[0][1][2].voxel).to.equal(true)
    expect(data.zLayers[0][2][2].voxel).to.equal(false)

    expect(data.zLayers[1][1][1].voxel).to.equal(false)
    return expect(data.zLayers[-1][1][1].voxel).to.equal(false)
  })

  it('should create a filled "+" plate point list', () => {
    //  #
    // ###
    //  #

    const vg = new VoxelUnion(grid)
    const data = vg._prepareData([
      {x: 1, y: 0, z: 0},
      {x: 0, y: 1, z: 0},
      {x: 1, y: 1, z: 0},
      {x: 2, y: 1, z: 0},
      {x: 1, y: 2, z: 0},
    ])

    // Mock Geometry object since THREE.Geometry was removed in modern Three.js
    const geo = { vertices: [] as THREE.Vector3[] } as THREE.Geometry

    vg._createGeoPoints(1, 0, 0, data, geo)
    vg._createGeoPoints(0, 1, 0, data, geo)
    vg._createGeoPoints(1, 1, 0, data, geo)
    vg._createGeoPoints(2, 1, 0, data, geo)
    vg._createGeoPoints(1, 2, 0, data, geo)

    return expect(geo.vertices.length).to.equal(12)
  })
})


var faceEquality = function (faces: THREE.Face3[], indexArray: number[]) {
  // checks if the indices stored in the faces have the same order
  // as the indexArray (consisting out of numbers)
  let i = 0

  if (indexArray.length !== (faces.length * 3)) {
    return false
  }

  for (const face of Array.from(faces)) {
    if (face.a !== indexArray[i]) {
      return false
    }
    if (face.b !== indexArray[i + 1]) {
      return false
    }
    if (face.c !== indexArray[i + 2]) {
      return false
    }
    i += 3
  }

  return true
}
