import THREE, { Object3D, Mesh, Material, BufferGeometry, Geometry } from "three"
import * as threeHelper from "../../client/threeHelper.js"
import * as threeConverter from "../../client/threeConverter.js"
import type { GlobalConfig, Transform } from "../../types/index.js"
import type Coloring from "./visualization/Coloring.js"

interface ExtendedThreeNode extends Object3D {
  solid?: Mesh
  wireframe?: Object3D
}

interface ModelObject {
  mesh: {
    faceVertex: {
      vertexCoordinates: number[]
      faceVertexIndices: number[]
      faceNormalCoordinates?: number[]
      vertexNormalCoordinates?: number[]
    }
  }
}

interface Model {
  getObject: () => Promise<ModelObject>
}

interface NodeType {
  id: string
  transform: Transform
  getModel: () => Promise<Model>
}

export default class ModelVisualization {
  globalConfig: GlobalConfig
  node: NodeType
  coloring: Coloring
  threeNode: ExtendedThreeNode
  afterCreationPromise!: Promise<void>

  constructor (globalConfig: GlobalConfig, node: NodeType, threeNode: Object3D, coloring: Coloring) {
    this.setSolidMaterial = this.setSolidMaterial.bind(this)
    this.setNodeVisibility = this.setNodeVisibility.bind(this)
    this.setShadowVisibility = this.setShadowVisibility.bind(this)
    this.afterCreation = this.afterCreation.bind(this)
    this.getSolid = this.getSolid.bind(this)
    this._createVisualization = this._createVisualization.bind(this)
    this.globalConfig = globalConfig
    this.node = node
    this.coloring = coloring
    this.threeNode = new THREE.Object3D() as ExtendedThreeNode
    threeNode.add(this.threeNode)
  }

  createVisualization (): Promise<void> {
    return this._createVisualization(this.node)
  }

  setSolidMaterial (material: Material): Promise<void> {
    return this.afterCreationPromise.then(() => {
      if (this.threeNode.solid != null) {
        this.threeNode.solid.material = material
      }
    })
  }

  setNodeVisibility (visible: boolean): Promise<void> {
    return this.afterCreationPromise.then(() => {
      this.threeNode.visible = visible
    })
  }

  setShadowVisibility (visible: boolean): Promise<void> {
    return this.afterCreationPromise.then(() => {
      if (this.threeNode.wireframe != null) {
        this.threeNode.wireframe.visible = visible
      }
    })
  }

  afterCreation (): Promise<void> {
    return this.afterCreationPromise
  }

  getSolid (): Mesh | undefined {
    return this.threeNode.solid
  }

  _createVisualization (node: NodeType): Promise<void> {

    const _addSolid = (geometry: BufferGeometry | Geometry, parent: ExtendedThreeNode): Mesh => {
      const solid = new THREE.Mesh(geometry, this.coloring.objectPrintMaterial)
      parent.add(solid)
      parent.solid = solid
      return solid
    }

    const _addWireframe = (geometry: BufferGeometry | Geometry, parent: ExtendedThreeNode): Object3D => {
      const wireframe = new THREE.Object3D()

      // shadow
      const shadow = new THREE.Mesh(geometry, this.coloring.objectShadowMat)
      wireframe.add(shadow)

      // visible black lines
      const lineObject = new THREE.Mesh(geometry)
      // EdgesHelper is from older THREE.js versions
      const lines = new (THREE as unknown as { EdgesHelper: new (mesh: Mesh, color: number, angle: number) => Object3D }).EdgesHelper(lineObject, 0x000000, 30)
      ;(lines as Mesh).material = this.coloring.objectLineMat
      wireframe.add(lines)

      parent.add(wireframe)
      parent.wireframe = wireframe
      return wireframe
    }

    const _addModel = (model: Model): Promise<void> => {
      return model
        .getObject()
        .then((modelObject: ModelObject) => {
          const geometry = threeConverter.toStandardGeometry(modelObject)

          if (this.globalConfig.rendering.showModel) {
            _addSolid(geometry, this.threeNode)
          }
          if (this.globalConfig.rendering.showShadowAndWireframe) {
            _addWireframe(geometry, this.threeNode)
          }

          threeHelper.applyNodeTransforms(node, this.threeNode)
        })
    }

    this.afterCreationPromise = node.getModel()
      .then(_addModel)
    return this.afterCreationPromise
  }
}
