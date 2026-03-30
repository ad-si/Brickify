/**
 * Lego Board Plugin
 *
 * Creates a lego board as a workspace surface to help people align models
 * to the lego grid
 */

import THREE from "three"
import type { Object3D, Mesh, MeshLambertMaterial, PerspectiveCamera, WebGLRenderer, Scene } from "three"
import type Bundle from "../../client/bundle.js"
import type { GlobalConfig } from "../../types/index.js"

import * as RenderTargetHelper from "../../client/rendering/renderTargetHelper.js"
import stencilBits from "../../client/rendering/stencilBits.js"
import DisposableResource from "../../client/rendering/DisposableResource.js"

interface FidelityOptions {
  screenshotMode?: boolean;
}

interface RenderTarget {
  renderTarget: THREE.WebGLRenderTarget;
  quadScene: Scene;
  blendingMaterial: {
    uniforms: {
      opacity: { value: number };
    };
  };
}

// Global config will be loaded conditionally

const dimension = 400

export default class LegoBoard {
  disposableResource: DisposableResource
  bundle: Bundle | null = null
  globalConfig!: GlobalConfig
  threejsNode!: Object3D
  fidelity: number = 0
  usePipeline: boolean = false
  isVisible: boolean = true
  isScreenshotMode: boolean = false
  pipelineScene!: Scene
  baseplateBox!: Mesh
  studsContainer!: Object3D
  highFiStudsContainer!: Object3D
  baseplateMaterial!: MeshLambertMaterial
  baseplateTexturedMaterial!: MeshLambertMaterial
  baseplateTransparentMaterial!: MeshLambertMaterial
  studMaterial!: MeshLambertMaterial
  currentBaseplateMaterial!: MeshLambertMaterial
  pipelineSceneTarget!: RenderTarget
  renderTargetsInitialized: boolean | null = null

  // Store the global configuration for later use by init3d
  constructor () {
    this.init3d = this.init3d.bind(this)
    this._initbaseplateBox = this._initbaseplateBox.bind(this)
    this._initStudGeometries = this._initStudGeometries.bind(this)
    this._generateStuds = this._generateStuds.bind(this)
    this._initMaterials = this._initMaterials.bind(this)
    this.on3dUpdate = this.on3dUpdate.bind(this)
    this.onPaint = this.onPaint.bind(this)
    this.toggleVisibility = this.toggleVisibility.bind(this)
    this.setFidelity = this.setFidelity.bind(this)
    this._updateFidelitySettings = this._updateFidelitySettings.bind(this)
    this.dispose = this.dispose.bind(this)

    // Initialize disposable resource tracking
    this.disposableResource = new DisposableResource()
  }

  init (bundle: Bundle) {
    this.bundle = bundle
    this.globalConfig = bundle.globalConfig
  }

  // Load the board
  init3d (threejsNode: Object3D) {
    this.threejsNode = threejsNode
    this.fidelity = 0
    this.usePipeline = false
    this.isVisible = true
    this.isScreenshotMode = false

    this._initMaterials()
    this._initbaseplateBox()
    this._initStudGeometries()

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
    // create scene for pipeline
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.pipelineScene = (this.bundle!.renderer as any).getDefaultScene()
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment */
  }

  _initbaseplateBox () {
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
    // Create baseplate with 5 faces in each direction
    const box = this.disposableResource.track(new THREE.BoxGeometry(dimension, dimension, 8, 5, 5) as any)
    const bufferGeometry = this.disposableResource.track(new THREE.BufferGeometry() as any)
    bufferGeometry.fromGeometry(box)
    this.baseplateBox = this.disposableResource.track(new THREE.Mesh(bufferGeometry, this.baseplateMaterial) as any)
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
    this.baseplateBox.translateZ(-4)
    return this.threejsNode.add(this.baseplateBox)
  }

  _initStudGeometries () {
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    this.studsContainer = this.disposableResource.track(this._generateStuds(7) as any)
    this.studsContainer.visible = false
    this.threejsNode.add(this.studsContainer)

    this.highFiStudsContainer = this.disposableResource.track(this._generateStuds(42) as any)
    this.highFiStudsContainer.visible = false
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    return this.threejsNode.add(this.highFiStudsContainer)
  }

