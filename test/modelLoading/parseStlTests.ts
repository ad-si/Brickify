import md5 from "blueimp-md5"
import { expect } from "chai"
import meshlib from "meshlib"

import parseStl, {
  detectStlType,
  parseAsciiStl,
  parseBinaryStl,
} from "../../src/client/modelLoading/parseStl.js"
import { runStlJob } from "../../src/client/modelLoading/StlLoaderJob.js"

type Triangle = [number, number, number][]

// Converts -0 to 0 for deep equality checks
const toArray = (array: ArrayLike<number>) => Array.from(array, value => value + 0)

// Two triangles forming the unit square in the xy-plane
const square: Triangle[] = [
  [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
  [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
]

const toBinaryStl = (triangles: Triangle[], header = "binary model") => {
  const buffer = new ArrayBuffer(84 + (triangles.length * 50))
  const view = new DataView(buffer)
  new Uint8Array(buffer).set(new TextEncoder().encode(header))
  view.setUint32(80, triangles.length, true)
  triangles.forEach((triangle, face) => {
    // Bogus stored normal, which must be ignored
    view.setFloat32(84 + (face * 50), 9, true)
    triangle.flat().forEach((value, i) => {
      view.setFloat32(84 + (face * 50) + 12 + (i * 4), value, true)
    })
  })
  return buffer
}

const toAsciiStl = (triangles: Triangle[], name = "ascii model") => {
  const facets = triangles.map(triangle =>
    "  facet normal 0 0 0\n    outer loop\n" +
    triangle.map(v => `      vertex ${v.join(" ")}\n`).join("") +
    "    endloop\n  endfacet\n")
  return new TextEncoder()
    .encode(`solid ${name}\n${facets.join("")}endsolid ${name}\n`)
    .buffer
}

describe("STL parsing", () => {
  describe("type detection", () => {
    it("detects ASCII STLs", () => {
      expect(detectStlType(toAsciiStl(square))).to.equal("ascii")
    })

    it("detects binary STLs whose header starts with solid", () => {
      expect(detectStlType(toBinaryStl(square, "solid fake ascii header")))
        .to.equal("binary")
    })
  })

  describe("binary STLs", () => {
    it("parses coordinates and the name", () => {
      const stl = parseBinaryStl(toBinaryStl(square))
      expect(stl.name).to.equal("binary model")
      expect(Array.from(stl.triangleCoordinates)).to.deep.equal(square.flat(2))
      expect(stl.warnings).to.deep.equal([])
    })

    it("calculates normals from the vertex winding order", () => {
      const stl = parseBinaryStl(toBinaryStl(square))
      expect(toArray(stl.faceNormalCoordinates))
        .to.deep.equal([0, 0, 1, 0, 0, 1])
    })

    it("uses a zero normal for degenerated faces", () => {
      const stl = parseBinaryStl(toBinaryStl([[[0, 0, 0], [1, 1, 1], [2, 2, 2]]]))
      expect(toArray(stl.faceNormalCoordinates)).to.deep.equal([0, 0, 0])
    })

    it("warns and parses available faces if the face count is wrong", () => {
      const buffer = toBinaryStl(square)
      new DataView(buffer).setUint32(80, 5, true)
      const stl = parseBinaryStl(buffer)
      expect(stl.triangleCoordinates).to.have.length(18)
      expect(stl.warnings).to.have.length(1)
    })

    it("fails for files without faces", () => {
      expect(() => parseBinaryStl(toBinaryStl([]))).to.throw(/No faces/)
    })
  })

  describe("ASCII STLs", () => {
    it("parses coordinates and the name", () => {
      const stl = parseAsciiStl(toAsciiStl(square))
      expect(stl.name).to.equal("ascii model")
      expect(Array.from(stl.triangleCoordinates)).to.deep.equal(square.flat(2))
      expect(toArray(stl.faceNormalCoordinates))
        .to.deep.equal([0, 0, 1, 0, 0, 1])
      expect(stl.warnings).to.deep.equal([])
    })

    it("parses scientific notation and CRLF line endings", () => {
      const text = "solid x\r\nfacet normal 0 0 1\r\nouter loop\r\n" +
        "vertex 1e1 -2.5E-1 0.\r\nvertex 1 0 0\r\nvertex 0 1 0\r\n" +
        "endloop\r\nendfacet\r\nendsolid x\r\n"
      const stl = parseAsciiStl(new TextEncoder().encode(text).buffer)
      expect(Array.from(stl.triangleCoordinates.slice(0, 3)))
        .to.deep.equal([10, -0.25, 0])
    })

    it("grows its buffer for many faces", () => {
      const triangles = Array.from({ length: 1000 }, (_, i): Triangle =>
        [[i, 0, 0], [i + 1, 0, 0], [i, 1, 0]])
      const stl = parseAsciiStl(toAsciiStl(triangles))
      expect(stl.triangleCoordinates).to.have.length(9000)
      expect(stl.triangleCoordinates[8991]).to.equal(999)
    })

    it("skips faces without exactly 3 vertices", () => {
      const text = "solid x\nfacet normal 0 0 1\nouter loop\n" +
        "vertex 0 0 0\nvertex 1 0 0\nendloop\nendfacet\n" +
        "facet normal 0 0 1\nouter loop\n" +
        "vertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\n" +
        "endsolid x\n"
      const stl = parseAsciiStl(new TextEncoder().encode(text).buffer)
      expect(stl.triangleCoordinates).to.have.length(9)
      expect(stl.warnings).to.have.length(1)
    })

    it("warns about a missing endsolid", () => {
      const text = new TextDecoder().decode(toAsciiStl(square))
        .replace(/endsolid.*\n$/, "")
      const stl = parseAsciiStl(new TextEncoder().encode(text).buffer)
      expect(stl.warnings).to.deep.equal(
        ["ASCII STL is not closed with the endsolid keyword"])
    })

    it("fails for invalid coordinates", () => {
      const text = new TextDecoder().decode(toAsciiStl(square))
        .replace("vertex 1 1 0", "vertex 1 abc 0")
      expect(() => parseAsciiStl(new TextEncoder().encode(text).buffer))
        .to.throw(/Invalid vertex coordinate "abc"/)
    })

    it("fails for files without faces", () => {
      const buffer = new TextEncoder().encode("solid x\nendsolid x\n").buffer
      expect(() => parseAsciiStl(buffer)).to.throw(/does not contain any faces/)
    })
  })

  it("fails for empty files", () => {
    expect(() => parseStl(new ArrayBuffer(0))).to.throw(/empty/)
  })

  it("parses ASCII and binary STLs into the same face-vertex mesh", () => {
    const fromAscii = runStlJob(toAsciiStl(square), "square.stl")
    const fromBinary = runStlJob(toBinaryStl(square), "square.stl")

    for (const result of [fromAscii, fromBinary]) {
      expect(Array.from(result.vertexCoordinates))
        .to.deep.equal([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0])
      expect(Array.from(result.faceVertexIndices))
        .to.deep.equal([0, 1, 2, 1, 3, 2])
      expect(toArray(result.vertexNormalCoordinates))
        .to.deep.equal([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])
    }
    expect(fromAscii.identifier).to.equal(fromBinary.identifier)
  })

  it("encodes the mesh like the meshlib model built from the result", async () => {
    const result = runStlJob(toBinaryStl(square), "square.stl")
    const model = meshlib.Model.fromObject({
      name: "square.stl",
      mesh: {
        faces: [],
        faceVertex: {
          vertexCoordinates: Array.from(result.vertexCoordinates),
          faceVertexIndices: Array.from(result.faceVertexIndices),
          vertexNormalCoordinates: Array.from(result.vertexNormalCoordinates),
          faceNormalCoordinates: Array.from(result.faceNormalCoordinates),
        },
      },
    })
    const base64Model = await model.getBase64()
    expect(result.base64Model).to.equal(base64Model)
    expect(result.identifier).to.equal(md5(base64Model))
  })

  it("reports progress for each stage", () => {
    const stages: string[] = []
    runStlJob(toBinaryStl(square), "square.stl", stage => {
      if (stages.at(-1) !== stage) stages.push(stage)
    })
    expect(stages).to.deep.equal(["parsing", "merging", "encoding"])
  })
})
