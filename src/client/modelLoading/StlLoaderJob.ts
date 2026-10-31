import md5 from "blueimp-md5"
import { buildFaceVertexMeshFromTriangles } from "meshlib/buildFaceVertexMesh"
import { convertModelToBase64 } from "meshlib/convertToBase64"

import parseStl from "./parseStl.js"

export type StlLoadingStage = "parsing" | "merging" | "encoding"

export interface StlJobResult {
  warnings: string[]
  vertexCoordinates: Float32Array
  faceVertexIndices: Uint32Array
  vertexNormalCoordinates: Float32Array
  faceNormalCoordinates: Float32Array
  // Equal to `model.getBase64()` and its md5 hash used as model identifier
  base64Model: string
  identifier: string
}

// Parses an STL file, merges its vertices into a face-vertex mesh
// and encodes it for the model cache.
// Runs inside the STL worker or as a fallback on the main thread.
export function runStlJob (
  buffer: ArrayBuffer,
  modelName: string,
  onProgress: (stage: StlLoadingStage, progress: number) => void = () => {},
): StlJobResult {
  onProgress("parsing", 0)
  const stl = parseStl(buffer, progress => { onProgress("parsing", progress) })

  onProgress("merging", 0)
  const mesh = buildFaceVertexMeshFromTriangles(
    stl.triangleCoordinates,
    stl.faceNormalCoordinates,
  )

  onProgress("encoding", 0)
  const base64Model = convertModelToBase64(mesh, modelName)

  return {
    warnings: stl.warnings,
    vertexCoordinates: Float32Array.from(mesh.vertexCoordinates),
    faceVertexIndices: Uint32Array.from(mesh.faceVertexIndices),
    vertexNormalCoordinates: Float32Array.from(mesh.vertexNormalCoordinates),
    faceNormalCoordinates: Float32Array.from(mesh.faceNormalCoordinates),
    base64Model,
    identifier: md5(base64Model),
  }
}
