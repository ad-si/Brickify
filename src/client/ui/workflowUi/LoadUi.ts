import * as fileDropper from "../../modelLoading/fileDropper.js"
import * as fileLoader from "../../modelLoading/fileLoader.js"
import type WorkflowUiClass from "./workflowUi.js"

type WorkflowUi = WorkflowUiClass

interface FileEvent {
  target: EventTarget | { files?: FileList | null } | null
  dataTransfer?: DataTransfer | null
}

export default class LoadUi {
  private workflowUi: WorkflowUi
  private $panel: JQuery

  constructor (workflowUi: WorkflowUi) {
    this.setEnabled = this.setEnabled.bind(this)
    this._initFileLoadHandler = this._initFileLoadHandler.bind(this)
    this.fileLoadHandler = this.fileLoadHandler.bind(this)
    this._checkReplaceModel = this._checkReplaceModel.bind(this)
    this.workflowUi = workflowUi
    this.$panel = $("#loadGroup")
    this._initFileLoadHandler()
  }

  setEnabled (enabled: boolean) {
    return this.$panel.find(".btn, .panel")
      .toggleClass("disabled", !enabled)
  }

  _initFileLoadHandler () {
    fileDropper.init((event: DragEvent) => {
      void this.fileLoadHandler(event)
    })

    return $("#fileInput")
      .on("change", event => {
        void this.fileLoadHandler(event as unknown as FileEvent)
          .then(() => {
            $("#fileInput")
              .val("")
            this.workflowUi.hideMenuIfPossible()
          })
      })
  }

  fileLoadHandler (event: FileEvent): Promise<unknown> {
    const target = event.target as { files?: FileList | null } | null
    const files = target?.files ?? event.dataTransfer?.files
    if (!files) {
      return Promise.resolve()
    }
    return this._checkReplaceModel()
      .then((loadConfirmed: boolean) => {
        if (!loadConfirmed) {
          return undefined
        }
        const spinnerOptions = {
          length: 5,
          radius: 3,
          width: 2,
        }
        const loadButtonFeedback = document.getElementById("loadButtonFeedback")
        if (!loadButtonFeedback) {
          return undefined
        }
        return fileLoader.onLoadFile(
          files,
          loadButtonFeedback,
          spinnerOptions,
        )
          .then((identifier: string | undefined): Promise<unknown> | undefined => {
            if (typeof identifier === "string") {
              return this.workflowUi.bundle.modelLoader.loadByIdentifier(identifier)
            }
            return undefined
          })
      })
  }

  _checkReplaceModel (): Promise<boolean> {
    const question = "You already have a model in your scene. \
Loading the new model will replace the existing model!"

    return this.workflowUi.bundle.sceneManager.scene.then((scene) => {
      if (scene == null || scene.nodes.length === 0) {
        return true
      }
      return new Promise(resolve => bootbox.confirm(question, resolve))
    })
  }
}
