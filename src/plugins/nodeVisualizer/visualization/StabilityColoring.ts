import { MeshLambertMaterial } from "three"
import Coloring from "./Coloring.js"

interface StabilityBrick {
  getStability: () => number
  getNeighborsXY: () => Set<StabilityBrick>
  connectedBricks: () => Set<StabilityBrick>
  getVisualBrick: () => { textureMaterial?: MeshLambertMaterial } | null
  getSize: () => { x: number; y: number }
  visualizationMaterials?: {
    color: MeshLambertMaterial
    colorStuds: MeshLambertMaterial
    gray: MeshLambertMaterial
    grayStuds: MeshLambertMaterial
    textureStuds?: MeshLambertMaterial
  }
}

interface StabilityMaterialSet {
  color: MeshLambertMaterial
  colorStuds: MeshLambertMaterial
  gray: MeshLambertMaterial
  grayStuds: MeshLambertMaterial
  textureStuds: MeshLambertMaterial
}

export default class StabilityColoring extends Coloring {
  _stabilityMaterials: MeshLambertMaterial[]

  constructor () {
    super(null)
    this._createStabilityMaterials = this._createStabilityMaterials.bind(this)
    this.getMaterialsForBrick = this.getMaterialsForBrick.bind(this)
    this._stabilityMaterials = []
    this._createStabilityMaterials()
  }

  _createStabilityMaterials (): number[] {
    this._stabilityMaterials = []
    // 2 by 10 is the largest LEGO brick we support so an array of 21 suffices
    // to reflect all stability shades
    return (() => {
      const result: number[] = []
      for (let i = 0; i <= 20; i++) {
        const red = Math.round(255 - ((i * 255) / 20)) * 0x10000
        const green = Math.round((i * 255) / 20) * 0x100
        const blue = 0
        const color = red + green + blue
        // opacity is between 0.75 (perfectly stable) and 1 (not stable at all)
        const opacity = i === 0 ? 1 : 1 - (i * 0.02)
        result.push(this._stabilityMaterials.push(this._createMaterial(color, opacity)))
      }
      return result
    })()
  }

  getMaterialsForBrick (brick: StabilityBrick): StabilityMaterialSet {
    const index = Math.round(brick.getStability() * 19)
    const material = this._stabilityMaterials[index]
    return {
      color: material,
      colorStuds: material,
      gray: material,
      grayStuds: material,
      textureStuds: this.getTextureMaterialForBrick(brick),
    }
  }
}
