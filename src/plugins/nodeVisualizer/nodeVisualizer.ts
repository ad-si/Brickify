import THREE, { Object3D, Vector3, WebGLRenderer, Scene, PerspectiveCamera, WebGLRenderTarget } from "three"
import * as threeHelper from "../../client/threeHelper.js"
import BrickVisualization from "./visualization/brickVisualization.js"
import ModelVisualization from "./modelVisualization.js"
import * as interactionHelper from "../../client/interactionHelper.js"
import * as RenderTargetHelper from "../../client/rendering/renderTargetHelper.js"
import stencilBits from "../../client/rendering/stencilBits.js"
import Coloring from "./visualization/Coloring.js"
import ColorMultPart from "../../client/rendering/shader/ColorMultPart.js"
import ExpandBlackPart from "../../client/rendering/shader/ExpandBlackPart.js"
import * as PrintingTimeEstimator from "./printingTimeEstimator.js"
import type { GlobalConfig } from "../../types/index.js"
import type Node from "../../common/project/node.js"
import type Grid from "../newBrickator/pipeline/Grid.js"
import type Brick from "../newBrickator/pipeline/Brick.js"

interface Bundle {
  globalConfig: GlobalConfig
  renderer: {
    getDefaultScene: () => Scene
    zoomToNode: (node: Object3D) => void
    getCamera: () => PerspectiveCamera
    getDomElement: () => HTMLCanvasElement
    scene: { matrix: import("three").Matrix4 }
  }
  getPlugin: (name: string) => unknown
}

interface RenderTarget {
  renderTarget: WebGLRenderTarget
  quadScene: Scene
  blendingMaterial: {
    uniforms: Record<string, { value: unknown; type?: string }>
  }
  depthTexture?: unknown
  dirty?: boolean
}

interface CachedData {
  initialized: boolean
  node: Node
  brickThreeNode: Object3D
  brickShadowThreeNode: Object3D
  modelThreeNode: Object3D
  brickVisualization: BrickVisualization
  modelVisualization: ModelVisualization
  stabilityViewEnabled?: boolean
}

interface NewBrickatorData {
  grid: Grid
}

interface Intersection {
  object: Object3D
  distance: number
  point: Vector3
}

/*
 * @class NodeVisualizer
 */
export default class NodeVisualizer {
  brickVisualizations: { [nodeId: string]: BrickVisualization }
  fidelity: number
  bundle!: Bundle
  coloring!: Coloring
  objectColorMult!: Vector3
  objectShadowColorMult!: Vector3
  brickShadowOpacity!: number
  objectOpacity!: number
  objectShadowOpacity!: number
  brickCounter?: JQuery
  timeEstimate?: JQuery
  threeJsRootNode!: Object3D
  usePipeline!: boolean
  brickScene!: Scene
  brickRootNode!: Object3D
  objectsScene!: Scene
  objectsRootNode!: Object3D
  brickShadowScene!: Scene
  brickShadowRootNode!: Object3D
  threeRenderer!: WebGLRenderer
  renderTargetsInitialized!: boolean
  brickSceneTarget!: RenderTarget
  objectsSceneTarget!: RenderTarget
  brickShadowSceneTarget!: RenderTarget
  visualizationMode?: string
  newBrickator?: unknown
  selectedNode?: Node | null
  csg?: { getCSG: (node: Node, options: unknown) => Promise<THREE.BufferGeometry[]> } | undefined

