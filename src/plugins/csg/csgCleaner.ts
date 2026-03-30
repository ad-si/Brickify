import log from "loglevel"
import THREE from "three"

interface CleanOptions {
  split?: boolean
  filterSmallGeometries?: boolean
  minimalPrintVolume?: number
}

interface EquivalenceClass {
  vertexIndices: Set<number>
  faceIndices: Set<number>
}

export default function clean (geometry: THREE.Geometry | null, options: CleanOptions = {}): THREE.Geometry[] {
  let d: Date; let geometries: THREE.Geometry[]
  if (!geometry) {
    return []
  }

  if (options.split) {
    d = new Date()
    geometries = splitGeometry(geometry)
    log.debug(`Model splitting took ${String(+new Date() - +d)}ms`)
  }
  else {
    log.debug("(Skipping step model splitting)")
    geometries = [geometry]
  }

  if (options.filterSmallGeometries) {
    d = new Date()
    geometries = filterSmallGeometries(geometries, options.minimalPrintVolume || 0)
    log.debug(`Filtering small geometries took ${String(+new Date() - +d)}ms`)
  }
  else {
    log.debug("(Skipping step filtering small geometries)")
  }

  return geometries
}

function filterSmallGeometries (geometries: THREE.Geometry[], minimalPrintVolume: number): THREE.Geometry[] {
  const filteredGeometries: THREE.Geometry[] = []
  for (const geometry of Array.from(geometries)) {
    const volume = getVolume(geometry)
    if (volume > minimalPrintVolume) {
      filteredGeometries.push(geometry)
    }
  }
  return filteredGeometries
}

/*
 * calculates the volume of threeGeometry
 * see http://stackoverflow.com/questions/1410525
 * @param {THREE.Geometry} threeGeometry an instance of three geometry
 * @return {Number} volume in mm^3
 */
function getVolume (threeGeometry: THREE.Geometry): number {
  let volume = 0
  forAllFaces(threeGeometry, (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => volume += ((a.x * b.y * c.z) + (a.y * b.z * c.x) + (a.z * b.x * c.y)) -
      (a.x * b.z * c.y) - (a.y * b.x * c.z) - (a.z * b.y * c.x))
  return volume / 6
}

function forAllFaces (threeGeometry: THREE.Geometry, visitor: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => void) {
  const {
    faces,
  } = threeGeometry
  const {
    vertices,
  } = threeGeometry

  for (const face of Array.from(faces)) {
    const a = vertices[face.a]
    const b = vertices[face.b]
    const c = vertices[face.c]
    visitor(a, b, c)
  }
}

function splitGeometry (geometry: THREE.Geometry): THREE.Geometry[] {
  geometry.mergeVertices()
  const connectedComponents = getConnectedComponents(geometry)
  if (connectedComponents.length === 1) {
    return [geometry]
  }

  const geometries: THREE.Geometry[] = []
  for (const component of Array.from(connectedComponents)) {
    geometries.push(buildGeometry(component, geometry))
  }

  return geometries
}

function buildGeometry (hashmap: EquivalenceClass, baseGeometry: THREE.Geometry): THREE.Geometry {
  const geometry = new THREE.Geometry()
  hashmap.faceIndices.forEach((faceIndex: number) => {
    const face = baseGeometry.faces[faceIndex]
    const {
      length,
    } = geometry.vertices
    geometry.vertices.push(
      baseGeometry.vertices[face.a],
      baseGeometry.vertices[face.b],
      baseGeometry.vertices[face.c],
    )
    return geometry.faces.push(
      new THREE.Face3(length, length + 1, length + 2, face.normal),
    )
  })

  geometry.mergeVertices()
  geometry.verticesNeedUpdate = true
  geometry.elementsNeedUpdate = true

  return geometry
}

function getConnectedComponents (geometry: THREE.Geometry): EquivalenceClass[] {
  let equivalenceClasses: EquivalenceClass[] = []

  if (geometry.faces.length === 0) {
    return equivalenceClasses
  }

  for (let i = 0, end = geometry.faces.length - 1, asc = end >= 0; asc ? i <= end : i >= end; asc ? i++ : i--) {
    let equivalenceClass: EquivalenceClass
    const face = geometry.faces[i]
    const {
      a,
    } = face
    const {
      b,
    } = face
    const {
      c,
    } = face
    const connectedClasses: EquivalenceClass[] = []

    for (equivalenceClass of Array.from(equivalenceClasses)) {
      if (equivalenceClass.vertexIndices.has(a) ||
      equivalenceClass.vertexIndices.has(b) ||
      equivalenceClass.vertexIndices.has(c)) {
        equivalenceClass.vertexIndices.add(a)
        equivalenceClass.vertexIndices.add(b)
        equivalenceClass.vertexIndices.add(c)
        equivalenceClass.faceIndices.add(i)
        connectedClasses.push(equivalenceClass)
      }
    }

    if (connectedClasses.length === 0) {
      equivalenceClass = {
        vertexIndices: new Set(),
        faceIndices: new Set(),
      }
      equivalenceClass.vertexIndices.add(a)
      equivalenceClass.vertexIndices.add(b)
      equivalenceClass.vertexIndices.add(c)
      equivalenceClass.faceIndices.add(i)
      equivalenceClasses.push(equivalenceClass)

    }
    else if (connectedClasses.length > 1) {
      compactClasses(connectedClasses)
      equivalenceClasses = equivalenceClasses.filter((ec: EquivalenceClass) => ec.faceIndices.size > 0)
    }
  }

  return equivalenceClasses
}

function compactClasses (equivalenceClasses: EquivalenceClass[]) {
  const {
    vertexIndices,
  } = equivalenceClasses[0]
  const {
    faceIndices,
  } = equivalenceClasses[0]

  for (let i = 1, end = equivalenceClasses.length - 1; i <= end; i++) {
    const equivalenceClass = equivalenceClasses[i]
    equivalenceClass.vertexIndices.forEach((vertex: number) => vertexIndices.add(vertex))
    equivalenceClass.faceIndices.forEach((faceIndex: number) => faceIndices.add(faceIndex))

    // clear old class
    equivalenceClass.vertexIndices.clear()
    equivalenceClass.faceIndices.clear()
  }
}
