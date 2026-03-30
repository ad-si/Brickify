import $ from "jquery"
// Ensure Bootstrap plugins attach to the same jQuery instance used in the app
window.jQuery = window.$ = $
// Kick off loading Bootstrap (no top-level await to support legacy targets)
const bootstrapReady = import("bootstrap/dist/js/bootstrap.js")

import ZeroClipboard from "zeroclipboard"
import log from "loglevel"

import Bundle from "./bundle.js"

import type { GlobalConfig } from "../types/index.js"

import globalConfig from "../common/globals.yaml"

if (process.env.NODE_ENV === "development") {
  log.enableAll()
}
else {
  log.setLevel("warn")
}

type CommandFunction = (value: string) => Promise<void> | void

const commandFunctions: Partial<Record<string, CommandFunction>> = {
  initialModel (identifier: string) {
    // load selected model
    log.debug("loading initial model")
    void bundle.sceneManager.clearScene()
    return bundle.modelLoader.loadByIdentifier(identifier)
  },
}

const postInitCallback = function () {
  // look at url hash and run commands
  let {
    hash,
  } = window.location
  hash = hash.substring(1, hash.length)
  const commands = hash.split("+")
  let prom = Promise.resolve()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const runCmd = (key: string, value: string) => () => Promise.resolve(commandFunctions[key]!(value))
  for (const cmd of Array.from(commands)) {
    const key = cmd.split("=")[0]
    const value = cmd.split("=")[1]
    if (key && commandFunctions[key] != null) {
      prom = prom.then(runCmd(key, value))
    }
  }

  // clear url hash after executing commands
  return window.location.hash = ""
}

const bundle = new Bundle(globalConfig as GlobalConfig)
void bundle.init()
  .then(postInitCallback)

// Initialize UI elements after Bootstrap is ready
void bootstrapReady.then(() => {
  // init direct help (always available)
  ($("#cmdHelp") as JQuery & { tooltip(opts: unknown): JQuery })
    .tooltip({placement: "bottom"})
    .on("click", () => { (bundle as Bundle & { ui: { hotkeys: { showHelp(): void } } }).ui.hotkeys.showHelp() })

  // init share logic (only works with server session)
  $.get("/share")
    .then((link) => {
      ZeroClipboard.config(
        {swfPath: "/node_modules/zeroclipboard/dist/ZeroClipboard.swf"})
      const url = `${document.location.origin}/app?share=${String(link)}`
      ;($("#cmdShare") as JQuery & { tooltip(opts: unknown): JQuery })
        .tooltip({placement: "bottom"})
        .on("click", () => {
          void (bundle as Bundle & { saveChanges(): Promise<void> }).saveChanges()
            .then(() =>
              bootbox.dialog({
                title: "Share your work!",
                message: "<label for=\"shareUrl\">Via URL:</label> \
<input id=\"shareUrl\" class=\"form-control not-readonly\" \
type=\"text\" value=\"" + url + "\" onClick=\"this.select()\" readonly> \
<div id=\"copy-button\" class=\"btn btn-primary copy-button\" \
data-clipboard-text=\"" + url + '">Copy</div>',
              }),
            )
          const copyButton = $("#copy-button")
          const client = new ZeroClipboard(copyButton)

          return client.on("ready", (_readyEvent: unknown) => client.on("aftercopy", (_event: unknown) => {
            copyButton.html('Copied <span class="fa fa-check"></span>')
            return copyButton.addClass("btn-success")
          }))
        })
    })
    .catch(() => {
      // Share feature not available (static build or no session)
      $("#cmdShare").hide()
    })
})
