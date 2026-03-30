import THREE, { type Object3D, type Scene, type Vector3, type Matrix4 } from "three"
import type { Transform } from "../types/index"

interface NodeWithTransform {
  id: string;
  transform: Transform;
}

interface BrickifyObject3D extends Object3D {
  brickifyNode?: string;
}

interface ThreeProperty {
  set(x: number, y: number, z: number): void;
}

export function link (node: NodeWithTransform, threeNode: BrickifyObject3D): string {
  return threeNode.brickifyNode = node.id
}


export function find (node: NodeWithTransform, threeParentNode: Object3D): Object3D | undefined {
  return threeParentNode.getObjectByProperty("brickifyNode", node.id, true)
}


export function applyNodeTransforms (node: NodeWithTransform, threeNode: Object3D): void {
  const _set = (property: ThreeProperty, vector: { x: number; y: number; z: number }) => { property.set(vector.x, vector.y, vector.z) }

  _set(threeNode.position, node.transform.position)
  _set(threeNode.rotation, node.transform.rotation)
  _set(threeNode.scale, node.transform.scale)
}


export function getTransformMatrix (node: NodeWithTransform): Matrix4 {
  const threeNode = new THREE.Object3D()
  applyNodeTransforms(node, threeNode)
  threeNode.updateMatrix()
  return threeNode.matrix
}


import type { Mesh, Sphere, PerspectiveCamera } from "three"

interface BoundingSphereResult {
  radius: number;
  center: Vector3;
}

interface PointerControls {
  target: Vector3;
  set(options: { target: Vector3; position: Vector3 }): void;
}

export function getBoundingSphere (threeNode: Object3D): BoundingSphereResult | Sphere {
  if ((threeNode as Partial<Mesh>).geometry) {
    const geometry = (threeNode as Mesh).geometry
    geometry.computeBoundingSphere()
    const boundingSphere = geometry.boundingSphere
    if (!boundingSphere) {
      throw new Error("Failed to compute bounding sphere")
    }
    threeNode.updateMatrix()
    if (threeNode.parent != null) {
      threeNode.parent.updateMatrixWorld()
    }
    boundingSphere.center.applyProjection(threeNode.matrixWorld)
    return boundingSphere
  }
  const boundingBox = new THREE.Box3()
    .setFromObject(threeNode)
  const size = boundingBox.size()
  const radius = Math.sqrt(
    (size.x * size.x) + (size.y * size.y) + (size.z * size.z),
  ) / 2
  const center = boundingBox.center()
  return {radius, center}
}


export function zoomToBoundingSphere (
  camera: PerspectiveCamera,
  scene: Scene,
  controls: PointerControls | null,
  boundingSphere: BoundingSphereResult
): void {
  const { radius, center } = boundingSphere

  const alpha = camera.fov
  const distanceToObject = radius / Math.sin(alpha)

  let rv = camera.position.clone()
  if (controls != null) {
    rv.sub(controls.target)
  }
  rv = rv.normalize()
    .multiplyScalar(distanceToObject)
  const zoomAdjustmentFactor = 2.5
  rv = rv.multiplyScalar(zoomAdjustmentFactor)

  // apply scene transforms (e.g. rotation to make y the vector facing upwards)
  const target = center.clone()
    .applyMatrix4(scene.matrix)
  const position = target.clone()
    .add(rv)

  camera.position.set(position.x, position.y, position.z)
  camera.lookAt(target)

  if (controls != null) {
    controls.set({ target, position })
  }
}