  constructor () {
    // rendering properties
    this.init = this.init.bind(this)
    this.init3d = this.init3d.bind(this)
    this.onPaint = this.onPaint.bind(this)
    this.setFidelity = this.setFidelity.bind(this)
    this.objectModified = this.objectModified.bind(this)
    this.onNodeAdd = this.onNodeAdd.bind(this)
    this.onNodeRemove = this.onNodeRemove.bind(this)
    this.onNodeSelect = this.onNodeSelect.bind(this)
    this.onNodeDeselect = this.onNodeDeselect.bind(this)
    this._zoomToNode = this._zoomToNode.bind(this)
    this._initializeData = this._initializeData.bind(this)
    this._getCachedData = this._getCachedData.bind(this)
    this.createNodeDataStructure = this.createNodeDataStructure.bind(this)
    this.setDisplayMode = this.setDisplayMode.bind(this)
    this.getDisplayMode = this.getDisplayMode.bind(this)
    this._applyStabilityView = this._applyStabilityView.bind(this)
    this._applyBuildMode = this._applyBuildMode.bind(this)
    this.getNumberOfBuildLayers = this.getNumberOfBuildLayers.bind(this)
    this.showBuildLayer = this.showBuildLayer.bind(this)
    this._updateBrickCount = this._updateBrickCount.bind(this)
    this._updatePrintTime = this._updatePrintTime.bind(this)
    this._updateQuickPrintTime = this._updateQuickPrintTime.bind(this)
    this._showCsg = this._showCsg.bind(this)
    this.pointerOverModel = this.pointerOverModel.bind(this)
    this._getPointerIntersections = this._getPointerIntersections.bind(this)
    this.getBrickThreeNode = this.getBrickThreeNode.bind(this)
    this.brickVisualizations = {}
    this.fidelity = 0
  }

  init (bundle: Bundle): JQuery | undefined {
    this.bundle = bundle
    const cfg = bundle.globalConfig
    this.coloring = new Coloring(cfg)

    const colors = cfg.colors
    this.objectColorMult = new THREE.Vector3(
      colors.objectColorMult,
      colors.objectColorMult,
      colors.objectColorMult,
    )
    this.objectShadowColorMult = new THREE.Vector3(
      colors.objectShadowColorMult,
      colors.objectShadowColorMult,
      colors.objectShadowColorMult,
    )
    this.brickShadowOpacity = colors.brickShadowOpacity
    this.objectOpacity = colors.modelOpacity
    this.objectShadowOpacity = colors.modelShadowOpacity

    if (bundle.globalConfig.buildUi) {
      this.brickCounter = $("#brickCount")
      return this.timeEstimate = $("#timeEstimate")
    }
    return undefined
  }

  init3d (threeJsRootNode: Object3D): Object3D {
    this.threeJsRootNode = threeJsRootNode
    this.usePipeline = false

    // Voxels / Bricks are rendered as a first render pass
    this.brickScene = this.bundle.renderer.getDefaultScene()
    this.brickRootNode = new THREE.Object3D()
    this.threeJsRootNode.add(this.brickRootNode)

    // Objects are rendered in the 2nd / 3rd render pass
    this.objectsScene = this.bundle.renderer.getDefaultScene()
    this.objectsRootNode = new THREE.Object3D()
    this.threeJsRootNode.add(this.objectsRootNode)

    // LegoShadow is rendered as a 3rd rendering pass
    this.brickShadowScene = this.bundle.renderer.getDefaultScene()
    this.brickShadowRootNode = new THREE.Object3D()
    return this.threeJsRootNode.add(this.brickShadowRootNode)
  }

  onPaint (threeRenderer1: WebGLRenderer, camera: PerspectiveCamera, target: WebGLRenderTarget): void {
    this.threeRenderer = threeRenderer1
    const {
      threeRenderer,
    } = this

    // recreate textures if either they haven't been generated yet or
    // the screen size has changed
    if (!(this.renderTargetsInitialized &&
    RenderTargetHelper.renderTargetHasRightSize(
      this.brickSceneTarget.renderTarget, threeRenderer,
    ))) {
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
      // bricks
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.brickSceneTarget != null) {
        RenderTargetHelper.deleteRenderTarget(this.brickSceneTarget as any, this.threeRenderer)
      }

      this.brickSceneTarget = RenderTargetHelper.createRenderTarget(
        threeRenderer,
        null,
        null,
        1.0,
      )

      // object target
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.objectsSceneTarget != null) {
        RenderTargetHelper.deleteRenderTarget(this.objectsSceneTarget as any, this.threeRenderer)
      }

      this.objectsSceneTarget = RenderTargetHelper.createRenderTarget(
        threeRenderer,
        [new ExpandBlackPart(2), new ColorMultPart()],
        {colorMult: {type: "v3", value: new THREE.Vector3(1, 1, 1)}},
        this.objectOpacity,
      )

