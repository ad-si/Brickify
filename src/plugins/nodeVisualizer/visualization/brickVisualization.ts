import THREE, { Object3D, Mesh, BufferGeometry, Material, MeshLambertMaterial, PerspectiveCamera } from "three"

import GeometryCreator from "./GeometryCreator.js"
import StabilityColoring from "./StabilityColoring.js"
import VoxelWireframe from "./VoxelWireframe.js"
import VoxelSelector from "../VoxelSelector.js"
import type Coloring from "./Coloring.js"
import type Grid from "../../newBrickator/pipeline/Grid.js"
import type BrickObject from "./BrickObject.js"
import type Voxel from "../../newBrickator/pipeline/Voxel.js"

interface VisualizationRenderer {
  getCamera: () => PerspectiveCamera
  getDomElement: () => HTMLCanvasElement
  scene: { matrix: THREE.Matrix4 }
}

interface Bundle {
  globalConfig: { studSize: { radius: number; height: number } }
  renderer: VisualizationRenderer
}

interface Position {
  x: number
  y: number
  z: number
}

interface VoxelLike {
  position: Position
  isLego: () => boolean
  makeLego: () => void
  make3dPrinted: () => void
  brick?: BrickLike
  neighbors?: { Zm?: VoxelLike }
}

interface BrickLike {
  getPosition: () => Position
  getSize: () => Position
  getVisualBrick: () => BrickObject | null
  setVisualBrick: (brick: BrickObject | null) => void
  isValid: () => boolean
  getCover: () => { isCompletelyCovered: boolean; coveringBricks: Set<BrickLike> }
  forEachVoxel: (fn: (voxel: VoxelLike) => void) => void
}

interface ExtendedMesh extends Mesh {
  dimensions?: THREE.Vector3
}

/*
 * This class provides visualization for Voxels and Bricks
 * @class BrickVisualization
 */
export default class BrickVisualization {
  bundle: Bundle
  brickThreeNode: Object3D
  brickShadowThreeNode: Object3D
  defaultColoring: Coloring
  fidelity: number
  csgSubnode: Object3D
  bricksSubnode: Object3D
  temporaryVoxels: Object3D
  stabilityColoring: StabilityColoring
  printVoxels: VoxelLike[]
  isStabilityView: boolean
  _highlightVoxelVisibility: boolean
  grid!: Grid
  voxelWireframe!: VoxelWireframe
  geometryCreator!: GeometryCreator
  voxelSelector!: VoxelSelector
  _highlightVoxel!: BrickObject
  _oldColoring?: Coloring
  _legoBoxVisibilityBeforeStability?: boolean
  _visibleChildLayers: Object3D[] | null
  bigBrushHighlight?: ExtendedMesh

