import THREE, { Object3D, Mesh, Geometry, LineSegments, Vector3, PerspectiveCamera } from "three"

import VoxelUnion from "../../csg/VoxelUnion.js"
import * as interactionHelper from "../../../client/interactionHelper.js"
import type Grid from "../../newBrickator/pipeline/Grid.js"
import type Coloring from "./Coloring.js"

interface BrickifyRenderer {
  getCamera(): PerspectiveCamera
  getDomElement(): HTMLCanvasElement
}

interface Bundle {
  renderer: BrickifyRenderer
}

interface VoxelInput {
  x: number
  y: number
  z: number
  studOnTop?: boolean
  studFromBelow?: boolean
}

interface Intersection {
  point: Vector3
  distance: number
  object: Object3D
}

interface ExtendedThreeNode extends Object3D {
  shadowBox?: Mesh
  edgeHelper?: LineSegments
}


// This class creates a wireframe representation with darkened sides
// of a given set of voxels
export default class VoxelOutline {
  bundle: Bundle
  grid: Grid
  coloring: Coloring
  threeNode: ExtendedThreeNode
  voxelUnion: VoxelUnion

  constructor (bundle: Bundle, grid: Grid, threeNode: Object3D, coloring: Coloring) {
    this.setVisibility = this.setVisibility.bind(this)
    this.isVisible = this.isVisible.bind(this)
    this.createWireframe = this.createWireframe.bind(this)
    this.intersectRay = this.intersectRay.bind(this)
    this.bundle = bundle
    this.grid = grid
    this.coloring = coloring
    this.threeNode = new THREE.Object3D() as ExtendedThreeNode
    threeNode.add(this.threeNode)

    this.voxelUnion = new VoxelUnion(this.grid)
  }

  setVisibility (isVisible: boolean): boolean {
    return this.threeNode.visible = isVisible
  }

  isVisible (): boolean {
    return this.threeNode.visible
  }

  // creates a wireframe out of voxels
  // @param {Array} voxels array of voxels {x, y, z}[] to create
  // wireframe for
  createWireframe (voxels: VoxelInput[]): LineSegments | undefined {
    // clear old representations
    this.threeNode.children = []

    // create Geometry
    const options = {
      threeBoxGeometryOnly: true,
    }
    const boxGeometry = this.voxelUnion.run(voxels, options) as Geometry

    // add black sides to make volume more visible
    const shadowBox = new THREE.Mesh(boxGeometry, this.coloring.legoShadowMat)
    this.threeNode.add(shadowBox)
    this.threeNode.shadowBox = shadowBox

    // add black lines to create a visible outline
    // material is not used, but needs to be provided
    const material = new THREE.MeshLambertMaterial({
      color: 0x000000,
    })
    const mesh = new THREE.Mesh(boxGeometry, material)

    const EdgesHelper = (THREE as unknown as { EdgesHelper: new (mesh: Mesh, color: number, angle: number) => LineSegments }).EdgesHelper
    const edgeHelper = new EdgesHelper(mesh, 0x000000, 10)
    ;(edgeHelper.material as THREE.LineBasicMaterial).linewidth = 2
    this.threeNode.add(edgeHelper)
    return this.threeNode.edgeHelper = edgeHelper
  }

  // returns the intersections between a ray and the shadowBox geometry
  intersectRay (event: PointerEvent): Intersection[] {
    const intersectObject = this.threeNode.shadowBox
    if (!intersectObject) {
      return []
    }

    // set two sided material to catch all intersections
    const oldMaterialSide = (intersectObject.material as THREE.MeshBasicMaterial).side
    ;(intersectObject.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide

    // intersect with ray
    const intersects =
      interactionHelper.getIntersections(
        event,
        this.bundle.renderer,
        [intersectObject],
      )

    // apply old material side property
    ;(intersectObject.material as THREE.MeshBasicMaterial).side = oldMaterialSide

    return intersects
  }
}
