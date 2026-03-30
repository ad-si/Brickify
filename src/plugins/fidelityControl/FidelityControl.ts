/**
 * Fidelity Control Plugin
 *
 * Measures the current FPS and instigates rendering fidelity changes
 * accordingly via the `uglify()` and `beautify()` plugin hooks
 */

import $ from "jquery"
import type Bundle from "../../client/bundle.js"
import type PluginHooksClass from "../../common/pluginHooks.js"

interface FidelityOptions {
  screenshotMode?: boolean;
}

type SetFidelityFn = (level: number, levels: string[], options: FidelityOptions) => void

const minimalAcceptableFps = 20
const upgradeThresholdFps = 40
const accumulationTime = 200
const timesBelowThreshold = 10
const fpsDisplayUpdateTime = 1000
const maxNoPipelineDecisions = 3

/*
 * @class FidelityControl
 */
export default class FidelityControl {
  static fidelityLevels: string[] = [
    "DefaultLow",
    "DefaultMedium",
    "DefaultHigh",
    "PipelineLow",
    "PipelineMedium",
    "PipelineHigh",
    "PipelineUltra",
  ]
  static minimalPipelineLevel: number = FidelityControl.fidelityLevels.indexOf("PipelineLow")

  bundle!: Bundle
  pluginHooks!: PluginHooksClass
  currentFidelityLevel: number = 0
  autoAdjust: boolean = true
  screenShotMode: boolean = false
  accumulatedFrames: number = 0
  accumulatedTime: number = 0
  timesBelowMinimumFps: number = 0
  showFps: boolean = false
  pipelineAvailable: boolean = false
  noPipelineDecisions: number = 0
  _lastTimestamp: number | null = null
  lastDisplayUpdate: number = 0
  $fpsDisplay: JQuery | null = null
  _levelBeforeScreenshot: number = 0

  constructor () {
    this.init = this.init.bind(this)
    this.on3dUpdate = this.on3dUpdate.bind(this)
    this._adjustFidelity = this._adjustFidelity.bind(this)
    this._increaseFidelity = this._increaseFidelity.bind(this)
    this._decreaseFidelity = this._decreaseFidelity.bind(this)
    this._setFidelity = this._setFidelity.bind(this)
    this.getHotkeys = this.getHotkeys.bind(this)
    this._manualIncrease = this._manualIncrease.bind(this)
    this._manualDecrease = this._manualDecrease.bind(this)
    this._setupFpsDisplay = this._setupFpsDisplay.bind(this)
    this._showFps = this._showFps.bind(this)
    this.enableScreenshotMode = this.enableScreenshotMode.bind(this)
    this.disableScreenshotMode = this.disableScreenshotMode.bind(this)
    this.reset = this.reset.bind(this)
  }

  init (bundle: Bundle) {
    this.bundle = bundle
    this.pluginHooks = this.bundle.pluginHooks

    this.currentFidelityLevel = 0

    this.autoAdjust = true
    this.screenShotMode = false

    this.accumulatedFrames = 0
    this.accumulatedTime = 0

    this.timesBelowMinimumFps = 0

    this.showFps = process.env.NODE_ENV === "development"
    this._setupFpsDisplay()

    // allow pipeline only if we have the needed extension and a stencil buffer
    // and if the pipeline is enabled in the global config
    const {
      usePipeline,
    } = this.bundle.globalConfig.rendering
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const depth = (this.bundle.renderer as any).threeRenderer.supportsDepthTextures()
    const fragDepth = (this.bundle.renderer as any).threeRenderer.extensions.get("EXT_frag_depth")
    const stencilBuffer = (this.bundle.renderer as any).threeRenderer.hasStencilBuffer
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    // Capabilities detection (for debugging)
    // let _capabilites = ""
    // if (depth != null) {
    //   _capabilites += "DepthTextures "
    // }
    // if (fragDepth != null) {
    //   _capabilites += "ExtFragDepth "
    // }
    // if (stencilBuffer) {
    //   _capabilites += "stencilBuffer "
    // }

    this.pipelineAvailable = usePipeline && (depth != null) && (fragDepth != null) && Boolean(stencilBuffer)
    return this.noPipelineDecisions = 0
  }

  on3dUpdate (timestamp: number) {
    if (this._lastTimestamp == null) {
      this._lastTimestamp = timestamp
      return
    }

    const delta = timestamp - this._lastTimestamp

    this._lastTimestamp = timestamp
    this.accumulatedTime += delta
    this.accumulatedFrames++

    if (this.accumulatedTime > accumulationTime) {
      const fps = (this.accumulatedFrames / this.accumulatedTime) * 1000
      this.accumulatedFrames = 0
      this.accumulatedTime %= accumulationTime
      this._adjustFidelity(fps)
      this._showFps(timestamp, fps)
    }
  }

