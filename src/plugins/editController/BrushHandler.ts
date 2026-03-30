import log from "loglevel"
import type Bundle from "../../client/bundle.js"
import type Node from "../../common/project/node.js"
import type { Plugin } from "../../types/plugin.js"
import type EditController from "./editController.js"

interface NodeVisualizer extends Plugin {
  selectedNode: Node;
  setDisplayMode(node: Node, mode: string): void;
  _getCachedData(node: Node): Promise<CachedData>;
}

interface Voxel {
  makeLego(): void;
  make3dPrinted(): void;
}

interface VoxelSelector {
  touch(voxel: Voxel): void;
}

interface BrickVisualization {
  voxelSelector: VoxelSelector;
  makeVoxelLego(event: PointerEvent, node: Node, bigBrush: boolean): Voxel[] | null;
  makeVoxel3dPrinted(event: PointerEvent, node: Node, bigBrush: boolean): Voxel[] | null;
  makeAllVoxelsLego(node: Node): Voxel[];
  makeAllVoxels3dPrinted(node: Node): Voxel[];
  highlightVoxel(event: PointerEvent, node: Node, mode: string, bigBrush: boolean): void;
  unhighlightBigBrush(): void;
  updateModifiedVoxels(): Voxel[];
  updateVisualization(arg?: null, force?: boolean): void;
  resetTouchedVoxelsTo3dPrinted(): void;
  resetTouchedVoxelsToLego(): void;
}

interface CachedData {
  brickVisualization: BrickVisualization;
  csgNeedsRecalculation: boolean;
}

interface UndoPlugin extends Plugin {
  addTask(undo: () => void, redo: () => void): void;
}

interface BrushAction {
  toLego: () => void;
  toPrint: () => void;
}

interface BrushConfig {
  containerId: string;
  onBrushSelect: (node: Node, bigBrushSelected: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onBrushDown: (event: PointerEvent, node: Node) => Promise<boolean | void>;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onBrushMove: (event: PointerEvent, node: Node) => Promise<boolean | void>;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onBrushOver: (event: PointerEvent, node: Node) => Promise<boolean | void>;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onBrushUp: (event: PointerEvent, node: Node) => Promise<boolean | void>;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onBrushCancel: (event: PointerEvent, node: Node) => Promise<boolean | void>;
}

export default class BrushHandler {
  bundle: Bundle
  nodeVisualizer: NodeVisualizer
  editController: EditController
  undo: UndoPlugin | null
  highlightMaterial: THREE.MeshLambertMaterial
  legoBrushSelected: boolean = false
  bigBrushSelected: boolean = false

  constructor ( bundle: Bundle, nodeVisualizer: NodeVisualizer, editController: EditController ) {
    this.getBrushes = this.getBrushes.bind(this)
    this._legoSelect = this._legoSelect.bind(this)
    this._printSelect = this._printSelect.bind(this)
    this._applyChanges = this._applyChanges.bind(this)
    this._buildAction = this._buildAction.bind(this)
    this._legoDown = this._legoDown.bind(this)
    this._legoMove = this._legoMove.bind(this)
    this._legoUp = this._legoUp.bind(this)
    this._legoHover = this._legoHover.bind(this)
    this._legoCancel = this._legoCancel.bind(this)
    this._everythingLego = this._everythingLego.bind(this)
    this._printDown = this._printDown.bind(this)
    this._printMove = this._printMove.bind(this)
    this._printUp = this._printUp.bind(this)
    this._printHover = this._printHover.bind(this)
    this._printCancel = this._printCancel.bind(this)
    this._everythingPrint = this._everythingPrint.bind(this)
    this.bundle = bundle
    this.nodeVisualizer = nodeVisualizer
    this.editController = editController
    this.undo = this.bundle.getPlugin("undo") as UndoPlugin | null

    this.highlightMaterial = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
    })