  _generateStuds (radiusSegments: number): Object3D {
    let x: number
    let y: number
    let asc: boolean
    let end: number
    let step: number
    let asc2: boolean
    let end2: number
    let step2: number
    const studGeometry = new THREE.CylinderGeometry(
      this.globalConfig.studSize.radius,
      this.globalConfig.studSize.radius,
      this.globalConfig.studSize.height,
      radiusSegments,
    )
    const rotation = new THREE.Matrix4()
    rotation.makeRotationX(1.571)
    studGeometry.applyMatrix(rotation)

    const translation = new THREE.Matrix4()
    translation.makeTranslation(0, 0, this.globalConfig.studSize.height / 2)
    studGeometry.applyMatrix(translation)

    const studsGeometry = new THREE.Geometry()
    const xSpacing = this.globalConfig.gridSpacing.x
    const ySpacing = this.globalConfig.gridSpacing.y
    const studsGeometrySize = 80
    for (x = 0, end = studsGeometrySize, step = xSpacing, asc = step > 0; asc ? x < end : x > end; x += step) {
      let asc1: boolean
      let end1: number
      let step1: number
      for (y = 0, end1 = studsGeometrySize, step1 = ySpacing, asc1 = step1 > 0; asc1 ? y < end1 : y > end1; y += step1) {
        translation.makeTranslation(x, y, 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        studsGeometry.merge(studGeometry as any, translation)
      }
    }

    // Dispose the original study geometry since it's been merged
    studGeometry.dispose()

    const bufferGeometry = new THREE.BufferGeometry()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ;(bufferGeometry as any).fromGeometry(studsGeometry)

    // Dispose the original geometry after conversion
    studsGeometry.dispose()

    const container = new THREE.Object3D()
    for (x = (-dimension + xSpacing) / 2, end2 = dimension / 2, step2 = studsGeometrySize, asc2 = step2 > 0; asc2 ? x < end2 : x > end2; x += step2) {
      let asc3: boolean
      let end3: number
      let step3: number
      for (y = (-dimension + ySpacing) / 2, end3 = dimension / 2, step3 = studsGeometrySize, asc3 = step3 > 0; asc3 ? y < end3 : y > end3; y += step3) {
        // Track the buffer geometry and mesh
        const mesh = new THREE.Mesh(bufferGeometry, this.studMaterial)
        mesh.translateX(x)
        mesh.translateY(y)
        container.add(mesh)
      }
    }

    // Track the buffer geometry for disposal
    this.disposableResource.track(bufferGeometry)

    return container
  }

  _initMaterials () {
    const studTexture = this.disposableResource.track(THREE.ImageUtils.loadTexture("/img/baseplateStud.png"))
    studTexture.wrapS = THREE.RepeatWrapping
    studTexture.wrapT = THREE.RepeatWrapping
    studTexture.repeat.set(dimension / 8, dimension / 8)

    this.baseplateMaterial = this.disposableResource.track(new THREE.MeshLambertMaterial({
      color: this.globalConfig.colors.basePlate,
    }))
    this.baseplateTexturedMaterial = this.disposableResource.track(new THREE.MeshLambertMaterial({
      map: studTexture,
    }))
    this.currentBaseplateMaterial = this.baseplateTexturedMaterial

    this.baseplateTransparentMaterial = this.disposableResource.track(new THREE.MeshLambertMaterial({
      color: this.globalConfig.colors.basePlate,
      opacity: 0.4,
      transparent: true,
    }))

    return this.studMaterial = this.disposableResource.track(new THREE.MeshLambertMaterial({
      color: this.globalConfig.colors.basePlateStud,
    }))
  }

  on3dUpdate (): void {
    // This check is only important if we don't use the pipeline
    if (this.usePipeline || this.isScreenshotMode) {
      return
    }

    // Check if the camera is below z=0. if yes, make the plate transparent
    // and hide studs
    if (this.bundle == null) {
      return
    }

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const {
      camera,
    } = this.bundle.renderer as any
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (camera.position.z < 0) {
      this.baseplateBox.material = this.baseplateTransparentMaterial
      this.studsContainer.visible = false
      this.highFiStudsContainer.visible = false
    }
    else {
      this._updateFidelitySettings()
    }
  }

  onPaint (threeRenderer: WebGLRenderer, camera: PerspectiveCamera, target: THREE.WebGLRenderTarget) {
    if (!this.isVisible || this.isScreenshotMode) {
      return
    }

    // Recreate textures if either they havent been generated yet or
    // the screen size has changed
    if (!((this.renderTargetsInitialized != null) &&
    RenderTargetHelper.renderTargetHasRightSize(
      this.pipelineSceneTarget.renderTarget, threeRenderer,
    ))) {
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.pipelineSceneTarget != null) {
        RenderTargetHelper.deleteRenderTarget(this.pipelineSceneTarget as any, threeRenderer)
        this.disposableResource.untrack(this.pipelineSceneTarget as any)
      }

      this.pipelineSceneTarget = this.disposableResource.track(RenderTargetHelper.createRenderTarget(
        threeRenderer, null, null, 1.0,
      ) as any)
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
      this.renderTargetsInitialized = true
    }

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
    // Render board
    ;(threeRenderer as any).render(
      this.pipelineScene, camera, this.pipelineSceneTarget.renderTarget, true,
    )

    const gl = (threeRenderer as any).context

    // Render baseplate transparent if cam looks from below
    if (camera.position.z < 0) {
      // One fully transparent render pass
      this.pipelineSceneTarget.blendingMaterial.uniforms.opacity.value = 0.4
      return (threeRenderer as any).render(this.pipelineSceneTarget.quadScene, camera, target, false)
    }
    else {
      // One default opaque pass
      this.pipelineSceneTarget.blendingMaterial.uniforms.opacity.value = 1
      ;(threeRenderer as any).render(this.pipelineSceneTarget.quadScene, camera, target, false)

      // Render one pass transparent, where visible object or shadow is
      // (= no lego)
      gl.enable(gl.STENCIL_TEST)
      gl.stencilFunc(gl.EQUAL, 0x00, stencilBits.legoMask)
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)
      gl.stencilMask(0x00)

      this.pipelineSceneTarget.blendingMaterial.uniforms.opacity.value = 0.4

      gl.disable(gl.DEPTH_TEST)
      ;(threeRenderer as any).render(this.pipelineSceneTarget.quadScene, camera, target, false)
      gl.enable(gl.DEPTH_TEST)

      return gl.disable(gl.STENCIL_TEST)
    }
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
  }

  toggleVisibility () {
    this.threejsNode.visible = !this.threejsNode.visible
    return this.isVisible = !this.isVisible
  }

  setFidelity (fidelityLevel: number, availableLevels: string[], options: FidelityOptions): void {
    if (options.screenshotMode != null) {
      this.isScreenshotMode = options.screenshotMode
      this.threejsNode.visible = this.isVisible && !this.isScreenshotMode
    }

    // Determine whether to show or hide studs
    if (fidelityLevel >= availableLevels.indexOf("PipelineHigh")) {
      this.fidelity = 2
      this._updateFidelitySettings()
    }
    else if (fidelityLevel > availableLevels.indexOf("DefaultMedium")) {
      this.fidelity = 1
      this._updateFidelitySettings()
    }
    else {
      this.fidelity = 0
      this._updateFidelitySettings()
    }

    // Determine whether to use the pipeline or not
    if (fidelityLevel >= availableLevels.indexOf("PipelineLow")) {
      if (!this.usePipeline) {
        this.usePipeline = true

        // move lego board and studs from threeNode to pipeline scene
        this._moveThreeObjects(this.threejsNode, this.pipelineScene, [
          this.baseplateBox,
          this.studsContainer,
          this.highFiStudsContainer,
        ])
        return
      }
    }
    else {
      if (this.usePipeline) {
        this.usePipeline = false

        // move lego board and studs from pipeline to threeNode
        this._moveThreeObjects(this.pipelineScene, this.threejsNode, [
          this.baseplateBox,
          this.studsContainer,
          this.highFiStudsContainer,
        ])
        return
      }
    }
  }

  _moveThreeObjects (from: Object3D, to: Object3D, objects: Object3D[]) {
    return (() => {
      const result: Object3D[] = []
      for (const object of Array.from(objects)) {
        from.remove(object)
        result.push(to.add(object))
      }
      return result
    })()
  }

  _updateFidelitySettings () {
    // show studs?
    this.studsContainer.visible = this.fidelity === 1
    this.highFiStudsContainer.visible = this.fidelity === 2

    // remove texture because we have physical studs?
    if (this.fidelity === 0) {
      this.baseplateBox.material =  this.baseplateTexturedMaterial
    }
    else {
      this.baseplateBox.material = this.baseplateMaterial
    }
    return this.currentBaseplateMaterial = this.baseplateBox.material as MeshLambertMaterial
  }

  dispose() {
    if (!this.disposableResource.isDisposed()) {
      /* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
      // Clean up render targets
      if (this.pipelineSceneTarget) {
        RenderTargetHelper.deleteRenderTarget(this.pipelineSceneTarget as any, (this.bundle?.renderer as any)?.threeRenderer)
      }

      // Remove objects from scenes
      if (this.threejsNode) {
        if (this.baseplateBox) this.threejsNode.remove(this.baseplateBox)
        if (this.studsContainer) this.threejsNode.remove(this.studsContainer)
        if (this.highFiStudsContainer) this.threejsNode.remove(this.highFiStudsContainer)
      }

      if (this.pipelineScene) {
        if (this.baseplateBox) this.pipelineScene.remove(this.baseplateBox)
        if (this.studsContainer) this.pipelineScene.remove(this.studsContainer)
        if (this.highFiStudsContainer) this.pipelineScene.remove(this.highFiStudsContainer)
      }
      /* eslint-enable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

      // Dispose all tracked resources
      this.disposableResource.dispose()

      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
      // Clear references
      const self = this as any
      self.disposableResource = null
      self.bundle = null
      self.globalConfig = null
      self.threejsNode = null
      self.pipelineScene = null
      self.baseplateBox = null
      self.studsContainer = null
      self.highFiStudsContainer = null
      self.pipelineSceneTarget = null
      self.baseplateMaterial = null
      self.baseplateTexturedMaterial = null
      self.baseplateTransparentMaterial = null
      self.studMaterial = null
      self.currentBaseplateMaterial = null
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
    }
  }
}