  _adjustFidelity (fps: number) {
    if (this.screenShotMode || !this.autoAdjust) {
      return
    }

    if ((fps < minimalAcceptableFps) && (this.currentFidelityLevel > 0)) {
      // count how often we dropped below the desired fps
      // it has to occur at least @timesBelowThreshold times to cause a change
      this.timesBelowMinimumFps++
      if (this.timesBelowMinimumFps < timesBelowThreshold) {
        return
      }

      this.timesBelowMinimumFps = 0
      if (this.currentFidelityLevel === FidelityControl.minimalPipelineLevel) {
        this.noPipelineDecisions++
      }
      this._decreaseFidelity()

    }
    else if ((fps > upgradeThresholdFps) &&
    (this.currentFidelityLevel < (FidelityControl.fidelityLevels.length - 1))) {
      // upgrade instantly, but reset downgrade counter
      this.timesBelowMinimumFps = 0
      if (this.currentFidelityLevel === (FidelityControl.minimalPipelineLevel - 1)) {
        if (this.noPipelineDecisions > maxNoPipelineDecisions) {
          return
        }
      }
      this._increaseFidelity()
    }
  }

  _increaseFidelity (): void {
    // only allow pipeline when we have the extensions needed for it
    if ((this.currentFidelityLevel === 2) && !this.pipelineAvailable) {
      return
    }

    // Increase fidelity
    this.currentFidelityLevel++
    this._setFidelity()
  }

  _decreaseFidelity (): void {
    // Decrease fidelity
    this.currentFidelityLevel--
    this._setFidelity()
  }

  _setFidelity (): void {
    ;(this.pluginHooks as unknown as { setFidelity: SetFidelityFn }).setFidelity(
      this.currentFidelityLevel, FidelityControl.fidelityLevels, {},
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ;(this.bundle.renderer as any).setFidelity(
      this.currentFidelityLevel, FidelityControl.fidelityLevels, {},
    )
  }

  getHotkeys () {
    return {
      title: "Visual Complexity",
      events: [
        {
          description: "Increase visual complexity (turns off automatic adjustment)",
          hotkey: "i",
          // eslint-disable-next-line @typescript-eslint/unbound-method
          callback: this._manualIncrease,
        },
        {
          description: "Decrease visual complexity (turns off automatic adjustment)",
          hotkey: "d",
          // eslint-disable-next-line @typescript-eslint/unbound-method
          callback: this._manualDecrease,
        },
      ],
    }
  }

  _manualIncrease (): void {
    this.autoAdjust = false
    if (this.currentFidelityLevel < (FidelityControl.fidelityLevels.length - 1)) {
      this._increaseFidelity()
    }
  }

  _manualDecrease (): void {
    this.autoAdjust = false
    if (this.currentFidelityLevel > 0) {
      this._decreaseFidelity()
    }
  }

  _setupFpsDisplay (): void {
    if (!this.showFps) {
      return
    }
    this.lastDisplayUpdate = 0
    this.$fpsDisplay = $('<div class="fps-display"></div>')
    $("body")
      .append(this.$fpsDisplay)
  }

  _showFps (timestamp: number, fps: number): void {
    if (!this.showFps) {
      return
    }
    if ((timestamp - this.lastDisplayUpdate) > fpsDisplayUpdateTime) {
      this.lastDisplayUpdate = timestamp
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const levelAbbreviation = FidelityControl.fidelityLevels[this.currentFidelityLevel]
        .match(/[A-Z]/g)!
        .join("")
      const fpsText = `${String(Math.round(fps))}/${levelAbbreviation}`
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.$fpsDisplay!.text(fpsText)
    }
  }

  // disables pipeline for screenshots
  enableScreenshotMode (): void {
    this.screenShotMode = true

    const level = FidelityControl.fidelityLevels.indexOf("DefaultHigh")
    this._levelBeforeScreenshot = this.currentFidelityLevel
    this.currentFidelityLevel = level

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    ;(this.pluginHooks as unknown as { setFidelity: SetFidelityFn }).setFidelity(
      level, FidelityControl.fidelityLevels,
      {screenshotMode: true},
    )
    ;(this.bundle.renderer as any).setFidelity(
      level, FidelityControl.fidelityLevels,
      {screenshotMode: true},
    )
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  // resets screenshot mode, restores old fidelity level
  disableScreenshotMode (): void {
    this.screenShotMode = false

    this.currentFidelityLevel = this._levelBeforeScreenshot

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    ;(this.pluginHooks as unknown as { setFidelity: SetFidelityFn }).setFidelity(
      this.currentFidelityLevel, FidelityControl.fidelityLevels,
      {screenshotMode: false},
    )
    ;(this.bundle.renderer as any).setFidelity(
      this.currentFidelityLevel, FidelityControl.fidelityLevels,
      {screenshotMode: false},
    )
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }

  reset (): void {
    this.accumulatedFrames = 0
    this.accumulatedTime = 0
    this.timesBelowMinimumFps = 0
    this._lastTimestamp = null
  }
}
