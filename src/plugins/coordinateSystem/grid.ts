/*
  *Grid constructor#

  Creates a grid inside a threejs node with a provided global config,
  but leaves spaces for the coordinate system
*/

import THREE from "three"
import type { Object3D, LineBasicMaterial } from "three"
import type { GlobalConfig } from "../../types/index.js"

let materialGridNormal: LineBasicMaterial
let materialGrid5: LineBasicMaterial
let materialGrid10: LineBasicMaterial

export default function (threejsNode: Object3D, globalConfig: GlobalConfig) {
  setupMaterials(globalConfig)
  axisLines(threejsNode, globalConfig)
  return otherLines(threejsNode, globalConfig)
}

/*
  **Setup Materials**

  Every 5<sup>th</sup> and 10<sup>th</sup> line is thicker than the others.
*/
const setupMaterials = function (globalConfig: GlobalConfig) {
  materialGridNormal = new THREE.LineBasicMaterial({
    color: globalConfig.colors.gridNormal,
    linewidth: globalConfig.gridLineWidthNormal,
  })
  materialGrid5 = new THREE.LineBasicMaterial({
    color: globalConfig.colors.grid5,
    linewidth: globalConfig.gridLineWidth5,
  })
  materialGrid10 = new THREE.LineBasicMaterial({
    color: globalConfig.colors.grid10,
    linewidth: globalConfig.gridLineWidth10,
  })
  return materialGrid10
}

/*
  **Axis grid lines**

  Construct grid lines that are on the X and Y axis<br>
  Make half as big to prevent z-fighting with colored axis indicators
*/
const axisLines = function (threejsNode: Object3D, globalConfig: GlobalConfig) {
  const material = materialGrid10
  const gridLineGeometryXPositive = new THREE.Geometry()
  const gridLineGeometryYPositive = new THREE.Geometry()
  const gridLineGeometryXNegative = new THREE.Geometry()
  const gridLineGeometryYNegative = new THREE.Geometry()
  gridLineGeometryXNegative.vertices.push(
    new THREE.Vector3( -globalConfig.gridSize, 0, 0),
  )
  gridLineGeometryXNegative.vertices.push(
    new THREE.Vector3(  0, 0, 0))
  gridLineGeometryYNegative.vertices.push(
    new THREE.Vector3(  0, -globalConfig.gridSize, 0),
  )
  gridLineGeometryYNegative.vertices.push(
    new THREE.Vector3(  0,  0, 0),
  )
  gridLineGeometryXPositive.vertices.push(
    new THREE.Vector3( globalConfig.gridSize / 2, 0, 0),
  )
  gridLineGeometryXPositive.vertices.push(
    new THREE.Vector3(  globalConfig.gridSize, 0, 0),
  )
  gridLineGeometryYPositive.vertices.push(
    new THREE.Vector3( 0, globalConfig.gridSize / 2, 0),
  )
  gridLineGeometryYPositive.vertices.push(
    new THREE.Vector3( 0,  globalConfig.gridSize, 0),
  )
  const gridLineXPositive = new THREE.Line(
    gridLineGeometryXPositive, material,
  )
  const gridLineYPositive = new THREE.Line(
    gridLineGeometryYPositive, material,
  )
  const gridLineXNegative = new THREE.Line(
    gridLineGeometryXNegative, material,
  )
  const gridLineYNegative = new THREE.Line(
    gridLineGeometryYNegative, material,
  )
  threejsNode.add( gridLineXPositive )
  threejsNode.add( gridLineYPositive )
  threejsNode.add( gridLineXNegative )
  return threejsNode.add( gridLineYNegative )
}

/*
  **Other grid lines**

  Construct grid lines that are not on the X or Y axis
*/
const otherLines = function (threejsNode: Object3D, globalConfig: GlobalConfig) {
  return (() => {
    const result: THREE.Object3D[] = []
    for (let i = 1, end = globalConfig.gridSize / globalConfig.gridStepSize, asc = end >= 1; asc ? i <= end : i >= end; asc ? i++ : i--) {
      let material: LineBasicMaterial
      const num = i * globalConfig.gridStepSize
      if ((i % 10) === 0) {
        material = materialGrid10
      }
      else if ((i % 5) === 0) {
        material = materialGrid5
      }
      else {
        material = materialGridNormal
      }
      const gridLineGeometryXPositive = new THREE.Geometry()
      const gridLineGeometryYPositive = new THREE.Geometry()
      const gridLineGeometryXNegative = new THREE.Geometry()
      const gridLineGeometryYNegative = new THREE.Geometry()
      gridLineGeometryXPositive.vertices.push(
        new THREE.Vector3(-globalConfig.gridSize, num, 0),
      )
      gridLineGeometryXPositive.vertices.push(
        new THREE.Vector3(globalConfig.gridSize, num, 0),
      )
      gridLineGeometryYPositive.vertices.push(
        new THREE.Vector3(num, -globalConfig.gridSize, 0),
      )
      gridLineGeometryYPositive.vertices.push(
        new THREE.Vector3(num,  globalConfig.gridSize, 0),
      )
      gridLineGeometryXNegative.vertices.push(
        new THREE.Vector3(-globalConfig.gridSize, -num, 0),
      )
      gridLineGeometryXNegative.vertices.push(
        new THREE.Vector3(globalConfig.gridSize, -num, 0),
      )
      gridLineGeometryYNegative.vertices.push(
        new THREE.Vector3(-num, -globalConfig.gridSize, 0),
      )
      gridLineGeometryYNegative.vertices.push(
        new THREE.Vector3( -num,  globalConfig.gridSize, 0),
      )
      const gridLineXPositive = new THREE.Line(
        gridLineGeometryXPositive,
        material,
      )
      const gridLineYPositive = new THREE.Line(
        gridLineGeometryYPositive,
        material,
      )
      const gridLineXNegative = new THREE.Line(
        gridLineGeometryXNegative,
        material,
      )
      const gridLineYNegative = new THREE.Line(
        gridLineGeometryYNegative,
        material,
      )
      threejsNode.add( gridLineXPositive )
      threejsNode.add( gridLineYPositive )
      threejsNode.add( gridLineXNegative )
      result.push(threejsNode.add( gridLineYNegative ))
    }
    return result
  })()
}
