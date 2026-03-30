import EditBrushUi from "./EditBrushUi.js"
import type WorkflowUi from "./workflowUi.js"
import type Bundle from "../../bundle.js"
import type Node from "../../../common/project/node.js"
import type { Plugin } from "../../../types/plugin.js"

interface LegoInstructionsPlugin extends Plugin {
  showPartListPopup(node: Node): void
}

export default class EditUi {
  workflowUi: WorkflowUi
  $panel: JQuery
  bundle: Bundle
  brushUi!: EditBrushUi

  constructor (workflowUi: WorkflowUi) {
    this.setEnabled = this.setEnabled.bind(this)
    this._initBrushes = this._initBrushes.bind(this)
    this._initPartList = this._initPartList.bind(this)
    this.onNodeSelect = this.onNodeSelect.bind(this)
    this.onNodeDeselect = this.onNodeDeselect.bind(this)
    this.workflowUi = workflowUi
    this.$panel = $("#editGroup")
    this.bundle = this.workflowUi.bundle

    this._initPartList()
    this._initBrushes()
  }

  setEnabled (enabled: boolean) {
    return this.$panel.find(".btn, .panel, h4, .estimate, #editControls")
      .toggleClass("disabled", !enabled)
  }

  _initBrushes () {
    this.brushUi = new EditBrushUi(this.workflowUi)
    return this.brushUi.init("#brushContainer", "#bigBrushContainer")
  }

  _initPartList () {
    return $("#brickCountContainer")
      .on("click", () => {
        const legoInstructions = this.bundle.getPlugin("lego-instructions") as LegoInstructionsPlugin | null
        if (legoInstructions == null) {
          return
        }
        if (this.bundle.sceneManager.selectedNode == null) {
          return
        }
        legoInstructions.showPartListPopup(this.bundle.sceneManager.selectedNode)
      })
  }

  onNodeSelect (node: Node) {
    this.brushUi.onNodeSelect(node)
  }

  onNodeDeselect (node: Node) {
    this.brushUi.onNodeDeselect(node)
  }
}