  constructor (bundle: Bundle, brickThreeNode: Object3D, brickShadowThreeNode: Object3D,
    defaultColoring: Coloring, fidelity: number) {

    this.initialize = this.initialize.bind(this)
    this.showCsg = this.showCsg.bind(this)
    this.hideCsg = this.hideCsg.bind(this)
    this.hideVoxelAndBricks = this.hideVoxelAndBricks.bind(this)
    this.showVoxelAndBricks = this.showVoxelAndBricks.bind(this)
    this.updateVisualization = this.updateVisualization.bind(this)
    this.setPossibleLegoBoxVisibility = this.setPossibleLegoBoxVisibility.bind(this)
    this.setStabilityView = this.setStabilityView.bind(this)
    this.showBrickLayer = this.showBrickLayer.bind(this)
    this.showAllBrickLayers = this.showAllBrickLayers.bind(this)
    this.getNumberOfVisibleLayers = this.getNumberOfVisibleLayers.bind(this)
    this.getNumberOfBuildLayers = this.getNumberOfBuildLayers.bind(this)
    this._getBuildLayerModifier = this._getBuildLayerModifier.bind(this)
    this._getVisibleLayers = this._getVisibleLayers.bind(this)
    this.highlightVoxel = this.highlightVoxel.bind(this)
    this._highlightBigBrush = this._highlightBigBrush.bind(this)
    this.unhighlightBigBrush = this.unhighlightBigBrush.bind(this)
    this.makeVoxel3dPrinted = this.makeVoxel3dPrinted.bind(this)
    this.makeAllVoxels3dPrinted = this.makeAllVoxels3dPrinted.bind(this)
    this.resetTouchedVoxelsToLego = this.resetTouchedVoxelsToLego.bind(this)
    this.makeVoxelLego = this.makeVoxelLego.bind(this)
    this.makeAllVoxelsLego = this.makeAllVoxelsLego.bind(this)
    this.resetTouchedVoxelsTo3dPrinted = this.resetTouchedVoxelsTo3dPrinted.bind(this)
    this.updateModifiedVoxels = this.updateModifiedVoxels.bind(this)
    this.setHighlightVoxelVisibility = this.setHighlightVoxelVisibility.bind(this)
    this.setFidelity = this.setFidelity.bind(this)
    this.bundle = bundle
    this.brickThreeNode = brickThreeNode
    this.brickShadowThreeNode = brickShadowThreeNode
    this.defaultColoring = defaultColoring
    this.fidelity = fidelity
    this.csgSubnode = new THREE.Object3D()
    this.brickThreeNode.add(this.csgSubnode)

    this.bricksSubnode = new THREE.Object3D()
    this.temporaryVoxels = new THREE.Object3D()
    this.brickThreeNode.add(this.bricksSubnode)
    this.brickThreeNode.add(this.temporaryVoxels)

    this.stabilityColoring = new StabilityColoring()

    this.printVoxels = []

    this.isStabilityView = false
    this._highlightVoxelVisibility = true
    this._visibleChildLayers = null
  }

  initialize (grid: Grid): void {
    this.grid = grid
    this.voxelWireframe = new VoxelWireframe(
      this.bundle, this.grid, this.brickShadowThreeNode, this.defaultColoring,
    )
    this.geometryCreator = new GeometryCreator(this.bundle.globalConfig, this.grid)
    this.voxelSelector = new VoxelSelector(this)

    this._highlightVoxel = this.geometryCreator.getBrick(
      {x: 0, y: 0, z: 0},
      {x: 1, y: 1, z: 1},
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.defaultColoring.getHighlightMaterial("3d")!.voxel,
      this.fidelity,
    )
    this._highlightVoxel.visible = false

    this.brickThreeNode.add(this._highlightVoxel)
  }

  showCsg (newCsgGeometry: BufferGeometry[]): boolean {
    this.csgSubnode.children = []
    for (const geometry of Array.from(newCsgGeometry)) {
      const csgMesh = new THREE.Mesh(geometry, this.defaultColoring.csgMaterial)
      this.csgSubnode.add(csgMesh)
    }

    return this.csgSubnode.visible = true
  }

  hideCsg (): boolean {
    return this.csgSubnode.visible = false
  }

  hideVoxelAndBricks (): boolean {
    return this.bricksSubnode.visible = false
  }

  showVoxelAndBricks (): boolean {
    return this.bricksSubnode.visible  = true
  }