    this.legoBrushSelected = false
    this.bigBrushSelected = false

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById("everythingLego")!
      .addEventListener("click", () => {
        void this._everythingLego(this.nodeVisualizer.selectedNode)
      })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById("everythingPrinted")!
      .addEventListener("click", () => {
        void this._everythingPrint(this.nodeVisualizer.selectedNode)
      })
  }

  getBrushes (): BrushConfig[] {
    /* eslint-disable @typescript-eslint/unbound-method */
    return [{
      containerId: "#legoBrush",
      onBrushSelect: this._legoSelect,
      onBrushDown: this._legoDown,
      onBrushMove: this._legoMove,
      onBrushOver: this._legoHover,
      onBrushUp: this._legoUp,
      onBrushCancel: this._legoCancel,
    }, {
      containerId: "#printBrush",
      onBrushSelect: this._printSelect,
      onBrushDown: this._printDown,
      onBrushMove: this._printMove,
      onBrushOver: this._printHover,
      onBrushUp: this._printUp,
      onBrushCancel: this._printCancel,
    }]
    /* eslint-enable @typescript-eslint/unbound-method */
  }

  _legoSelect (selectedNode: Node, bigBrushSelected: boolean) {
    this.bigBrushSelected = bigBrushSelected
    this.legoBrushSelected = true
    if (this.editController.interactionDisabled) {
      return
    }
    this.nodeVisualizer.setDisplayMode(selectedNode, "legoBrush")
  }

  _printSelect (selectedNode: Node, bigBrushSelected: boolean) {
    this.bigBrushSelected = bigBrushSelected
    this.legoBrushSelected = false
    if (this.editController.interactionDisabled) {
      return
    }
    this.nodeVisualizer.setDisplayMode(selectedNode, "printBrush")
  }

  _applyChanges (touchedVoxels: Voxel[], selectedNode: Node, cachedData: CachedData) {
    if (!(touchedVoxels.length > 0)) {
      return
    }
    log.debug(`Will re-layout ${String(touchedVoxels.length)} voxel`)

    this.editController.relayoutModifiedParts(
      selectedNode, cachedData, touchedVoxels, true,
    )
    cachedData.brickVisualization.unhighlightBigBrush()
  }

  _buildAction (touchedVoxels: Voxel[], selectedNode: Node, cachedData: CachedData): BrushAction {
    const toLego = () => {
      for (const voxel of Array.from(touchedVoxels)) {
        voxel.makeLego()
        cachedData.brickVisualization.voxelSelector.touch(voxel)
      }
      cachedData.brickVisualization.updateModifiedVoxels()
      this._applyChanges(touchedVoxels, selectedNode, cachedData)
    }

    const toPrint = () => {
      for (const voxel of Array.from(touchedVoxels)) {
        voxel.make3dPrinted()
        cachedData.brickVisualization.voxelSelector.touch(voxel)
      }
      cachedData.brickVisualization.updateModifiedVoxels()
      this._applyChanges(touchedVoxels, selectedNode, cachedData)
    }

    return { toLego, toPrint }
  }

  _legoDown (event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        const voxels = cachedData.brickVisualization
          .makeVoxelLego(event, selectedNode, this.bigBrushSelected)
        if (voxels != null) {
          cachedData.csgNeedsRecalculation = true
        }
      })
  }

  _legoMove (event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        const voxels = cachedData.brickVisualization
          .makeVoxelLego(event, selectedNode, this.bigBrushSelected)
        if (voxels != null) {
          cachedData.csgNeedsRecalculation = true
        }
      })
  }

  _legoUp (_event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        const touchedVoxels = cachedData.brickVisualization.updateModifiedVoxels()

        this._applyChanges(touchedVoxels, selectedNode, cachedData)

        const action = this._buildAction(touchedVoxels, selectedNode, cachedData)
        if (this.undo != null) { this.undo.addTask(action.toPrint, action.toLego) }
      })
  }

  _legoHover (event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        cachedData.brickVisualization
          .highlightVoxel(event, selectedNode, "3d", this.bigBrushSelected)
      })
  }

  _legoCancel (_event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        cachedData.brickVisualization.resetTouchedVoxelsTo3dPrinted()
        cachedData.brickVisualization.updateVisualization()
        cachedData.brickVisualization.unhighlightBigBrush()
      })
  }

  _everythingLego (node: Node) {
    return this.nodeVisualizer._getCachedData(node)
      .then((cachedData: CachedData) => {
          let apply: () => void
        const changedVoxels = cachedData.brickVisualization.makeAllVoxelsLego(node)
        if (changedVoxels.length === 0) {
          return
        }
        (apply = () => {
          this.editController.rerunLegoPipeline(node)
          const brickVis = cachedData.brickVisualization
          brickVis.updateModifiedVoxels()
          brickVis.updateVisualization(null, true)
        })()

        const action = this._buildAction(changedVoxels, node, cachedData)
        const redo = () => {
          cachedData.brickVisualization.makeAllVoxelsLego(node)
          apply()
        }
        if (this.undo != null) { this.undo.addTask(action.toPrint, redo) }
      })
  }


  _printDown (event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        const voxels = cachedData.brickVisualization
          .makeVoxel3dPrinted(event, selectedNode, this.bigBrushSelected)
        if (voxels != null) {
          cachedData.csgNeedsRecalculation = true
        }
      })
  }

  _printMove (event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        const voxels = cachedData.brickVisualization
          .makeVoxel3dPrinted(event, selectedNode, this.bigBrushSelected)
        if (voxels != null) {
          cachedData.csgNeedsRecalculation = true
        }
      })
  }

  _printUp (_event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        const touchedVoxels = cachedData.brickVisualization.updateModifiedVoxels()

        this._applyChanges(touchedVoxels, selectedNode, cachedData)

        const action = this._buildAction(touchedVoxels, selectedNode, cachedData)
        if (this.undo != null) { this.undo.addTask(action.toLego, action.toPrint) }
      })
  }

  _printHover (event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        cachedData.brickVisualization
          .highlightVoxel(event, selectedNode, "lego", this.bigBrushSelected)
      })
  }

  _printCancel (_event: PointerEvent, selectedNode: Node) {
    return this.nodeVisualizer._getCachedData(selectedNode)
      .then((cachedData: CachedData) => {
        cachedData.brickVisualization.resetTouchedVoxelsToLego()
        cachedData.brickVisualization.updateVisualization()
        cachedData.brickVisualization.unhighlightBigBrush()
      })
  }

  _everythingPrint (node: Node) {
    return this.nodeVisualizer._getCachedData(node)
      .then((cachedData: CachedData) => {
        const changedVoxels = cachedData.brickVisualization.makeAllVoxels3dPrinted(node)
        if (changedVoxels.length === 0) {
          return
        }
        cachedData.brickVisualization.updateModifiedVoxels()
        this.editController.relayoutModifiedParts(
          node, cachedData, changedVoxels, true,
        )

        const action = this._buildAction(changedVoxels, node, cachedData)
        if (this.undo != null) { this.undo.addTask(action.toLego, action.toPrint) }
      })
  }
}
