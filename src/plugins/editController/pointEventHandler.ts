import type Node from "../../common/project/node.js"
import type SceneManager from "../../client/sceneManager.js"
import * as pointerEnums from "../../client/ui/pointerEnums.js"

interface Brush {
  onBrushDown?(event: PointerEvent, node: Node): void;
  onBrushMove?(event: PointerEvent, node: Node): void;
  onBrushOver?(event: PointerEvent, node: Node): void;
  onBrushUp?(event: PointerEvent, node: Node): void;
  onBrushCancel?(event: PointerEvent, node: Node): void;
}

interface BrushUi {
  getSelectedBrush(): Brush | null;
  toggleBrush(): boolean;
}

export default class PointEventHandler {
  sceneManager: SceneManager
  brushUi: BrushUi
  isBrushing: boolean = false
  brushToggled: boolean = false

  constructor (sceneManager: SceneManager, brushUi: BrushUi) {
    this.pointerDown = this.pointerDown.bind(this)
    this.pointerMove = this.pointerMove.bind(this)
    this.pointerUp = this.pointerUp.bind(this)
    this.pointerCancel = this.pointerCancel.bind(this)
    this._untoggleBrush = this._untoggleBrush.bind(this)
    this.sceneManager = sceneManager
    this.brushUi = brushUi
    this.isBrushing = false
    this.brushToggled = false
  }

  pointerDown (event: PointerEvent): boolean {
    if (!this._validBrushButton(event)) {
      return false
    }

    // toggle brush if it is the right mouse button
    if (event.buttons & pointerEnums.buttonStates.right) {
      this.brushToggled = this.brushUi.toggleBrush()
    }

    // perform brush action
    this.isBrushing = true
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    __guardMethod__(this.brushUi.getSelectedBrush(), "onBrushDown", (o: Brush) => { o.onBrushDown!(event, this.sceneManager.selectedNode as Node) })
    return true
  }

  pointerMove (event: PointerEvent): boolean {
    if (!this._validBrushButton(event)) {
      this.pointerCancel(event)
      return false
    }

    // perform brush action
    const brush = this.brushUi.getSelectedBrush()
    if (brush == null) {
      return false
    }

    if (this.isBrushing) {
      if (typeof brush.onBrushMove === "function") {
        brush.onBrushMove(event, this.sceneManager.selectedNode as Node)
      }
      return true
    }
    else if (event.buttons === pointerEnums.buttonStates.none) {
      if (typeof brush.onBrushOver === "function") {
        brush.onBrushOver(event, this.sceneManager.selectedNode as Node)
      }
      return true
    }
    return false
  }

  pointerUp (event: PointerEvent): boolean {
    if (!this.isBrushing) {
      return false
    }

    // end brush action
    this.isBrushing = false
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    __guardMethod__(this.brushUi.getSelectedBrush(), "onBrushUp", (o: Brush) => { o.onBrushUp!(event, this.sceneManager.selectedNode as Node) })

    this._untoggleBrush()
    return true
  }

  pointerCancel (event: PointerEvent): boolean {
    if (!this.isBrushing) {
      return false
    }

    this.isBrushing = false
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    __guardMethod__(this.brushUi.getSelectedBrush(), "onBrushCancel", (o: Brush) => { o.onBrushCancel!(
      event, this.sceneManager.selectedNode as Node,
    ) })

    this._untoggleBrush()
    return true
  }

  _untoggleBrush (): void {
    if (this.brushToggled) {
      this.brushUi.toggleBrush()
      this.brushToggled = false
    }
  }

  _validBrushButton (event: PointerEvent): boolean {
    if (([
      pointerEnums.buttonStates.none,
      pointerEnums.buttonStates.left,
      pointerEnums.buttonStates.right,
    ] as number[]).includes(event.buttons)) {
      return true
    }
    return false
  }
}

function __guardMethod__ <T extends object>(
  obj: T | null | undefined,
  methodName: keyof T,
  transform: (obj: T) => void
): void {
  if (typeof obj !== "undefined" && obj !== null && typeof obj[methodName] === "function") {
    transform(obj)
  }
}
