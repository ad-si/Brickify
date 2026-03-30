import { Buffer } from "buffer"
import log from "loglevel"
import meshlib from "meshlib"
import stlParser from "stl-parser"

import * as modelCache from "./modelCache.js"
import * as Spinner from "../Spinner.js"
import type { SpinnerOptions } from "../Spinner.js"

const readingString = "Reading file"
const uploadString = "Uploading file"
const loadedString = "File loaded!"
const errorString = "Import failed!"

export const onLoadFile = function (files: FileList, feedbackTarget: HTMLElement, spinnerOptions: SpinnerOptions) {
  if (files.length < 1) {
    return Promise.reject(new Error("No files provided"))
  }

  const file = files[0]
  if (!file.name.toLowerCase()
    .endsWith(".stl")) {
    bootbox.alert({
      title: "Your file does not have the right format!",
      message: "Only .stl files are supported at the moment. \
We are working on adding more file formats",
    })
    return Promise.reject(new Error("Wrong file format"))
  }

  return loadFile(feedbackTarget, file, spinnerOptions)
    .then(handleLoadedFile(feedbackTarget, file.name, spinnerOptions) as (value: ProgressEvent<FileReader>) => Promise<string>)
    .catch((error: unknown): undefined => {
      bootbox.alert({
        title: "Import failed",
        message:
          `<p>Your file contains errors that we could not fix.</p> \
<p>Details:</br> \
<small>${error instanceof Error ? error.message : String(error)}</small> \
</p>`,
      })
      feedbackTarget.innerHTML = errorString
      log.error(error)
      return undefined
    })
}

const loadFile = function (feedbackTarget: HTMLElement, file: File, spinnerOptions: SpinnerOptions): Promise<ProgressEvent<FileReader>> {
  feedbackTarget.innerHTML = readingString
  Spinner.start(feedbackTarget, spinnerOptions)
  const reader = new FileReader()
  return new Promise((resolve, reject) => {
    reader.onload = resolve
    reader.onerror = reject
    reader.onabort = reject
    return setTimeout(() => { reader.readAsArrayBuffer(file) })
  })
}

// Detect if an STL file is binary or ASCII
// Binary STL: 80 byte header + 4 byte face count + (50 bytes * face count)
// ASCII STL: starts with "solid" and contains proper ASCII keywords
//
// This is needed because stl-parser's built-in detection is flawed - it converts
// the entire file to a string and checks for "solid", "facet", and "vertex" keywords.
// Binary STL files often have "solid" in their 80-byte header and can accidentally
// contain byte sequences matching "facet"/"vertex", causing misdetection.
// Our approach uses the file size formula which is more reliable for binary detection.
function detectStlType (arrayBuffer: ArrayBuffer): "ascii" | "binary" {
  const dataView = new DataView(arrayBuffer)

  // If file is too small to be a valid binary STL, assume ASCII
  if (arrayBuffer.byteLength < 84) {
    return "ascii"
  }

  // Read face count from bytes 80-83 (little-endian uint32)
  const faceCount = dataView.getUint32(80, true)

  // Calculate expected binary file size: 84 header bytes + 50 bytes per face
  const expectedBinarySize = 84 + faceCount * 50

  // If file size matches expected binary size (within tolerance for padding),
  // it's likely binary
  if (Math.abs(arrayBuffer.byteLength - expectedBinarySize) <= 1) {
    return "binary"
  }

  // Check if it looks like ASCII by checking for printable characters
  // in the first part of the file (after "solid" keyword)
  const bytes = new Uint8Array(arrayBuffer)
  let asciiCount = 0
  const checkLength = Math.min(1000, bytes.length)
  for (let i = 0; i < checkLength; i++) {
    // Printable ASCII or whitespace
    const byte = bytes[i]
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      asciiCount++
    }
  }

  // If more than 95% of checked bytes are ASCII printable, likely ASCII format
  if (asciiCount / checkLength > 0.95) {
    return "ascii"
  }

  return "binary"
}

interface FileReaderLoadEvent extends ProgressEvent<FileReader> {
  target: FileReader & { result: ArrayBuffer };
}

const handleLoadedFile = (feedbackTarget: HTMLElement, filename: string, spinnerOptions: SpinnerOptions) => function (event: FileReaderLoadEvent): Promise<string> {
  log.debug(`File ${filename} loaded, size: ${String(event.target.result.byteLength)} bytes`)
  const fileContent = event.target.result

  return new Promise((resolve, reject) => {
    const stlType = detectStlType(fileContent)
    log.debug(`Detected STL type: ${stlType}`)

    // Convert ArrayBuffer to Buffer for the stl-parser library.
    // The library expects Buffer and has issues with ArrayBuffer/Uint8Array
    // when type is explicitly set.
    const stlBuffer = Buffer.from(fileContent)

    // For binary STL, we force the type to prevent the library's flawed auto-detection
    // which can incorrectly parse binary files as ASCII if the header contains
    // "solid", "facet", and "vertex" byte sequences.
    const parserOptions = stlType === "binary" ? { type: "binary" as const } : undefined

    const stlParserInstance = stlParser(stlBuffer, parserOptions)

    stlParserInstance.on("error", (error: Error) => { reject(error) })

    // Track if we've already processed valid model data
    // The parser may emit multiple data events (parsed model + raw buffer)
    let modelProcessed = false

    stlParserInstance.on("data", (data: { faces?: unknown[] }) => {
      // Only process if this is a valid parsed model object with faces
      // Skip raw buffer data or subsequent emissions
      if (modelProcessed || !data.faces || !Array.isArray(data.faces)) {
        return
      }

      modelProcessed = true
      const model = meshlib.Model.fromObject({mesh: data})

      model
        .setFileName(filename)
        .setName(filename)
        .calculateNormals()
        .buildFaceVertexMesh()
        .done()
        .then(() => {
          Spinner.stop(feedbackTarget)
          feedbackTarget.innerHTML = uploadString
          Spinner.start(feedbackTarget, spinnerOptions)
          return modelCache.store(model)
        })
        .then((md5hash: string) => {
          Spinner.stop(feedbackTarget)
          feedbackTarget.innerHTML = loadedString
          resolve(md5hash)
        })
        .catch((error: unknown) => { reject(error instanceof Error ? error : new Error(String(error))) })
    })

    // Explicitly start the stream flowing (needed for some stream polyfills)
    if (typeof stlParserInstance.resume === "function") {
      stlParserInstance.resume()
    }
  })
}
