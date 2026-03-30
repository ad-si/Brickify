import THREE, { MeshLambertMaterial, MeshBasicMaterial, Texture, LineBasicMaterial } from "three"

import LineMatGenerator from "./LineMatGenerator.js"

interface ColorConfig {
  modelColor: number
  modelOpacity: number
  objectColorMult: number
  objectShadowColorMult: number
  brickShadowOpacity: number
  modelShadowOpacity: number
}

interface GlobalConfigType {
  colors: ColorConfig
}

interface BrickMaterialSet {
  color: MeshLambertMaterial
  colorStuds: MeshLambertMaterial
  gray: MeshLambertMaterial
  grayStuds: MeshLambertMaterial
  textureStuds?: MeshLambertMaterial
}

interface HighlightMaterialSet {
  color: MeshLambertMaterial
  colorStuds: MeshLambertMaterial
  textureStuds: MeshLambertMaterial
}

interface BrickLike {
  visualizationMaterials?: BrickMaterialSet | undefined
  getNeighborsXY: () => Set<BrickLike>
  connectedBricks: () => Set<BrickLike>
  getVisualBrick: () => { textureMaterial?: MeshLambertMaterial } | null
  getSize: () => { x: number; y: number }
}

interface Dimensions {
  x: number
  y: number
}


// Provides a simple implementation on how to color voxels and bricks
export default class Coloring {
  globalConfig: GlobalConfigType
  textureMaterialCache: Partial<Record<string, MeshLambertMaterial>>
  brickMaterial: MeshLambertMaterial
  studTexture: Texture
  selectedMaterial: MeshLambertMaterial
  selectedStudMaterial: MeshLambertMaterial
  hiddenMaterial: MeshLambertMaterial
  legoBoxHighlightMaterial: MeshLambertMaterial
  printBoxHighlightMaterial: MeshLambertMaterial
  csgMaterial: MeshLambertMaterial
  legoShadowMat: MeshBasicMaterial
  objectPrintMaterial: MeshLambertMaterial
  objectShadowMat: MeshBasicMaterial
  objectLineMat: LineBasicMaterial
  legoHighlightMaterials?: HighlightMaterialSet
  printHighlightMaterials?: HighlightMaterialSet
  _brickMaterials: MeshLambertMaterial[]
  _studMaterials: MeshLambertMaterial[]
  _grayBrickMaterials: MeshLambertMaterial[]
  _grayStudMaterials: MeshLambertMaterial[]

