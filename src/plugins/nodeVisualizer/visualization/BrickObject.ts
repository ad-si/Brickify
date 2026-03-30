import THREE, { Mesh, Material, Geometry, BufferGeometry } from "three"
import DisposableResource from "../../../client/rendering/DisposableResource.js"
import type Brick from "../../newBrickator/pipeline/Brick.js"

interface BrickMaterials {
  color: Material
  colorStuds: Material
  gray?: Material
  grayStuds?: Material
  textureStuds?: Material
}

interface BrickGeometries {
  brickGeometry: Geometry | BufferGeometry
  studGeometry: Geometry | BufferGeometry
  highFiStudGeometry: Geometry | BufferGeometry
  planeGeometry: Geometry | BufferGeometry
}

/*
 * @class BrickObject
 */
export default class BrickObject extends THREE.Object3D {
  disposableResource: DisposableResource | null
  materials!: BrickMaterials
  areStudsVisible: boolean
  fidelity: number
  brick: Brick | null
  hasBeenSplit: boolean
  voxelPosition?: { x: number; y: number; z: number }

  constructor (geometries: BrickGeometries, materials: BrickMaterials, fidelity: number) {
    super()
    this.setBrick = this.setBrick.bind(this)
    this.getBrick = this.getBrick.bind(this)
    this.setMaterial = this.setMaterial.bind(this)
    this.setGray = this.setGray.bind(this)
    this.setFidelity = this.setFidelity.bind(this)
    this.setStudVisibility = this.setStudVisibility.bind(this)
    this._updateStuds = this._updateStuds.bind(this)
    this.dispose = this.dispose.bind(this)

    // Initialize disposable resource tracking
    this.disposableResource = new DisposableResource()

    this.materials = materials
    this.brick = null
    this.hasBeenSplit = false
    this.fidelity = fidelity
    const {
      brickGeometry,
      studGeometry,
      highFiStudGeometry,
      planeGeometry,
    } = geometries

    this.areStudsVisible = true

    // Create meshes and track them for disposal
    const brickMesh = this.disposableResource.track(new THREE.Mesh(brickGeometry, this.materials.color))
    const studMesh = this.disposableResource.track(new THREE.Mesh(studGeometry, this.materials.colorStuds))
    const highFiStudMesh = this.disposableResource.track(new THREE.Mesh(highFiStudGeometry, this.materials.colorStuds))
    const planeMesh = this.disposableResource.track(new THREE.Mesh(planeGeometry, this.materials.textureStuds))

    this.add(brickMesh)
    this.add(studMesh)
    this.add(highFiStudMesh)
    this.add(planeMesh)

    this.setFidelity(fidelity)
  }

  setBrick (brick: Brick | null): void {
    this.brick = brick
  }
  getBrick (): Brick | null {
    return this.brick
  }
  setMaterial (materials: BrickMaterials): Material {
    this.materials = materials
    ;(this.children[0] as Mesh).material = this.materials.color
    ;(this.children[1] as Mesh).material = this.materials.colorStuds
    return (this.children[2] as Mesh).material = this.materials.colorStuds
  }

  setGray (isGray: boolean): Material {
    if (isGray) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ;(this.children[0] as Mesh).material = this.materials.gray!
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ;(this.children[1] as Mesh).material = this.materials.grayStuds!
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return (this.children[2] as Mesh).material = this.materials.grayStuds!
    }
    else {
      ;(this.children[0] as Mesh).material = this.materials.color
      ;(this.children[1] as Mesh).material = this.materials.colorStuds
      return (this.children[2] as Mesh).material = this.materials.colorStuds
    }
  }

  setFidelity (fidelity: number): boolean {
    this.fidelity = fidelity
    return this._updateStuds()
  }

  setStudVisibility (areStudsVisible: boolean): boolean {
    this.areStudsVisible = areStudsVisible
    return this._updateStuds()
  }

  _updateStuds (): boolean {
    ;(this.children[1]).visible = (this.fidelity === 1) && this.areStudsVisible
    ;(this.children[2]).visible = (this.fidelity === 2) && this.areStudsVisible
    return (this.children[3]).visible = (this.fidelity === 0) && this.areStudsVisible
  }

  dispose(): void {
    if (this.disposableResource && !this.disposableResource.isDisposed()) {
      // Remove from parent first
      if (this.parent) {
        this.parent.remove(this)
      }

      // Dispose all tracked resources
      this.disposableResource.dispose()
      this.disposableResource = null

      // Clear references
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this as any).materials = null
      this.brick = null
    }
  }
}
