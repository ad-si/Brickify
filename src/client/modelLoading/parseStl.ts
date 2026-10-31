// Parses binary and ASCII STL files directly into flat typed arrays,
// without creating intermediate objects per face or vertex.

export interface ParsedStl {
  name: string
  // 9 values (3 vertices × x, y, z) per face
  triangleCoordinates: Float32Array
  // 3 values per face, calculated from the vertex winding order
  faceNormalCoordinates: Float32Array
  warnings: string[]
}

export type ProgressCallback = (progress: number) => void

const binaryHeaderSize = 84
const binaryFaceSize = 50
const progressInterval = 1 << 16 // faces

// Detect if an STL file is binary or ASCII
// Binary STL: 80 byte header + 4 byte face count + (50 bytes * face count)
// ASCII STL: starts with "solid" and contains proper ASCII keywords
//
// Binary STL files often have "solid" in their 80-byte header,
// so checking for the keyword is not sufficient.
// The file size formula is more reliable for binary detection.
export function detectStlType (buffer: ArrayBuffer): "ascii" | "binary" {
  // If file is too small to be a valid binary STL, assume ASCII
  if (buffer.byteLength < binaryHeaderSize) {
    return "ascii"
  }

  const faceCount = new DataView(buffer).getUint32(80, true)
  const expectedBinarySize = binaryHeaderSize + (faceCount * binaryFaceSize)

  // If file size matches expected binary size (within tolerance for padding),
  // it's likely binary
  if (Math.abs(buffer.byteLength - expectedBinarySize) <= 1) {
    return "binary"
  }

  // Check if it looks like ASCII by checking for printable characters
  // in the first part of the file
  const bytes = new Uint8Array(buffer, 0, Math.min(1000, buffer.byteLength))
  let asciiCount = 0
  for (const byte of bytes) {
    // Printable ASCII or whitespace
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      asciiCount++
    }
  }

  // If more than 95% of checked bytes are ASCII printable, likely ASCII format
  return asciiCount / bytes.length > 0.95 ? "ascii" : "binary"
}

// Writes the normal of the face with the given index,
// calculated from the cross product of its edges
function calculateFaceNormal (
  coordinates: Float32Array,
  normals: Float32Array,
  faceIndex: number,
) {
  const c = faceIndex * 9
  const ax = coordinates[c + 3] - coordinates[c]
  const ay = coordinates[c + 4] - coordinates[c + 1]
  const az = coordinates[c + 5] - coordinates[c + 2]
  const bx = coordinates[c + 6] - coordinates[c]
  const by = coordinates[c + 7] - coordinates[c + 1]
  const bz = coordinates[c + 8] - coordinates[c + 2]
  const nx = (ay * bz) - (az * by)
  const ny = (az * bx) - (ax * bz)
  const nz = (ax * by) - (ay * bx)
  const length = Math.sqrt((nx * nx) + (ny * ny) + (nz * nz))
  const n = faceIndex * 3
  // Degenerated faces get a zero normal
  if (length > 0) {
    normals[n] = nx / length
    normals[n + 1] = ny / length
    normals[n + 2] = nz / length
  }
}

export function parseBinaryStl (
  buffer: ArrayBuffer,
  onProgress?: ProgressCallback,
): ParsedStl {
  if (buffer.byteLength < binaryHeaderSize) {
    throw new Error("Binary STL is too short to contain a header")
  }

  const warnings: string[] = []
  const view = new DataView(buffer)
  const name = new TextDecoder()
    .decode(new Uint8Array(buffer, 0, 80))
    .replace(/\0[\s\S]*$/, "")
    .trim()

  const specifiedFaceCount = view.getUint32(80, true)
  const availableFaceCount = Math.floor(
    (buffer.byteLength - binaryHeaderSize) / binaryFaceSize,
  )
  const faceCount = Math.min(specifiedFaceCount, availableFaceCount)

  if (specifiedFaceCount !== availableFaceCount) {
    warnings.push(
      `Number of specified faces (${String(specifiedFaceCount)}) ` +
      `and file size (${String(availableFaceCount)} faces) do not match`,
    )
  }
  if (faceCount === 0) {
    throw new Error("No faces were specified in the binary STL")
  }

  const triangleCoordinates = new Float32Array(faceCount * 9)
  const faceNormalCoordinates = new Float32Array(faceCount * 3)

  for (let face = 0; face < faceCount; face++) {
    // Skip the stored normal (12 bytes) as it is recalculated
    const offset = binaryHeaderSize + (face * binaryFaceSize) + 12
    for (let i = 0; i < 9; i++) {
      triangleCoordinates[(face * 9) + i] =
        view.getFloat32(offset + (i * 4), true)
    }
    calculateFaceNormal(triangleCoordinates, faceNormalCoordinates, face)

    if (onProgress && face % progressInterval === 0) {
      onProgress(face / faceCount)
    }
  }

  return { name, triangleCoordinates, faceNormalCoordinates, warnings }
}

