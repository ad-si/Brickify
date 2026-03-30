import type SceneManager from "./sceneManager.js"
import type Node from "../common/project/node.js"

interface HotkeyEvent {
  hotkey: string
  description: string
  callback: (node: Node | null) => void
}

interface HotkeyGroup {
  title: string
  events: HotkeyEvent[]
}

export interface HotkeysPluginHooks {
  getHotkeys: () => HotkeyGroup[]
}

/*
 *  @class Hotkeys
 */
export default class Hotkeys {
  sceneManager: SceneManager
  bootboxOpen: boolean
  events: Partial<Record<string, Array<{hotkey: string, description: string}>>>

  constructor (pluginHooks: HotkeysPluginHooks, sceneManager: SceneManager) {
    this.showHelp = this.showHelp.bind(this)
    this.sceneManager = sceneManager
    this.bootboxOpen = false
    this.events = {}
    this.bind("?", "General", "Show this help", () => {
      this.showHelp()
    })
    this.bind("esc", "General", "Close modal window", () => { bootbox.hideAll() })

    for (const events of pluginHooks.getHotkeys()) {
      this.addEvents(events)
    }
  }

  showHelp (): void {
    if (this.bootboxOpen) {
      return
    }
    let message = ""
    for (const group of Object.keys(this.events)) {
      const events = this.events[group]
      if (!events) continue
      message += "<section><h4>" + group + "</h4>"
      for (const event of events) {
        message += '<p><span class="keys">'
        const keys = event.hotkey.split("+")
          .map((key: string) => "<kbd>" + key + "</kbd>")
        message += keys.join("+")
        message += "</span> <span>" + event.description + "</span></p>"
      }
      message += "</section>"
    }
    const callback = () => {
      this.bootboxOpen = false
      return true
    }
    this.bootboxOpen = true
    bootbox.dialog({
      title: "Keyboard shortcuts",
      message,
      buttons: {
        success: {
          label: "Got it!",
          className: "btn-primary",
          callback,
        },
      },
      onEscape: callback,
    })
  }

  /*
   * @param {String} hotkey Event description of Mousescript
   * @param {String} group Title of section to show in help
   * @param {String} description Description to show in help
   * @param {Function} callback Callback to be called when event is triggered
   */
  bind (hotkey: string, titlegroup: string, description: string, callback: (node: Node | null) => void) {
    Mousetrap.bind(hotkey.toLowerCase(), () => { callback(this.sceneManager.selectedNode) })
    Mousetrap.bind(hotkey.toUpperCase(), () => { callback(this.sceneManager.selectedNode) })
    if (this.events[titlegroup] === undefined) {
      this.events[titlegroup] = []
    }
    return this.events[titlegroup].push({hotkey, description})
  }

  addEvents (eventSpecs: HotkeyGroup | undefined | null): void {
    if (eventSpecs == null) return
    eventSpecs.events
      .map((event: HotkeyEvent) =>
        this.bind(event.hotkey, eventSpecs.title, event.description, event.callback))
  }
}
