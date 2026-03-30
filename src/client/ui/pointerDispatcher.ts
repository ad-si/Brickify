import * as pointerEnums from "./pointerEnums.js"
import type Bundle from "../bundle.js"
import type HintUi from "./HintUi.js"
import type SceneManager from "../sceneManager.js"

type PointerEventHandler = (event: PointerEvent, type: string) => boolean

export default class PointerDispatcher {
  bundle: Bundle
  hintUi: HintUi
  sceneManager?: SceneManager
  brushUi?: unknown

  constructor (bundle: Bundle, hintUi: HintUi) {
    this.init = this.init.bind(this)
    this.initListeners = this.initListeners.bind(this)
    this.onPointerDown = this.onPointerDown.bind(this)
    this.onPointerMove = this.onPointerMove.bind(this)
    this.onPointerUp = this.onPointerUp.bind(this)
    this.onPointerCancel = this.onPointerCancel.bind(this)
    this.onMouseWheel = this.onMouseWheel.bind(this)
    this._capturePointerFor = this._capturePointerFor.bind(this)
    this._releasePointerFor = this._releasePointerFor.bind(this)
    this.onContextMenu = this.onContextMenu.bind(this)
    this.bundle = bundle
    this.hintUi = hintUi
  }

  init (): void {
    this.sceneManager = this.bundle.sceneManager
    const ui = this.bundle.ui as { workflowUi?: { workflow?: { edit?: { brushUi?: unknown } } } } | undefined
    this.brushUi = ui?.workflowUi?.workflow?.edit?.brushUi
    this.initListeners()
  }

  initListeners (): void {
    const _registerEvent = (element: HTMLElement, event: string): void => {
      const handlerName = ("on" + event) as keyof PointerDispatcher
      const handler = this[handlerName] as ((e: Event) => void) | undefined
      if (handler) {
        element.addEventListener(event.toLowerCase(), handler)
      }
    }

    const element = this.bundle.ui?.renderer.getDomElement() as HTMLElement | undefined
    if (!element) return
    // eslint-disable-next-line @typescript-eslint/unbound-method
    element.addEventListener("wheel", this.onMouseWheel)

    for (const event in pointerEnums.events) {
      _registerEvent(element, event)
    }
  }

  onPointerOver (_event: PointerEvent): void {
  }

  onPointerEnter (_event: PointerEvent): void {
  }

  onPointerDown (event: PointerEvent): void {
    // don't call mouse events if there is no selected node
    if (this.sceneManager?.selectedNode == null) {
      return
    }

    // capture event in all cases
    this._capturePointerFor(event)

    // dispatch event
    const handled = this._dispatchEvent(event, pointerEnums.events.PointerDown)

    // notify hint ui
    this.hintUi.pointerDown(event, handled)

    // Stop event if a plugin handled it (else let pointer controls work)
    if (handled) {
      this._stop(event)
    }

  }

  onPointerMove (event: PointerEvent): void {
    // don't call mouse events if there is no selected node
    if (this.sceneManager?.selectedNode == null) {
      // notify hint Ui of unhandled event
      this.hintUi.pointerMove(event, false)
      return
    }

    // dispatch event
    const handled = this._dispatchEvent(event, pointerEnums.events.PointerMove)

    // notify hint ui
    this.hintUi.pointerMove(event, handled)

    // Stop event if a plugin handled it (else let pointer controls work)
    if (handled) {
      this._stop(event)
    }
  }

  onPointerUp (event: PointerEvent): void {
    // Pointer capture will be implicitly released

    // don't call mouse events if there is no selected node
    if (this.sceneManager?.selectedNode == null) {
      return
    }

    // dispatch event
    this._dispatchEvent(event, pointerEnums.events.PointerUp)
  }

  onPointerCancel (event: PointerEvent): void {
    // Pointer capture will be implicitly released
    this._dispatchEvent(event, pointerEnums.events.PointerCancel)
  }

  onPointerOut (_event: PointerEvent): void {
  }

  onPointerLeave (_event: PointerEvent): void {
  }

  onGotPointerCapture (_event: PointerEvent): void {
  }

  onLostPointerCapture (_event: PointerEvent): void {
  }

  onMouseWheel (event: WheelEvent): boolean {
    this.hintUi.mouseWheel()

    // this is needed because chrome (not firefox/IE) does not
    // handle multiple listeners correctly
    const target = event.target as HTMLElement | null
    // eslint-disable-next-line @typescript-eslint/unbound-method
    target?.removeEventListener("wheel", this.onMouseWheel)

    return false
  }

  _capturePointerFor (event: PointerEvent): void {
    const element = this.bundle.ui?.renderer.getDomElement() as HTMLElement | undefined
    element?.setPointerCapture(event.pointerId)
  }

  _releasePointerFor (event: PointerEvent): void {
    const element = this.bundle.ui?.renderer.getDomElement() as HTMLElement | undefined
    element?.releasePointerCapture(event.pointerId)
  }

  onContextMenu (event: Event): void {
    // this event sometimes interferes with right clicks
    this._stop(event)
  }

  _stop (event: Event): void {
    event.stopPropagation()
    event.stopImmediatePropagation()
    event.preventDefault()
  }

  // call plugin after plugin until a plugin reacts to this pointer event
  // returns false if no plugin handled this event
  _dispatchEvent (event: PointerEvent, type: string): boolean {
    const hooks = this.bundle.pluginHooks as { get?: (name: string) => Iterable<PointerEventHandler> } | undefined
    const hookList = hooks?.get?.("onPointerEvent")
    if (hookList) {
      for (const hook of Array.from(hookList)) {
        if (hook(event, type)) {
          return true
        }
      }
    }
    return false
  }
}