export function parseAsciiStl (
  buffer: ArrayBuffer,
  onProgress?: ProgressCallback,
): ParsedStl {
  const text = new TextDecoder().decode(buffer)
  const warnings: string[] = []

  const solidMatch = /^\s*solid\b[ \t]*([^\r\n]*)/.exec(text)
  if (!solidMatch) {
    throw new Error("ASCII STL does not start with the solid keyword")
  }
  const name = solidMatch[1].trim()

  // Approximate size of a face in an ASCII STL to preallocate memory
  let capacity = Math.max(16, Math.ceil(text.length / 250))
  let triangleCoordinates = new Float32Array(capacity * 9)
  let faceCount = 0
  let invalidFaceCount = 0

  // Coordinates of the current facet
  const facet: number[] = []

  const keywords =
    /\b(?:vertex\s+(?<x>\S+)\s+(?<y>\S+)\s+(?<z>\S+)|(?<endfacet>endfacet)\b|(?<facet>facet)\b|endsolid\b)/g
  let foundEndsolid = false
  let match: RegExpExecArray | null

  while ((match = keywords.exec(text)) !== null) {
    const groups: Partial<Record<string, string>> = match.groups ?? {}

    if (groups.x != null && groups.y != null && groups.z != null) {
      for (const coordinate of [groups.x, groups.y, groups.z]) {
        const value = Number(coordinate)
        if (!Number.isFinite(value)) {
          throw new Error(
            `Invalid vertex coordinate "${coordinate}" ` +
            `in face ${String(faceCount + 1)}`,
          )
        }
        facet.push(value)
      }
    }
    else if (groups.endfacet != null) {
      if (facet.length !== 9) {
        invalidFaceCount++
        facet.length = 0
        continue
      }
      if (faceCount === capacity) {
        capacity *= 2
        const grown = new Float32Array(capacity * 9)
        grown.set(triangleCoordinates)
        triangleCoordinates = grown
      }
      triangleCoordinates.set(facet, faceCount * 9)
      faceCount++
      facet.length = 0

      if (onProgress && faceCount % progressInterval === 0) {
        onProgress(keywords.lastIndex / text.length)
      }
    }
    else if (groups.facet != null) {
      facet.length = 0
    }
    else { // endsolid
      foundEndsolid = true
    }
  }

  if (invalidFaceCount > 0) {
    warnings.push(
      `Skipped ${String(invalidFaceCount)} faces which did not have exactly 3 vertices`,
    )
  }
  if (!foundEndsolid) {
    warnings.push("ASCII STL is not closed with the endsolid keyword")
  }
  if (faceCount === 0) {
    throw new Error("ASCII STL does not contain any faces")
  }

  triangleCoordinates = triangleCoordinates.slice(0, faceCount * 9)
  const faceNormalCoordinates = new Float32Array(faceCount * 3)
  for (let face = 0; face < faceCount; face++) {
    calculateFaceNormal(triangleCoordinates, faceNormalCoordinates, face)
  }

  return { name, triangleCoordinates, faceNormalCoordinates, warnings }
}

export default function parseStl (
  buffer: ArrayBuffer,
  onProgress?: ProgressCallback,
): ParsedStl {
  if (buffer.byteLength === 0) {
    throw new Error("The STL file is empty")
  }
  return detectStlType(buffer) === "binary"
    ? parseBinaryStl(buffer, onProgress)
    : parseAsciiStl(buffer, onProgress)
}