      // brick shadow target
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.brickShadowSceneTarget != null) {
        RenderTargetHelper.deleteRenderTarget(
          this.brickShadowSceneTarget as any, this.threeRenderer,
        )
      }
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */

      this.brickShadowSceneTarget = RenderTargetHelper.createRenderTarget(
        threeRenderer,
        [new ExpandBlackPart(2)],
        null,
        this.brickShadowOpacity,
      )

      this.renderTargetsInitialized = true
    }

    // First render pass: render Bricks & Voxels
    threeRenderer.render(this.brickScene, camera, this.brickSceneTarget.renderTarget, true)

    // Second pass: render object
    threeRenderer.render(
      this.objectsScene, camera, this.objectsSceneTarget.renderTarget, true,
    )

    // Third pass: render shadows
    threeRenderer.render(
      this.brickShadowScene, camera, this.brickShadowSceneTarget.renderTarget, true,
    )

    // finally render everything (on quads) on screen
    const gl = threeRenderer.context

    // everything that is visible lego gets the first bit set
    gl.enable(gl.STENCIL_TEST)
    gl.stencilFunc(gl.ALWAYS, stencilBits.legoMask, 0xFF)
    gl.stencilOp(gl.ZERO, gl.ZERO, gl.REPLACE)
    gl.stencilMask(0xFF)

    // bricks
    threeRenderer.render(this.brickSceneTarget.quadScene, camera, target, false)

    // everything that is 3d model and hidden gets the third bit set
    // every visible part of the 3d model gets the second bit set
    // (via increase and not being allowed to remove the first bit)
    gl.stencilFunc(gl.ALWAYS, stencilBits.hiddenObjectMask, 0xFF)
    gl.stencilOp(gl.KEEP, gl.REPLACE, gl.INCR)
    gl.stencilMask(stencilBits.visibleObjectMask | stencilBits.hiddenObjectMask)

    // render visible parts
    threeRenderer.render(this.objectsSceneTarget.quadScene, camera, target, false)

    // render invisible parts (object behind lego bricks)
    if ((this.visualizationMode != null) && (this.visualizationMode === "printBrush")) {
      // Adjust object material to be dark and more transparent
      const blendMat = this.objectsSceneTarget.blendingMaterial
      blendMat.uniforms.colorMult.value = this.objectShadowColorMult
      blendMat.uniforms.opacity.value = this.objectShadowOpacity

      // Only render where there is hidden 3d model
      gl.stencilFunc(
        gl.EQUAL, stencilBits.hiddenObjectMask, stencilBits.hiddenObjectMask,
      )
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)

      gl.disable(gl.DEPTH_TEST)
      threeRenderer.render(this.objectsSceneTarget.quadScene, camera, target, false)
      gl.enable(gl.DEPTH_TEST)

      // Reset material to non-shadow properties
      blendMat.uniforms.opacity.value = this.objectOpacity
      blendMat.uniforms.colorMult.value = this.objectColorMult
    }

    // everything shadowy gets the fourth bit set
    gl.stencilFunc(gl.ALWAYS, 0xFF, 0xFF)
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)
    gl.stencilMask(stencilBits.visibleShadowMask)

    // render this-could-be-lego-shadows and brush highlight
    threeRenderer.render(this.brickShadowSceneTarget.quadScene, camera, target, false)

    gl.disable(gl.STENCIL_TEST)
  }

  setFidelity (fidelityLevel: number, availableLevels: string[]): unknown {
    // Determine whether to use the pipeline or not
    if (fidelityLevel >= availableLevels.indexOf("PipelineLow")) {
      if (!this.usePipeline) {
        this.usePipeline = true

        // move all subnodes to the pipeline scenes
        this.threeJsRootNode.remove(this.brickRootNode)
        this.threeJsRootNode.remove(this.brickShadowRootNode)
        this.threeJsRootNode.remove(this.objectsRootNode)

        this.brickScene.add(this.brickRootNode)
        this.objectsScene.add(this.objectsRootNode)
        this.brickShadowScene.add(this.brickShadowRootNode)

        // change material properties
        this.coloring.setPipelineMode(true)
      }
    }
    else {
      if (this.usePipeline) {
        this.usePipeline = false

        // move all subnodes to conventional rendering
        this.brickScene.remove(this.brickRootNode)
        this.brickShadowScene.remove(this.brickShadowRootNode)
        this.objectsScene.remove(this.objectsRootNode)

        this.threeJsRootNode.add(this.brickRootNode)
        this.threeJsRootNode.add(this.objectsRootNode)
        this.threeJsRootNode.add(this.brickShadowRootNode)

        // change material properties
        this.coloring.setPipelineMode(false)
      }
    }

    if (fidelityLevel >= availableLevels.indexOf("PipelineHigh")) {
      this.fidelity = 2
    }
    else if (fidelityLevel > availableLevels.indexOf("DefaultMedium")) {
      this.fidelity = 1
    }
    else {
      this.fidelity = 0
    }

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
    return (() => {
      const result: any[] = []
      for (const nodeId in this.brickVisualizations) {
        const brickVisualization = this.brickVisualizations[nodeId]
        result.push(brickVisualization.setFidelity(this.fidelity))
      }
      return result as any
    })()
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
  }

  // called by newBrickator when an object's data structure is modified
  objectModified (node: Node, newBrickatorData: NewBrickatorData): Promise<void> {
    return this._getCachedData(node)
      .then((cachedData: CachedData) => {
        if (!cachedData.initialized) {
          this._initializeData(node, cachedData, newBrickatorData)
        }

        // visualization
        cachedData.brickVisualization.updateVisualization()
        cachedData.brickVisualization.showVoxelAndBricks()

        // brick count / printing time
        this._updateBrickCount(cachedData.brickVisualization.grid.getAllBricks())
        this._updateQuickPrintTime(
          cachedData.brickVisualization.grid.getDisabledVoxels(),
          cachedData.brickVisualization.grid.spacing,
        )
      })
  }

  onNodeAdd (node: Node): Promise<void> {
    // link other plugins
    if (this.newBrickator == null) {
      this.newBrickator = this.bundle.getPlugin("newBrickator")
    }

    // create visible node and zoom to it
    return this._getCachedData(node)
      .then((cachedData: CachedData) => {
        void cachedData.modelVisualization.createVisualization()
        return cachedData.modelVisualization.afterCreation()
          .then(() => {
            const solid = cachedData.modelVisualization.getSolid()
            if (solid != null) {
              this._zoomToNode(solid)
      return
            }
          })
      })
  }

  onNodeRemove (node: Node): boolean {
    const brickNode = threeHelper.find(node, this.brickRootNode)
    if (brickNode) this.brickRootNode.remove(brickNode)
    const shadowNode = threeHelper.find(node, this.brickShadowRootNode)
    if (shadowNode) this.brickShadowRootNode.remove(shadowNode)
    const objectNode = threeHelper.find(node, this.objectsRootNode)
    if (objectNode) this.objectsRootNode.remove(objectNode)
    return Reflect.deleteProperty(this.brickVisualizations, node.id)
  }

  onNodeSelect (selectedNode: Node): void {
    this.selectedNode = selectedNode
  }

  onNodeDeselect (): null {
    return this.selectedNode = null
  }

  _zoomToNode (threeNode: Object3D): void {
    this.bundle.renderer.zoomToNode(threeNode)
  }

  // initialize visualization with data from newBrickator
  // change solid renderer appearance
  _initializeData (_node: Node, visualizationData: CachedData, newBrickatorData: NewBrickatorData): boolean {
    // init node visualization
    visualizationData.brickVisualization.initialize(newBrickatorData.grid)
    return visualizationData.initialized = true
  }

  // returns the node visualization or creates one
  _getCachedData (selectedNode: Node): Promise<CachedData> {
    return selectedNode.getPluginData("brickVisualizer")
      .then((pluginData) => {
        let data = pluginData as CachedData | null
        if (data != null) {
          return data
        }
        else {
          data = this.createNodeDataStructure(selectedNode)
          selectedNode.storePluginData("brickVisualizer", data, true)
          return data
        }
      })
  }

  // creates visualization data structures
  createNodeDataStructure (node: Node): CachedData {
    const brickThreeNode = new THREE.Object3D()
    const brickShadowThreeNode = new THREE.Object3D()
    const modelThreeNode = new THREE.Object3D()

    this.brickRootNode.add(brickThreeNode)
    this.brickShadowRootNode.add(brickShadowThreeNode)
    this.objectsRootNode.add(modelThreeNode)

    threeHelper.link(node, brickThreeNode)
    threeHelper.link(node, brickShadowThreeNode)
    threeHelper.link(node, modelThreeNode)

    const brickVisualization = new BrickVisualization(
      this.bundle, brickThreeNode, brickShadowThreeNode, this.coloring, this.fidelity,
    )
    this.brickVisualizations[node.id] = brickVisualization

    const data: CachedData = {
      initialized: false,
      node,
      brickThreeNode,
      brickShadowThreeNode,
      modelThreeNode,
      brickVisualization,
      modelVisualization: new ModelVisualization(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        this.bundle.globalConfig, node as any, modelThreeNode, this.coloring,
      ),
    }

    return data
  }

  /*
   * Sets the overall display mode
   * @param {Node} selectedNode the currently selected node
   * @param {String} mode the mode: 'legoBrush'/'printBrush'/'stability'/'build'
   */
  setDisplayMode (selectedNode: Node | null, visualizationMode: string): Promise<void> | undefined {
    this.visualizationMode = visualizationMode
    if (selectedNode == null) {
      return undefined
    }

    return this._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        switch (this.visualizationMode) {
          case "legoBrush":
            this._resetStabilityView(cachedData)
            this._resetBuildMode(cachedData)
            { this._applyLegoBrushMode(cachedData); return }
          case "printBrush":
            this._resetStabilityView(cachedData)
            this._resetBuildMode(cachedData)
            { this._applyPrintBrushMode(cachedData); return }
          case "stability":
            this._resetBuildMode(cachedData)
            { this._applyStabilityView(cachedData); return }
          case "build":
            this._resetStabilityView(cachedData)
            { this._applyBuildMode(cachedData); return }
          default:
            this._resetStabilityView(cachedData)
            { this._resetBuildMode(cachedData); return }
        }
      })
  }

  getDisplayMode (): string | undefined {
    return this.visualizationMode
  }

  _applyLegoBrushMode (cachedData: CachedData): void {
    cachedData.brickVisualization.updateVisualization()
    cachedData.brickVisualization.showVoxelAndBricks()
    cachedData.brickVisualization.setPossibleLegoBoxVisibility(true)
    void cachedData.modelVisualization.setShadowVisibility(false)
  }

  _applyPrintBrushMode (cachedData: CachedData): void {
    cachedData.brickVisualization.updateVisualization()
    cachedData.brickVisualization.showVoxelAndBricks()
    cachedData.brickVisualization.setPossibleLegoBoxVisibility(false)
    void cachedData.modelVisualization.setShadowVisibility(true)
  }

  _applyStabilityView (cachedData: CachedData): void {
    cachedData.stabilityViewEnabled  = true

    void this._showCsg(cachedData)
      .then(() => // change coloring to stability coloring
        cachedData.brickVisualization.setStabilityView(true))

    void cachedData.modelVisualization.setNodeVisibility(false)
  }

  _resetStabilityView (cachedData: CachedData): void {
    if (cachedData.stabilityViewEnabled) {
      cachedData.brickVisualization.setStabilityView(false)
      cachedData.brickVisualization.hideCsg()
      void cachedData.modelVisualization.setNodeVisibility(true)
      cachedData.stabilityViewEnabled = false
    }
  }

  _applyBuildMode (cachedData: CachedData): void {
    // Show bricks and csg
    cachedData.brickVisualization.setPossibleLegoBoxVisibility(false)
    cachedData.brickVisualization.setHighlightVoxelVisibility(false)

    void this._showCsg(cachedData)

    void cachedData.modelVisualization.setNodeVisibility(false)
  }

  _resetBuildMode (cachedData: CachedData): void {
    cachedData.brickVisualization.setHighlightVoxelVisibility(true)
    cachedData.brickVisualization.hideCsg()
    cachedData.brickVisualization.showAllBrickLayers()
    void cachedData.modelVisualization.setNodeVisibility(true)
  }

  // Returns the amount of LEGO-Layers that can be shown in build mode.
  // Layers without bricks are discarded
  getNumberOfBuildLayers (selectedNode: Node): Promise<number> {
    return this._getCachedData(selectedNode)
      .then((cachedData: CachedData) => cachedData.brickVisualization.getNumberOfBuildLayers())
  }

  // when build mode is enabled, this tells the visualization to show
  // bricks up to the specified layer
  showBuildLayer (selectedNode: Node, layer: number): Promise<void> {

    // Start counting at 0 internally
    layer--

    return this._getCachedData(selectedNode)
      .then((cachedData: CachedData) => { cachedData.brickVisualization.showBrickLayer(layer) })
  }

  _updateBrickCount (bricks: Set<Brick>): void {
    if (this.brickCounter != null) {
      this.brickCounter.text(bricks.size)
    }
  }

  _updatePrintTime (csg: THREE.BufferGeometry[] | null): void {
    if (csg != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      let time = PrintingTimeEstimator.getPrintingTimeEstimate(csg as any)
      time = Math.round(time)
      if (this.timeEstimate != null) {
        this.timeEstimate.text(time)
      }
    }
    else {
      if (this.timeEstimate != null) {
        this.timeEstimate.text(0)
      }
    }
  }

  _updateQuickPrintTime (voxels: unknown[], spacing: { x: number; y: number; z: number }): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    let time = PrintingTimeEstimator.getPrintingTimeEstimateForVoxels(voxels as any, spacing)
    time = Math.round(time)
    if (this.timeEstimate != null) {
      this.timeEstimate.text(time)
    }
  }

  _showCsg (cachedData: CachedData): Promise<void> {
    if (this.csg == null) {
      this.csg = this.bundle.getPlugin("csg") as typeof this.csg
    }
    if (this.csg == null) {
      return Promise.resolve()
    }

    const options = {
      addStuds: true,
      minimalPrintVolume: this.bundle.globalConfig.minimalPrintVolume,
    }

    return this.csg.getCSG(cachedData.node, options)
      .then((csg: THREE.BufferGeometry[]) => {
        cachedData.brickVisualization.showCsg(csg)
        this._updatePrintTime(csg)
      })
  }

  // check whether the pointer is over a model/brick visualization
  pointerOverModel (event: PointerEvent, ignoreInvisible?: boolean): boolean {
    if (ignoreInvisible == null) {
      ignoreInvisible = true
    }
    const intersections = this._getPointerIntersections(event)

    if (!ignoreInvisible) {
      return intersections.length > 0
    }
    const visibleIntersections = intersections.filter((intersection: Intersection) => {
      let object: Object3D | null = intersection.object
      while (object != null) {
        if (!object.visible) {
          return false
        }
        object = object.parent
      }
      return true
    })

    return visibleIntersections.length > 0
  }

  _getPointerIntersections (event: PointerEvent): Intersection[] {
    if (this.usePipeline) {
      const modelIntersections = interactionHelper.getIntersections(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        event, this.bundle.renderer as any,this.objectsRootNode.children,
      )
      if (modelIntersections.length > 0) {
        return modelIntersections
      }

      const brickIntersections = interactionHelper.getIntersections(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        event, this.bundle.renderer as any,this.brickRootNode.children,
      )
      return brickIntersections
    }
    else {
      const mixedIntersections = interactionHelper.getIntersections(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        event, this.bundle.renderer as any,this.threeJsRootNode.children,
      )
      return mixedIntersections
    }
  }

  getBrickThreeNode (node: Node): Promise<Object3D> {
    return this._getCachedData(node)
      .then((cachedData: CachedData) => cachedData.brickThreeNode)
  }
}
