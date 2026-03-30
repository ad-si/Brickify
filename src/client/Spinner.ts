/*
 * A reentrant-save spinner that can be invoked for a html target node.
 * @module Spinner
 */
import Spin from "spin"
import $ from "jquery"

export interface SpinnerOptions {
  lines?: number;
  length?: number;
  width?: number;
  radius?: number;
  scale?: number;
  corners?: number;
  color?: string | string[];
  fadeColor?: string;
  opacity?: number;
  rotate?: number;
  direction?: 1 | -1;
  speed?: number;
  trail?: number;
  fps?: number;
  zIndex?: number;
  className?: string;
  top?: string;
  left?: string;
  shadow?: string;
  position?: string;
}

interface SpinnerInstance {
  spin(): SpinnerInstance;
  stop(): SpinnerInstance;
  el?: HTMLElement;
}

interface SpinnerState {
  spin: SpinnerInstance;
  count: number;
  overlay?: HTMLDivElement;
}

const spinners = new Map<HTMLElement, SpinnerState>()
const defaultTarget = document.createElement("div")
defaultTarget.id = "body-spinner"
document.body.appendChild(defaultTarget)

const defaults: SpinnerOptions = {
  lines: 12,
  length: 7,
  width: 5,
  radius: 10,
  rotate: 0,
  corners: 1,
  color: "#fff",
  direction: 1,
  speed: 1,
  trail: 100,
  opacity: 1 / 4,
  fps: 20,
  zIndex: 2e9,
  className: "spinner",
  top: "50%",
  left: "50%",
  position: "absolute",
}

const addDefaults = (options: SpinnerOptions): void => {
  for (const key of Object.keys(defaults) as Array<keyof SpinnerOptions>) {
    if (options[key] == null) {
      (options as Record<keyof SpinnerOptions, unknown>)[key] = defaults[key]
    }
  }
}


/*
 * Starts a spinner attached to the given target node.
 * @param {DOMNode} [target=document.body] the target node
 * @return {Number} the number of start invocations of this spinner
 * @memberOf Spinner
 */
export function start (target?: HTMLElement | null, options: SpinnerOptions = {}): number {
  const targetEl = target ?? defaultTarget
  addDefaults(options)

  let spinnerState = spinners.get(targetEl)
  if (spinnerState == null) {
    const spin = new Spin(options)
      .spin()
    if (spin.el) {
      targetEl.appendChild(spin.el)
    }
    spinnerState = {spin, count: 0}
    spinners.set(targetEl, spinnerState)
  }

  return ++spinnerState.count
}


/*
 * Starts a spinner located centered above the given target node.
 * @param {DOMNode} [target=document.body] the target node
 * @return {Number} the number of start invocations of this spinner
 * @memberOf Spinner
 */
export function startOverlay (target?: HTMLElement | null, options: SpinnerOptions = {}): number {
  if (target == null) {
    return start(null, options)
  }
  addDefaults(options)

  let spinnerState = spinners.get(target)
  if (spinnerState == null) {
    const spin = new Spin(options)
      .spin()
    const overlay = document.createElement("div")
    overlay.className = "overlay-spinner"
    if (spin.el) {
      overlay.appendChild(spin.el)
    }
    const $target = $(target)
    const offset = $target.offset()
    const top = (offset?.top ?? 0) + (($target.height() ?? 0) / 2)
    const left = (offset?.left ?? 0) + (($target.width() ?? 0) / 2)
    overlay.style.cssText = `top: ${String(top)}px; left: ${String(left)}px;`
    document.body.appendChild(overlay)
    spinnerState = {spin, count: 0, overlay}
    spinners.set(target, spinnerState)
  }

  return spinnerState.count++
}


/*
 * Stops a spinner associated with the given target node.
 * @param {DOMNode} [target=document.body] the target node
 * @return {Number} the number of remaining start invocations of this spinner
 * @memberOf Spinner
 */
export function stop (target?: HTMLElement | null): number | undefined {
  const targetEl = target ?? defaultTarget

  const spinnerState = spinners.get(targetEl)
  if (!spinnerState) {
    return undefined
  }

  spinnerState.count--
  if (spinnerState.count > 0) {
    return spinnerState.count
  }

  spinnerState.spin.stop()

  if (spinnerState.overlay != null) {
    document.body.removeChild(spinnerState.overlay)
  }

  spinners.delete(targetEl)
  return 0
}
