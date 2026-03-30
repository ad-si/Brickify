import DownloadProvider from "./DownloadProvider.js"
import { getModal as downloadModal } from "../downloadModal.js"
import type Bundle from "../../bundle.js"
import type { StudSizeConfig, HoleSizeConfig } from "../../../types/index.js"

export default class DownloadUi {
  bundle: Bundle
  studSize: StudSizeConfig
  holeSize: HoleSizeConfig
  exportStepSize: number
  $downloadButton: JQuery
  $downloadModal!: JQuery
  downloadProvider!: DownloadProvider
  studSizeSelect!: JQuery
  holeSizeSelect!: JQuery
  studRadiusSelection!: string
  studRadius!: number
  holeRadiusSelection!: string
  holeRadius!: number

  constructor (bundle: Bundle) {
    this.setEnabled = this.setEnabled.bind(this)
    this._initDownloadModal = this._initDownloadModal.bind(this)
    this._initDownloadModalContent = this._initDownloadModalContent.bind(this)
    this._updateStudRadius = this._updateStudRadius.bind(this)
    this._updateHoleRadius = this._updateHoleRadius.bind(this)
    this.bundle = bundle;
    ({studSize: this.studSize, holeSize: this.holeSize, exportStepSize: this.exportStepSize} = this.bundle.globalConfig)

    this.$downloadButton = $("#downloadButton")

    this._initDownloadModal()
    this._initDownloadModalContent()
  }

  setEnabled (enabled: boolean) {
    this.$downloadModal.find(".btn, .panel, h4")
      .toggleClass("disabled", !enabled)
    return this.$downloadButton.toggleClass("disabled", !enabled)
  }

  _initDownloadModal () {
    this.$downloadModal = downloadModal(this.bundle.globalConfig.downloadSettings)
    $("body")
      .append(this.$downloadModal)

    // show modal when clicking on download button
    return this.$downloadButton.on("click", () => {
      ;(this.$downloadModal as JQuery & { modal: (action: string) => void }).modal("show")
    })
  }

  _initDownloadModalContent () {
    // stl download
    this.downloadProvider = new DownloadProvider(this.bundle)
    this.downloadProvider.init(
      "#stlDownloadButton", "#downloadInstructionsButton",
      this, this.bundle.sceneManager,
    )

    this.studSizeSelect = $("#studSizeSelect")
    this.holeSizeSelect = $("#holeSizeSelect")

    this.studSizeSelect.on("input", () => {
      return this._updateStudRadius()
    })
    this.holeSizeSelect.on("input", () => {
      return this._updateHoleRadius()
    })

    this._updateStudRadius()
    return this._updateHoleRadius()
  }

  _updateStudRadius () {
    const studSelection = parseInt(this.studSizeSelect.val() as string)
    this.studRadiusSelection = this.studSizeSelect.val() as string
    return this.studRadius = this.studSize.radius + (studSelection * this.exportStepSize)
  }

  _updateHoleRadius () {
    const holeSelection = parseInt(this.holeSizeSelect.val() as string)
    this.holeRadiusSelection = this.holeSizeSelect.val() as string
    return this.holeRadius = this.holeSize.radius + (holeSelection * this.exportStepSize)
  }
}
