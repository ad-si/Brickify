import $ from "jquery"
import log from "loglevel"
import meshlib from "meshlib"

import * as modelCache from "./modelCache.js"
import { loadStl } from "./StlLoaderClient.js"
import * as Spinner from "../Spinner.js"
import * as dialog from "../ui/dialog.js"
import type { SpinnerOptions } from "../Spinner.js"

const readingString = "Reading file"
const parsingString = "Parsing file"
const mergingString = "Building mesh"
const encodingString = "Encoding mesh"
const uploadString = "Uploading file"
const loadedString = "File loaded!"
const errorString = "Import failed!"

// Shows the loading status as text next to a spinner in the target element
class LoadingStatus {
  private target: HTMLElement
  private label: HTMLSpanElement

  constructor (target: HTMLElement, spinnerOptions: SpinnerOptions) {
    this.target = target
    this.label = document.createElement("span")
    target.textContent = ""
    target.appendChild(this.label)
    Spinner.start(target, spinnerOptions)
  }

  set (text: string, progress?: number) {
    this.label.textContent = progress == null
      ? text
      : `${text} ${String(Math.round(progress * 100))}%`
  }

  finish (text: string) {
    Spinner.stop(this.target)
    this.label.textContent = text
  }
}

const readFile = (
  file: File,
  onProgress: (progress: number) => void,
): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onprogress = (event) => {
    if (event.lengthComputable) onProgress(event.loaded / event.total)
  }
  reader.onload = () => { resolve(reader.result as ArrayBuffer) }
  reader.onerror = () => { reject(reader.error ?? new Error("Reading the file failed")) }
  reader.onabort = () => { reject(new Error("Reading the file was aborted")) }
  reader.readAsArrayBuffer(file)
})

const loadFile = async function (
  file: File,
  status: LoadingStatus,
): Promise<string> {
  const buffer = await readFile(file, progress => {
    status.set(readingString, progress)
  })

  const stl = await loadStl(buffer, file.name, (stage, progress) => {
    if (stage === "parsing") status.set(parsingString, progress)
    else if (stage === "merging") status.set(mergingString)
    else status.set(encodingString)
  })
  log.debug(`Parsed ${file.name}: ` +
    `${String(stl.faceVertexIndices.length / 3)} faces, ` +
    `${String(stl.vertexCoordinates.length / 3)} vertices`)
  stl.warnings.forEach(warning => { log.warn(warning) })

  // Equal to the structure of models loaded from the server
  const model = meshlib.Model
    .fromObject({
      name: file.name,
      fileName: file.name,
      mesh: {
        faces: [],
        faceVertex: {
          vertexCoordinates: Array.from(stl.vertexCoordinates),
          faceVertexIndices: Array.from(stl.faceVertexIndices),
          vertexNormalCoordinates: Array.from(stl.vertexNormalCoordinates),
          faceNormalCoordinates: Array.from(stl.faceNormalCoordinates),
        },
      },
    })
    .buildFacesFromFaceVertexMesh()

  status.set(uploadString)
  return modelCache.storeEncoded(model, stl.base64Model, stl.identifier)
}

export const onLoadFile = async function (
  files: FileList,
  feedbackTarget: HTMLElement,
  spinnerOptions: SpinnerOptions,
): Promise<string | undefined> {
  if (files.length < 1) {
    throw new Error("No files provided")
  }

  const file = files[0]
  if (!file.name.toLowerCase()
    .endsWith(".stl")) {
    dialog.alert({
      title: "Your file does not have the right format!",
      message: "Only .stl files are supported at the moment. \
We are working on adding more file formats",
    })
    throw new Error("Wrong file format")
  }

  const status = new LoadingStatus(feedbackTarget, spinnerOptions)
  try {
    const identifier = await loadFile(file, status)
    status.finish(loadedString)
    return identifier
  }
  catch (error: unknown) {
    status.finish(errorString)
    const details = $("<div>")
      .text(error instanceof Error ? error.message : String(error))
      .html()
    dialog.alert({
      title: "Import failed",
      message:
        `<p>Your file contains errors that we could not fix.</p> \
<p>Details:</br> \
<small>${details}</small> \
</p>`,
    })
    log.error(error)
    return undefined
  }
}
