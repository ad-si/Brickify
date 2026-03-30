export default class ShareUi {
  private $shareButton: JQuery

  constructor () {
    this.setEnabled = this.setEnabled.bind(this)
    this.$shareButton = $("#shareButton")

    // Hide share button in static builds (no server to generate share links)
    if (typeof IS_STATIC_BUILD !== 'undefined' && IS_STATIC_BUILD) {
      this.$shareButton.hide()
      return
    }

    this._initNotImplementedMessages()
  }

  _initNotImplementedMessages () {
    const alertCallback = () => bootbox.alert({
      title: "Not implemented yet",
      message: "We are sorry, but this feature is not implemented yet. \
Please check back later.",
    })

    return this.$shareButton.on("click", () => {
      return alertCallback()
    })
  }

  setEnabled (enabled: boolean) {
    return this.$shareButton.toggleClass("disabled", !enabled)
  }
}