  // Updates brick and voxel visualization
  updateVisualization (coloring?: Coloring, recreate?: boolean): null {
    // Delete temporary voxels
    let brick: BrickLike; let brickLayer: BrickLike[]; let layer: Object3D; let layerObject: Object3D; let materials; let visualBrick: BrickObject; let z: number
    let asc; let end
    if (coloring == null) {
      coloring = this.defaultColoring
    }
    if (recreate == null) {
      recreate = false
    }
    this.temporaryVoxels.children = []

    if (recreate) {
      this.bricksSubnode.children = []
    }
    else {
      // Throw out all visual bricks that have no valid linked brick
      for (layer of Array.from(this.bricksSubnode.children)) {
        const deletionList: BrickObject[] = []
        for (visualBrick of Array.from(layer.children) as BrickObject[]) {
          if ((visualBrick.brick == null) || !visualBrick.brick.isValid()) {
            deletionList.push(visualBrick)
          }
        }

        for (const delBrick of Array.from(deletionList)) {
          // Remove from scenegraph
          layer.remove(delBrick)
          // Delete reference from datastructure brick
          if (delBrick.brick != null) {
            delBrick.brick.setVisualBrick(null)
          }
        }
      }
    }

    // Recreate visible bricks for all bricks in the datastructure that
    // have no linked brick

    // Sort layerwise for build view
    const brickLayers: BrickLike[][] = []
    let maxZ = 0;

    (this.grid.getAllBricks() as unknown as Set<BrickLike>)
      .forEach((brick: BrickLike): void => {
        const pos = brick.getPosition()
        maxZ = Math.max(pos.z, maxZ)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (brickLayers[pos.z] == null) {
          brickLayers[pos.z] = []
        }

        if (!recreate && ((brick.getVisualBrick() == null))) {
          brickLayers[pos.z].push(brick)
        }
        const visualBrickRef = brick.getVisualBrick()
        if (visualBrickRef != null) {
          visualBrickRef.visible = true
          visualBrickRef.hasBeenSplit = false
        }
      })

    // Create three layer object if it does not exist
    for (z = 0, end = maxZ, asc = end >= 0; asc ? z <= end : z >= end; asc ? z++ : z--) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.bricksSubnode.children[z] == null) {
        layerObject = new THREE.Object3D()
        this.bricksSubnode.add(layerObject)
      }
    }

    for (const [zNum, brickLayerEntry] of brickLayers.entries()) {
      brickLayer = brickLayerEntry
      layerObject = this.bricksSubnode.children[zNum]

      for (brick of Array.from(brickLayer)) {
        // Create visual brick
        materials = coloring.getMaterialsForBrick(brick as unknown as Parameters<typeof coloring.getMaterialsForBrick>[0])
        const threeBrick = this.geometryCreator.getBrick(
          brick.getPosition(),
          brick.getSize(),
          materials,
          this.fidelity,
        )

        // Link data <-> visuals
        brick.setVisualBrick(threeBrick)

        // Add to scene graph
        layerObject.add(threeBrick)
      }
    }

    // Set stud visibility in second pass so that visibility of
    // all bricks in all layers is in the correct state
    for (const brickLayerEntry2 of brickLayers) {
      brickLayer = brickLayerEntry2
      for (brick of Array.from(brickLayer)) {
        this._setStudVisibility(brick)
      }
    }

    // If this coloring differs from the last used coloring, go through
    // all visible bricks to update their material
    if (this._oldColoring !== coloring) {
      for (layer of Array.from(this.bricksSubnode.children)) {
        for (visualBrick of Array.from(layer.children) as BrickObject[]) {
          materials = coloring.getMaterialsForBrick(visualBrick.brick as unknown as Parameters<typeof coloring.getMaterialsForBrick>[0])
          visualBrick.setMaterial(materials)
        }
      }
    }
    this._oldColoring = coloring

    this.unhighlightBigBrush()

    // Show not filled lego shape as outline
    const outlineCoords = this.printVoxels.map((voxel: VoxelLike) => voxel.position)
    this.voxelWireframe.createWireframe(outlineCoords)

    return this._visibleChildLayers = null
  }

  _setStudVisibility (brick: BrickLike): boolean {
    let showStuds: boolean
    const cover = brick.getCover()
    if (cover.isCompletelyCovered) {
      showStuds = false
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      cover.coveringBricks.forEach((coverBrick: BrickLike) => showStuds = showStuds || !coverBrick.getVisualBrick()!.visible)
    }
    else {
      showStuds = true
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return brick.getVisualBrick()!
      .setStudVisibility(showStuds)
  }

  setPossibleLegoBoxVisibility (isVisible: boolean): boolean {
    return this.voxelWireframe.setVisibility(isVisible)
  }

  setStabilityView (enabled: boolean): boolean {
    this.isStabilityView = enabled
    const coloring = this.isStabilityView ? this.stabilityColoring : this.defaultColoring
    this.updateVisualization(coloring)

    // Turn off possible lego box and highlight during stability view
    if (enabled) {
      this._legoBoxVisibilityBeforeStability = this.voxelWireframe.isVisible()
      this.voxelWireframe.setVisibility(false)
      return this._highlightVoxel.visible = false
    }
    else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.voxelWireframe.setVisibility(this._legoBoxVisibilityBeforeStability!)
    }
  }

  showBrickLayer (layer: number): void {
    let threeLayer: Object3D; let visibleBrick: BrickObject
    layer += this._getBuildLayerModifier()

    // Hide highlight when in build mode
    this._highlightVoxel.visible = false
    this.unhighlightBigBrush()

    const visibleLayers = this._getVisibleLayers()
    for (let i = 0, end = visibleLayers.length; i < end; i++) {
      threeLayer = visibleLayers[i]
      if (i <= layer) {
        if (i < layer) {
          this._makeLayerGrayscale(threeLayer)
        }
        else {
          this._makeLayerColored(threeLayer)
        }
        for (visibleBrick of Array.from(threeLayer.children) as BrickObject[]) {
          visibleBrick.visible = true
        }
      }
      else {
        for (visibleBrick of Array.from(threeLayer.children) as BrickObject[]) {
          visibleBrick.visible = false
        }
      }
    }

    // Set stud visibility in second pass so that visibility of
    // all bricks in all layers is in the correct state
    for (threeLayer of Array.from(visibleLayers)) {
      for (visibleBrick of Array.from(threeLayer.children) as BrickObject[]) {
        this._setStudVisibility(visibleBrick.brick as unknown as BrickLike)
      }
    }

  }

  _makeLayerGrayscale (layer: Object3D): Material[] {
    return Array.from(layer.children)
      .map((threeBrick) =>
        (threeBrick as BrickObject).setGray(true))
  }

  _makeLayerColored (layer: Object3D): Material[] {
    return Array.from(layer.children)
      .map((threeBrick) =>
        (threeBrick as BrickObject).setGray(false))
  }

  showAllBrickLayers (): Material[][] {
    return (() => {
      const result: Material[][] = []
      for (const layer of Array.from(this._getVisibleLayers())) {
        layer.visible = true
        result.push(this._makeLayerColored(layer))
      }
      return result
    })()
  }

  getNumberOfVisibleLayers (): number {
    return this._getVisibleLayers().length
  }

  getNumberOfBuildLayers (): number {
    let numLayers = this.getNumberOfVisibleLayers()
    numLayers -= this._getBuildLayerModifier()
    return numLayers
  }

  _getBuildLayerModifier (): number {
    // If there is 3D print below first lego layer, show lego starting
    // with layer 1 and show only 3D print in first instruction layer
    const minLayer = this.grid.getLegoVoxelsZRange().min
    if (minLayer != null && minLayer > 0) {
      return -1
    }
    else {
      return 0
    }
  }

  _getVisibleLayers (): Object3D[] {
    if (this._visibleChildLayers == null) {
      this._visibleChildLayers = this.bricksSubnode.children.filter((layer: Object3D) => layer.children.length > 0)
    }
    return this._visibleChildLayers
  }

  // Highlights the voxel below mouse and returns it
  highlightVoxel (event: PointerEvent, _selectedNode: unknown, type: string, bigBrush: boolean): VoxelLike | null | undefined {
    // Invert type, because if we are highlighting a 'lego' voxel,
    // we want to display it as 'could be 3d printed'
    let voxelType = "3d"
    if (type === "3d") {
      voxelType = "lego"
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const highlightMaterial = this.defaultColoring.getHighlightMaterial(voxelType)!
    const hVoxel = highlightMaterial.voxel
    const hBox = highlightMaterial.box

    const voxel = this.voxelSelector.getVoxel(event, {type}) as VoxelLike | null | undefined
    if (voxel != null) {
      this._highlightVoxel.visible = this._highlightVoxelVisibility
      const worldPos = this.grid.mapVoxelToWorld(voxel.position)
      this._highlightVoxel.position.set(
        worldPos.x, worldPos.y, worldPos.z,
      )
      this._highlightVoxel.setMaterial(hVoxel)
      if (bigBrush) {
        this._highlightBigBrush(voxel, hBox)
      }
    }
    else {
      // Clear highlight if no voxel is below mouse
      this._highlightVoxel.visible = false
      this.unhighlightBigBrush()
    }

    return voxel
  }

  _highlightBigBrush (voxel: VoxelLike, material: MeshLambertMaterial): boolean {
    const size = this.voxelSelector.getBrushSize(true)
    const dims = this.bigBrushHighlight?.dimensions
    if (dims == null ||
    dims.x !== size.x ||
    dims.y !== size.y ||
    dims.z !== size.z) {
      if (this.bigBrushHighlight) {
        this.brickShadowThreeNode.remove(this.bigBrushHighlight)
      }
      this.bigBrushHighlight = this.geometryCreator.getBrickBox(
        size,
        material,
      ) as ExtendedMesh
      this.brickShadowThreeNode.add(this.bigBrushHighlight)
    }

    const worldPosition = this.grid.mapVoxelToWorld(voxel.position)
    this.bigBrushHighlight.position.copy(worldPosition as THREE.Vector3)
    this.bigBrushHighlight.material = material
    return this.bigBrushHighlight.visible = true
  }

  unhighlightBigBrush (): boolean | undefined {
    return this.bigBrushHighlight != null ? this.bigBrushHighlight.visible = false : undefined
  }

  // Makes the voxel below mouse to be 3d printed
  makeVoxel3dPrinted (event: PointerEvent, _selectedNode: unknown, bigBrush: boolean): Voxel[] | null {
    // Hide highlight voxel since it will be made invisible
    this._highlightVoxel.visible = false

    if (bigBrush) {
      const mainVoxel = this.voxelSelector.getVoxel(event, {type: "lego"}) as VoxelLike | null | undefined
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const mat = this.defaultColoring.getHighlightMaterial("3d")!
      if (mainVoxel != null) {
        this._highlightBigBrush(mainVoxel, mat.box)
      }
    }
    const voxels = this.voxelSelector.getVoxels(event, {type: "lego", bigBrush})
    if (!voxels) {
      return null
    }

    for (const voxel of Array.from(voxels) as unknown as VoxelLike[]) {
      voxel.make3dPrinted()
      // Show studs of brick below
      const brickBelow = voxel.neighbors?.Zm?.brick
      if (brickBelow) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ;(brickBelow as unknown as BrickLike).getVisualBrick()!
          .setStudVisibility(true)
      }

      // Split visual brick into voxels (only once per brick)
      if (voxel.brick) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const visualBrick = (voxel.brick as unknown as BrickLike).getVisualBrick()!
        if (!visualBrick.hasBeenSplit) {
          ;(voxel.brick as unknown as BrickLike).forEachVoxel((innerVoxel: VoxelLike) => {
            // Give this brick a 1x1 stud texture
            visualBrick.materials.textureStuds =
              this.defaultColoring.getTextureMaterialForBrick()
            const temporaryVoxel = this.geometryCreator.getBrick(
              innerVoxel.position,
              {x: 1, y: 1, z: 1},
              visualBrick.materials,
              this.fidelity,
            )
            temporaryVoxel.voxelPosition = innerVoxel.position
            this.temporaryVoxels.add(temporaryVoxel)
          })
          visualBrick.hasBeenSplit = true
          visualBrick.visible = false
        }
      }
      // Hide visual voxels for 3d printed geometry
      for (const temporaryVoxel of Array.from(this.temporaryVoxels.children) as BrickObject[]) {
        if (temporaryVoxel.voxelPosition === voxel.position) {
          temporaryVoxel.visible = false
          break
        }
      }
    }

    return voxels
  }

  /*
   * @return {Array} the list of changed voxels
   */
  makeAllVoxels3dPrinted (_selectedNode: unknown): VoxelLike[] {
    this.printVoxels = this.voxelSelector.getAllVoxels() as unknown as VoxelLike[]
    const legoVoxels = this.printVoxels.filter((voxel: VoxelLike) => voxel.isLego())
    legoVoxels.map((voxel: VoxelLike) => { voxel.make3dPrinted() })
    this.voxelSelector.clearSelection()
    return legoVoxels
  }

  resetTouchedVoxelsToLego (): Voxel[] {
    for (const voxel of Array.from(this.voxelSelector.touchedVoxels) as unknown as VoxelLike[]) {
      voxel.makeLego()
    }
    return this.voxelSelector.clearSelection()
  }

  // Makes the voxel below mouse to be made out of lego
  makeVoxelLego (event: PointerEvent, _selectedNode: unknown, bigBrush: boolean): Voxel[] | null {
    // Hide highlight
    this._highlightVoxel.visible = false

    if (bigBrush) {
      const mainVoxel = this.voxelSelector.getVoxel(event, {type: "3d"}) as VoxelLike | null | undefined
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const mat = this.defaultColoring.getHighlightMaterial("lego")!
      if (mainVoxel != null) {
        this._highlightBigBrush(mainVoxel, mat.box)
      }
    }
    const voxels = this.voxelSelector.getVoxels(event, {type: "3d", bigBrush})
    if (!voxels) {
      return null
    }

    for (const voxel of Array.from(voxels) as unknown as VoxelLike[]) {
      voxel.makeLego()

      // Create a visible temporary voxel at this position
      const temporaryVoxel = this.geometryCreator.getBrick(
        voxel.position,
        {x: 1, y: 1, z: 1},
        this.defaultColoring.getSelectedMaterials(),
        this.fidelity,
      )
      temporaryVoxel.voxelPosition = voxel.position
      this.temporaryVoxels.add(temporaryVoxel)
    }
    return voxels
  }

  /*
   * @return {Array} the list of changed voxels
   */
  makeAllVoxelsLego (_selectedNode: unknown): VoxelLike[] {
    const {
      printVoxels,
    } = this
    this.printVoxels = []
    printVoxels.map((voxel: VoxelLike) => { voxel.makeLego() })
    this.voxelSelector.clearSelection()
    return printVoxels
  }

  resetTouchedVoxelsTo3dPrinted (): Voxel[] {
    for (const voxel of Array.from(this.voxelSelector.touchedVoxels) as unknown as VoxelLike[]) {
      voxel.make3dPrinted()
    }
    return this.voxelSelector.clearSelection()
  }

  // Clears the selection and updates the possibleLegoWireframe
  updateModifiedVoxels (): Voxel[] {
    this.printVoxels = this.printVoxels
      .concat(this.voxelSelector.touchedVoxels as unknown as VoxelLike[])
      .filter((voxel: VoxelLike) => !voxel.isLego())
    return this.voxelSelector.clearSelection()
  }

  setHighlightVoxelVisibility (highlightVoxelVisibility: boolean): void {
    this._highlightVoxelVisibility = highlightVoxelVisibility
  }

  setFidelity (fidelity: number): boolean[][] {
    this.fidelity = fidelity
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this._highlightVoxel != null) {
      this._highlightVoxel.setFidelity(this.fidelity)
    }

    for (const voxel of Array.from(this.temporaryVoxels.children) as BrickObject[]) {
      voxel.setFidelity(this.fidelity)
    }

    return Array.from(this.bricksSubnode.children)
      .map((layer: Object3D) =>
        Array.from(layer.children)
          .map((threeBrick) =>
            (threeBrick as BrickObject).setFidelity(this.fidelity)))
  }
}
