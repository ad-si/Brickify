import Hotkeys, { type HotkeysPluginHooks } from "../hotkeys.js"
import PointerDispatcher from "./pointerDispatcher.js"
import WorkflowUi from "./workflowUi/workflowUi.js"
import HintUi from "./HintUi.js"
import type Bundle from "../bundle.js"
import type Renderer from "../rendering/Renderer.js"

/*
 * @module ui
 */
export default class Ui {
  bundle: Bundle
  renderer: Renderer
  pluginHooks: unknown
  workflowUi: WorkflowUi
  hintUi: HintUi
  pointerDispatcher: PointerDispatcher
  hotkeys?: Hotkeys

  constructor (bundle: Bundle) {
    this.windowResizeHandler = this.windowResizeHandler.bind(this)
    this.init = this.init.bind(this)
    this._initListeners = this._initListeners.bind(this)
    this._initHotkeys = this._initHotkeys.bind(this)
    this._toggleGridVisibility = this._toggleGridVisibility.bind(this)
    this._toggleStabilityView = this._toggleStabilityView.bind(this)
    this._toggleAssemblyView = this._toggleAssemblyView.bind(this)
    this._toggleRendering = this._toggleRendering.bind(this)
    this.bundle = bundle
    this.renderer = this.bundle.renderer
    this.pluginHooks = this.bundle.pluginHooks
    this.workflowUi = new WorkflowUi(this.bundle)
    this.workflowUi.init()
    this.hintUi = new HintUi()
    this.pointerDispatcher = new PointerDispatcher(this.bundle, this.hintUi)
  }

  // Bound to updates to the window size:
  // Called whenever the window is resized.
  windowResizeHandler (_event?: UIEvent): void {
    this.renderer.windowResizeHandler()
  }

  init (): void {
    this._initListeners()
    this._initHotkeys()
  }

  _initListeners (): void {
    this.pointerDispatcher.init()

    window.addEventListener(
      "resize",
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this.windowResizeHandler,
    )
  }

  _initHotkeys (): void {
    this.hotkeys = new Hotkeys(this.pluginHooks as HotkeysPluginHooks, this.bundle.sceneManager)
    this.hotkeys.addEvents(this.bundle.sceneManager.getHotkeys())

    const gridHotkeys = {
      title: "UI",
      events: [
        {
          description: "Toggle coordinate system / lego plate",
          hotkey: "g",
          // eslint-disable-next-line @typescript-eslint/unbound-method
          callback: this._toggleGridVisibility,
        },
        {
          description: "Toggle stability view",
          hotkey: "s",
          // eslint-disable-next-line @typescript-eslint/unbound-method
          callback: this._toggleStabilityView,
        },
        {
          description: "Toggle LEGO assembly view",
          hotkey: "l",
          // eslint-disable-next-line @typescript-eslint/unbound-method
          callback: this._toggleAssemblyView,
        },
      ],
    }
    if (process.env.NODE_ENV === "development") {
      gridHotkeys.events.push({
        description: "Toggle rendering",
        hotkey: "p",
        // eslint-disable-next-line @typescript-eslint/unbound-method
        callback: this._toggleRendering,
      })
    }
    this.hotkeys.addEvents(gridHotkeys)
  }

  _toggleGridVisibility (): void {
    const legoBoard = this.bundle.getPlugin("lego-board") as { toggleVisibility?: () => void } | null
    legoBoard?.toggleVisibility?.()
    const coordSystem = this.bundle.getPlugin("coordinate-system") as { toggleVisibility?: () => void } | null
    coordSystem?.toggleVisibility?.()
  }

  _toggleStabilityView (): void {
    void this.workflowUi.toggleStabilityView()
  }

  _toggleAssemblyView (): void {
    this.workflowUi.toggleAssemblyView()
  }

  _toggleRendering (): void {
    const fidelityControl = this.bundle.getPlugin("FidelityControl") as { reset?: () => void } | null
    if (fidelityControl != null) {
      fidelityControl.reset?.()
    }
    this.renderer.toggleRendering()
  }
}
