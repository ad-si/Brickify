import $ from "jquery"
import { saveAs } from "file-saver"
import JSZip from "jszip"
import log from "loglevel"

import * as Spinner from "../../Spinner.js"
import type Bundle from "../../bundle.js"
import type SceneManager from "../../sceneManager.js"
import type Node from "../../../common/project/node.js"
import type DownloadUi from "./DownloadUi.js"

interface DownloadFile {
  data: string | ArrayBuffer | Blob
  fileName: string
}

interface ZippableFile {
  data: string | ArrayBuffer
  fileName: string
  options: {
    binary: boolean
  }
}

interface DownloadOptions {
  type: string
  studRadius: number
  holeRadius: number
}

export default class DownloadProvider {
  bundle: Bundle
  exportUi!: DownloadUi
  sceneManager!: SceneManager
  $stlButton!: JQuery
  $instructionsButton!: JQuery

  constructor (bundle: Bundle) {
    this.init = this.init.bind(this)
    this._createDownload = this._createDownload.bind(this)
    this._convertToZippableType = this._convertToZippableType.bind(this)
    this.bundle = bundle
  }

  init (stlButtonId: string, instructionsButtonId: string, exportUi: DownloadUi, sceneManager: SceneManager): JQuery {
    this.exportUi = exportUi
    this.sceneManager = sceneManager
    this.$stlButton = $(stlButtonId)
    this.$stlButton.on("click", (): number | undefined => {
      const selNode = this.sceneManager.selectedNode
      if (selNode != null) {
        Spinner.startOverlay(this.$stlButton[0])
        this.$stlButton.addClass("disabled")
        return window.setTimeout(
          () => { void this._createDownload("stl", selNode) },
          20,
        )
      }
      return undefined
    })

    this.$instructionsButton = $(instructionsButtonId)
    return this.$instructionsButton.on("click", (): number | undefined => {
      const selNode = this.sceneManager.selectedNode
      if (selNode != null) {
        Spinner.startOverlay(this.$instructionsButton[0])
        this.$instructionsButton.addClass("disabled")
        return window.setTimeout(
          () => { void this._createDownload("instructions", selNode) },
          20,
        )
      }
      return undefined
    })
  }

  _createDownload (type: string, selectedNode: Node) {
    const downloadOptions: DownloadOptions = {
      type,
      studRadius: this.exportUi.studRadius,
      holeRadius: this.exportUi.holeRadius,
    }

    const promisesArray = this.bundle.pluginHooks.getDownload(
      selectedNode,
      downloadOptions,
    )

    return Promise
      .all(promisesArray)
      .then(resultsArray => {
        const files = this._collectFiles(resultsArray)

        // Stop showing spinner
        if (type === "instructions") {
          Spinner.stop(this.$instructionsButton[0])
          this.$instructionsButton.removeClass("disabled")
        }
        else {
          Spinner.stop(this.$stlButton[0])
          this.$stlButton.removeClass("disabled")
        }


        if (files.length === 1 && files[0]) {
          saveAs(
            new Blob([files[0].data]),
            files[0].fileName.replace(/\.stl$/gi, "") + ".stl",
          )
          return
        }
        else if (files.length > 1) {
          const zip = new JSZip()

          const downloadPromises = files.map(file => {
            return this._convertToZippableType(file)
          })

          return Promise
            .all(downloadPromises)
            .then((fileObjects) => {
              fileObjects.forEach(fileObject => {
                if (fileObject) {
                  zip.file(
                    (fileObject).fileName,
                    (fileObject).data,
                  )
                }
              })

              saveAs(
                zip.generate({type: "blob"}),
                `brickify-${selectedNode.name ?? ""}.zip`,
              )
            })

        }
        else {
          bootbox.alert({
            title: "There is nothing to download at the moment",
            message: "This happens when your whole model \
is made out of LEGO \
and you have not selected anything to be 3D-printed. \
Use the Make 3D-print brush for that.",
          })
          return
        }
      })
      .catch((error: unknown) => { log.error(error) })
  }

  _collectFiles (array: unknown[]): DownloadFile[] {
    const files: DownloadFile[] = []
    for (const entry of Array.from(array)) {
      if (entry == null) {
        continue
      }
      if (Array.isArray(entry)) {
        for (const subEntry of Array.from(entry) as DownloadFile[]) {
          if (subEntry.fileName.length > 0) {
            files.push(subEntry)
          }
        }
      }
      else if ((entry as DownloadFile).fileName.length > 0) {
        files.push(entry as DownloadFile)
      }
    }
    return files
  }


  _convertToZippableType ({data, fileName}: DownloadFile): Promise<ZippableFile | undefined> {
    switch (false) {
      case !(data instanceof Blob):
        return this._arrayBufferFromBlob(data as Blob, fileName)

      case !(data instanceof ArrayBuffer):
        return Promise.resolve({
          data: data as ArrayBuffer,
          fileName,
          options: {
            binary: true,
          },
        })

      case (typeof data !== "string") && !(data instanceof String):
        return Promise.resolve({
          data: data as string,
          fileName,
          options: {
            binary: false,
          },
        })
      default:
        { log.warn(`No conversion method found for file ${fileName}`); return Promise.resolve(undefined) }
    }
  }


  _arrayBufferFromBlob (blob: Blob, fileName: string): Promise<ZippableFile> {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
      reader.onload = () => { resolve({
        data: reader.result as ArrayBuffer,
        fileName,
        options: {
          binary: true,
        },
      }) }
      reader.onerror = reject
      reader.onabort = reject
      reader.readAsArrayBuffer(blob)
    })
  }
}