  constructor (globalConfig: GlobalConfigType | null) {
    this.setPipelineMode = this.setPipelineMode.bind(this)
    this.getHighlightMaterial = this.getHighlightMaterial.bind(this)
    this._getLegoHighlightMaterials = this._getLegoHighlightMaterials.bind(this)
    this._getPrintHighlightMaterials = this._getPrintHighlightMaterials.bind(this)
    this.getSelectedMaterials = this.getSelectedMaterials.bind(this)
    this.getMaterialsForBrick = this.getMaterialsForBrick.bind(this)
    this.getStabilityMaterialForBrick = this.getStabilityMaterialForBrick.bind(this)
    this._getRandomBrickMaterials = this._getRandomBrickMaterials.bind(this)
    this._createBrickMaterials = this._createBrickMaterials.bind(this)
    this.getTextureMaterialForBrick = this.getTextureMaterialForBrick.bind(this)
    // Provide minimal defaults if no config provided
    const defaultConfig: GlobalConfigType = { colors: {
      modelColor: 0xeeeeee,
      modelOpacity: 0.8,
      objectColorMult: 1,
      objectShadowColorMult: 0.1,
      brickShadowOpacity: 0.5,
      modelShadowOpacity: 0.5,
    } }
    const mergedColors = Object.assign({}, defaultConfig.colors, globalConfig?.colors)
    this.globalConfig = Object.assign({}, defaultConfig, globalConfig, { colors: mergedColors })
    this.textureMaterialCache = {}

    this.brickMaterial = this._createMaterial(0xfff000) // orange

    this.studTexture = THREE.ImageUtils.loadTexture("/img/stud.png")
    this.studTexture.wrapS = THREE.RepeatWrapping
    this.studTexture.wrapT = THREE.RepeatWrapping

    this.selectedMaterial = this._createMaterial(0xff0000)
    this.selectedStudMaterial = this._lightenMaterial(this.selectedMaterial)

    this.hiddenMaterial = this._createMaterial(0xffaaaa, 0.0)

    this.legoBoxHighlightMaterial = this._createMaterial(0xff7755, 0.5)
    this._setPolygonOffset(this.legoBoxHighlightMaterial, -1, -1)

    this.printBoxHighlightMaterial = this._createMaterial(0xeeeeee, 0.4)
    this._setPolygonOffset(this.printBoxHighlightMaterial, -1, -1)

    this.csgMaterial = this._createMaterial(0xb5ffb8) // greenish gray

    this.legoShadowMat = new THREE.MeshBasicMaterial({
      color: 0x707070,
      transparent: true,
      opacity: 0.3,
    })
    this._setPolygonOffset(this.legoShadowMat, 2, 2)

    // printed object material
    this.objectPrintMaterial = this._createMaterial(
      this.globalConfig.colors.modelColor,
      this.globalConfig.colors.modelOpacity,
    )

    // remove z-Fighting on baseplate
    this._setPolygonOffset(this.objectPrintMaterial, 3, 3)

    this.objectShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthFunc: (THREE as unknown as { GreaterDepth: number }).GreaterDepth,
    })
    this._setPolygonOffset(this.objectShadowMat, 3, 3)

    const lineMaterialGenerator = new LineMatGenerator()
    this.objectLineMat = lineMaterialGenerator.generate(0x000000) as unknown as LineBasicMaterial
    this.objectLineMat.linewidth = 2
    this.objectLineMat.transparent = true
    this.objectLineMat.opacity = 0.1
    this.objectLineMat.depthFunc = (THREE as any).GreaterDepth
    this.objectLineMat.depthWrite = false

    this._brickMaterials = []
    this._studMaterials = []
    this._grayBrickMaterials = []
    this._grayStudMaterials = []

    this._createBrickMaterials()
  }

  _setPolygonOffset (material: MeshLambertMaterial | MeshBasicMaterial, polygonOffsetFactor: number, polygonOffsetUnits: number): number {
    material.polygonOffset = true
    material.polygonOffsetFactor = polygonOffsetFactor
    return material.polygonOffsetUnits = polygonOffsetUnits
  }

  setPipelineMode (enabled: boolean): boolean {
    this.objectPrintMaterial.transparent = !enabled

    this.objectShadowMat.visible = !enabled
    this.objectLineMat.transparent = !enabled
    this.objectLineMat.depthWrite = enabled
    if (enabled) {
      this.objectLineMat.depthFunc = (THREE as any).LessEqualDepth
    }
    else {
      this.objectLineMat.depthFunc = (THREE as any).GreaterDepth
    }

    this.legoBoxHighlightMaterial.transparent = !enabled
    this.printBoxHighlightMaterial.transparent = !enabled
    this.objectPrintMaterial.transparent = !enabled
    return this.legoShadowMat.transparent = !enabled
  }

  /*
   * Returns the highlight material collection for the supplied type of voxel
   * @param {String} type either 'lego' or '3d' to get the respective material
   */
  getHighlightMaterial (type: string): { voxel: HighlightMaterialSet; box: MeshLambertMaterial } | null {
    if (type === "lego") {
      return {
        voxel: this._getLegoHighlightMaterials(),
        box: this.legoBoxHighlightMaterial,
      }
    }
    else if (type === "3d") {
      return {
        voxel: this._getPrintHighlightMaterials(),
        box: this.printBoxHighlightMaterial,
      }
    }
    return null
  }

  _getLegoHighlightMaterials (): HighlightMaterialSet {
    if (this.legoHighlightMaterials != null) {
      return this.legoHighlightMaterials
    }

    const legoHighlightMaterial = this._createMaterial(0xff7755)
    const legoHighlightStudMaterial = this._lightenMaterial(legoHighlightMaterial)
    const legoHighlightTextureMaterial = this.getTextureMaterialForBrick()
    return this.legoHighlightMaterials = {
      color: legoHighlightMaterial,
      colorStuds: legoHighlightStudMaterial,
      textureStuds: legoHighlightTextureMaterial,
    }
  }

  _getPrintHighlightMaterials (): HighlightMaterialSet {
    if (this.printHighlightMaterials != null) {
      return this.printHighlightMaterials
    }

    const printHighlightMaterial = this._createMaterial(0xeeeeee)
    this._setPolygonOffset(printHighlightMaterial, -1, -1)
    const printHighlightStudMaterial = this._lightenMaterial(printHighlightMaterial)
    this._setPolygonOffset(printHighlightStudMaterial, -1, -1)

    const printHighlightTextureMaterial = this.getTextureMaterialForBrick()
    this._setPolygonOffset(printHighlightTextureMaterial, -1, -1)
    return this.printHighlightMaterials = {
      color: printHighlightMaterial,
      colorStuds: printHighlightStudMaterial,
      textureStuds: printHighlightTextureMaterial,
    }
  }

  getSelectedMaterials (): HighlightMaterialSet {
    return {
      color: this.selectedMaterial,
      colorStuds: this.selectedStudMaterial,
      textureStuds: this.getTextureMaterialForBrick(),
    }
  }

  getMaterialsForBrick (brick: BrickLike): BrickMaterialSet {
    // return stored material or assign a random one
    let materials: BrickMaterialSet | undefined
    if (brick.visualizationMaterials != null) {
      return brick.visualizationMaterials
    }

    // collect materials of neighbors
    const neighbors = brick.getNeighborsXY()
    const connections = brick.connectedBricks()

    const neighborColors = new Set<MeshLambertMaterial>()
    neighbors.forEach((neighbor: BrickLike) => {
      if (neighbor.visualizationMaterials != null) {
        neighborColors.add(neighbor.visualizationMaterials.color)
      }
    })
    connections.forEach((connection: BrickLike) => {
      if (connection.visualizationMaterials != null) {
        neighborColors.add(connection.visualizationMaterials.color)
      }
    })

    // try max. (brickMaterials.length) times to
    // find a material that has not been used
    // by neighbors to visually distinguish bricks
    for (let i = 0, end = this._brickMaterials.length, asc = end >= 0; asc ? i < end : i > end; asc ? i++ : i--) {
      materials = this._getRandomBrickMaterials()
      if (neighborColors.has(materials.color)) {
        continue
      }
      break
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    materials!.textureStuds = this.getTextureMaterialForBrick(brick)

    brick.visualizationMaterials = materials
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return brick.visualizationMaterials!
  }

  getStabilityMaterialForBrick (brick: BrickLike): BrickMaterialSet {
    return this.getMaterialsForBrick(brick)
  }

  _getRandomBrickMaterials (): BrickMaterialSet {
    const i = Math.floor(Math.random() * this._brickMaterials.length)
    return {
      color: this._brickMaterials[i],
      colorStuds: this._studMaterials[i],
      gray: this._grayBrickMaterials[i],
      grayStuds: this._grayStudMaterials[i],
    }
  }

  _createBrickMaterials (): number[] {
    let material: MeshLambertMaterial
    const colorList = [
      0x550000,
      0x8e0000,
      0xc60000,
      0xff0000,
      0xcc4444,
      0xdd4f4f,
      0xee5b5b,
      0xff6666,
    ]
    this._brickMaterials = []
    for (const color of Array.from(colorList)) {
      this._brickMaterials.push(this._createMaterial(color))
    }

    this._studMaterials = []
    for (material of Array.from(this._brickMaterials)) {
      this._studMaterials.push(this._lightenMaterial(material))
    }

    this._grayBrickMaterials = []
    for (material of Array.from(this._brickMaterials)) {
      this._grayBrickMaterials.push(this._convertToGrayscale(material))
    }

    this._grayStudMaterials = []
    return (() => {
      const result: number[] = []
      for (material of Array.from(this._grayBrickMaterials)) {
        result.push(this._grayStudMaterials.push(this._lightenMaterial(material)))
      }
      return result
    })()
  }

  _lightenMaterial (material: MeshLambertMaterial): MeshLambertMaterial {
    const newMaterial = material.clone()
    newMaterial.color.addScalar(0.05)
    return newMaterial
  }

  // Clones the material and converts its color to grayscale
  _convertToGrayscale (material: MeshLambertMaterial): MeshLambertMaterial {
    const newMaterial = material.clone()
    let gray = material.color.r * 0.3
    gray += material.color.g * 0.6
    gray += material.color.b * 0.1
    newMaterial.color.setRGB(gray, gray, gray)

    return newMaterial
  }

  _createMaterial (color: number, opacity: number = 1): MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      color,
      opacity,
      transparent: opacity < 1.0,
    })
  }

  getTextureMaterialForBrick (brick?: BrickLike): MeshLambertMaterial {
    if (brick && (brick.getVisualBrick() != null)) {
      const visualBrick = brick.getVisualBrick()
      if (visualBrick && visualBrick.textureMaterial) {
        return visualBrick.textureMaterial
      }
    }

    const size: Dimensions = brick ? brick.getSize() : {x: 1, y: 1}
    const dimensionsHash = this._getHash(size)
    if (this.textureMaterialCache[dimensionsHash] != null) {
      return this.textureMaterialCache[dimensionsHash]
    }

    const studsTexture = this.studTexture.clone()
    studsTexture.needsUpdate = true
    studsTexture.repeat.set(size.x, size.y)

    const textureMaterial = new THREE.MeshLambertMaterial({
      map: studsTexture,
      transparent: true,
      opacity: 0.2,
    })

    this.textureMaterialCache[dimensionsHash] = textureMaterial
    return textureMaterial
  }

  _getHash (dimensions: Dimensions): string {
    return `${String(dimensions.x)}-${String(dimensions.y)}`
  }
}
