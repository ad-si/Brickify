let lastTarget: EventTarget | null = null

export const init = function (callback: (event: DragEvent) => void) {
  const target = document.body
  const overlay = addOverlay(target)
  bindDropHandler(target, overlay, callback)
}

const addOverlay = function (target: HTMLElement) {
  const overlay = document.createElement("div")
  overlay.className = "modal-backdrop"
  overlay.id = "dropoverlay"
  overlay.style.opacity = "0"
  overlay.style.transition = "opacity .1s ease-in-out"
  overlay.innerHTML =
  "<div id=\"dropborder\"> \
<div id=\"dropinfo\" class=\"text-center\">drop here</div> \
</div>"
  target.appendChild(overlay)
  return overlay
}

const bindDropHandler = function (target: HTMLElement, overlay: HTMLDivElement, callback: (event: DragEvent) => void) {
  target.addEventListener("drop", (event: DragEvent) => {
    hideOverlay(overlay)
    callback(event)
    stopEvent(event)
  })
  target.addEventListener("dragover", (event: DragEvent) => { stopEvent(event) })
  target.addEventListener("dragenter", (event: DragEvent) => {
    stopEvent(event)
    showOverlay(overlay)
    return lastTarget = event.target
  })
  target.addEventListener("dragleave", (event: DragEvent) => {
    if (event.target !== lastTarget) {
      return
    }
    stopEvent(event)
    hideOverlay(overlay)
  })
}

const showOverlay = (overlay: HTMLDivElement) => overlay.style.opacity = "0.8"

const hideOverlay = (overlay: HTMLDivElement) => overlay.style.opacity = "0"

const stopEvent = function (event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}
