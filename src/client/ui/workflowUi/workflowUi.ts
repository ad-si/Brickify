import PerfectScrollbar from "perfect-scrollbar"

import LoadUi from "./LoadUi.js"
import EditUi from "./EditUi.js"
import PreviewUi from "./PreviewUi.js"
import ExportUi from "./ExportUi.js"
import type Bundle from "../../bundle.js"
import type Node from "../../../common/project/node.js"
import type Scene from "../../../common/project/scene.js"

interface WorkflowSteps {
  load: LoadUi
  edit: EditUi
  preview: PreviewUi
  export: ExportUi
  [key: string]: LoadUi | EditUi | PreviewUi | ExportUi
}

interface WorkflowStepUi {
  setEnabled(enabled: boolean): unknown
}

export default class WorkflowUi {
  bundle: Bundle
  workflow!: WorkflowSteps
  private scrollbar?: PerfectScrollbar

  constructor (bundle: Bundle) {
    this.onNodeAdd = this.onNodeAdd.bind(this);   this.onNodeRemove = this.onNodeRemove.bind(this);   this.onNodeSelect = this.onNodeSelect.bind(this);   this.onNodeDeselect = this.onNodeDeselect.bind(this);   this.enableOnly = this.enableOnly.bind(this);   this.enableAll = this.enableAll.bind(this);   this._enable = this._enable.bind(this);   this.init = this.init.bind(this);   this.toggleStabilityView = this.toggleStabilityView.bind(this);   this.toggleAssemblyView = this.toggleAssemblyView.bind(this);   this.bundle = bundle
  }

  // Called by sceneManager when a node is added
  onNodeAdd (_node: Node) {
    return this._enable(["load", "edit", "preview", "export"])
  }

  // Called by sceneManager when a node is removed
  onNodeRemove (_node: Node): Promise<unknown[] | undefined> {
    this.workflow.preview.quit()
    return this.bundle.sceneManager.scene.then((scene: Scene | undefined) => {
      if (scene == null || scene.nodes.length === 0) {
        return this.enableOnly(this.workflow.load)
      }
      return undefined
    })
  }

  onNodeSelect (node: Node) {
    this.workflow.edit.onNodeSelect(node)
  }

  onNodeDeselect (node: Node) {
    this.workflow.edit.onNodeDeselect(node)
  }

  enableOnly (groupUi: WorkflowStepUi): unknown[] {
    return (() => {
      const result: unknown[] = []
      for (const step in this.workflow) {
        const ui = this.workflow[step]
        result.push(ui.setEnabled(ui === groupUi))
      }
      return result
    })()
  }

  enableAll () {
    return this._enable(Object.keys(this.workflow))
  }

  _enable (groupsList: string[]): unknown[] {
    return (() => {
      const result: unknown[] = []
      for (const step in this.workflow) {
        const ui = this.workflow[step]
        result.push(ui.setEnabled(Array.from(groupsList)
          .includes(step)))
      }
      return result
    })()
  }

  init () {
    this.workflow = {
      load: new LoadUi(this),
      edit: new EditUi(this),
      preview: new PreviewUi(this),
      export: new ExportUi(this),
    }

    this.enableOnly(this.workflow.load)

    this._initScrollbar()
    return this._initToggleButton()
  }

  _initScrollbar () {
    const sidebar = document.getElementById("leftSidebar")
    if (sidebar) {
      this.scrollbar = new PerfectScrollbar(sidebar)
      window.addEventListener("resize", () => { this.scrollbar?.update() })
    }
  }

  _initToggleButton () {
    // Start with sidebar collapsed on mobile
    if ($("#toggleMenu:visible").length > 0) {
      $("#leftSidebar").addClass("collapsed-sidebar")
    }
    return $("#toggleMenu")
      .on("click", () => this.toggleMenu())
  }

  toggleMenu () {
    $("#leftSidebar")
      .css({height: "auto"})
    return $("#sidebar-content")
      .slideToggle(400, () => {
        $("#leftSidebar")
          .toggleClass("collapsed-sidebar")
        return $("#leftSidebar")
          .css({height: ""})
      })
  }

  hideMenuIfPossible (): void {
    if (!($("#toggleMenu:visible").length > 0)) {
      return
    }
    $("#leftSidebar")
      .css({height: "auto"})
    $("#sidebar-content")
      .slideUp(400, () => {
        $("#leftSidebar")
          .addClass("collapsed-sidebar")
        return $("#leftSidebar")
          .css({height: ""})
      })
  }

  toggleStabilityView () {
    return this.workflow.preview.toggleStabilityView()
  }

  toggleAssemblyView () {
    this.workflow.preview.toggleAssemblyView()
  }
}
