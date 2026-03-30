import type Bundle from "../../client/bundle.js"
import type Node from "../../common/project/node.js"
import type { Plugin } from "../../types/plugin.js"
import BrushHandler from "./BrushHandler.js"
import PointEventHandler from "./pointEventHandler.js"
import * as pointerEnums from "../../client/ui/pointerEnums.js"

interface NodeVisualizer extends Plugin {
  selectedNode: Node;
  pointerOverModel(event: PointerEvent, ignoreInvisible: boolean): boolean;
  setDisplayMode(node: Node, mode: string): void;
}

interface NewBrickator extends Plugin {
  relayoutModifiedParts(node: Node, touchedVoxels: unknown[], createBricks: boolean): void;
  runLegoPipeline(node: Node): void;
}

export default class EditController {
  interactionDisabled: boolean = false
  bundle!: Bundle
  nodeVisualizer!: NodeVisualizer
  newBrickator!: NewBrickator
  brushHandler!: BrushHandler
  pointEventHandler!: PointEventHandler

  constructor () {
    this.disableInteraction = this.disableInteraction.bind(this)
    this.enableInteraction = this.enableInteraction.bind(this)
    this.onPointerEvent = this.onPointerEvent.bind(this)
    this.relayoutModifiedParts = this.relayoutModifiedParts.bind(this)
    this.rerunLegoPipeline = this.rerunLegoPipeline.bind(this)
    this.interactionDisabled = false
  }

  init (bundle: Bundle) {
    this.bundle = bundle
    this.nodeVisualizer = this.bundle.getPlugin("nodeVisualizer") as NodeVisualizer
    this.newBrickator = this.bundle.getPlugin("newBrickator") as NewBrickator

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    this.brushHandler = new BrushHandler(this.bundle, this.nodeVisualizer as any, this)

    const ui = this.bundle.ui
    if (ui == null) {
      throw new Error("UI is not initialized")
    }

    const {
      brushUi,
    } = ui.workflowUi.workflow.edit
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    brushUi.setBrushes(this.brushHandler.getBrushes() as any)

    this.pointEventHandler = new PointEventHandler(
      this.bundle.sceneManager,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      brushUi as any,
    )
    return this.pointEventHandler
  }

  // Disables any brush interaction for the user
  disableInteraction () {
    return this.interactionDisabled = true
  }

  // Enables brush interaction for the user and sets correct display
  // mode for the currently selected brush
  enableInteraction () {
    this.interactionDisabled = false

    if (this.brushHandler.legoBrushSelected) {
      this.nodeVisualizer.setDisplayMode(
        this.bundle.sceneManager.selectedNode as Node, "legoBrush",
      )
      return
    }
    else {
      this.nodeVisualizer.setDisplayMode(
        this.bundle.sceneManager.selectedNode as Node, "printBrush",
      )
      return
    }
  }

  onPointerEvent (event: PointerEvent, eventType: string) {
    if (this.interactionDisabled) {
      return false
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if ((this.nodeVisualizer == null) || (this.pointEventHandler == null)) {
      return false
    }

    const ignoreInvisible = event.buttons !== pointerEnums.buttonStates.right
    if (!this.nodeVisualizer.pointerOverModel(event, ignoreInvisible)) {
      // when we are not above model, call only move and up events
      switch (eventType) {
        case pointerEnums.events.PointerMove:
          return this.pointEventHandler.pointerMove(event)
          break
        case pointerEnums.events.PointerUp:
          return this.pointEventHandler.pointerUp(event)
          break
      }
      return false
    }

    switch (eventType) {
      case pointerEnums.events.PointerDown:
        return this.pointEventHandler.pointerDown(event)
        break
      case pointerEnums.events.PointerMove:
        return this.pointEventHandler.pointerMove(event)
        break
      case pointerEnums.events.PointerUp:
        return this.pointEventHandler.pointerUp(event)
        break
      case pointerEnums.events.PointerCancel:
        return this.pointEventHandler.pointerCancel(event)
        break
    }
    return false
  }

  // Methods called by brush handler
  relayoutModifiedParts (
    selectedNode: Node, _cachedData: unknown, touchedVoxels: unknown[], createBricks: boolean) {
    this.newBrickator.relayoutModifiedParts(selectedNode, touchedVoxels, createBricks)
  }

  rerunLegoPipeline (selectedNode: Node) {
    this.newBrickator.runLegoPipeline(selectedNode)
  }
}
