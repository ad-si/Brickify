import SyncObject, { SyncObjectParams } from "../sync/syncObject.js"
import type { Transform, Vector3D } from "../../types/index.js"

export interface ModelProvider {
  request(identifier: string): Promise<unknown>;
}

export interface NodeParams extends SyncObjectParams {
  name?: string | null;
  modelIdentifier?: string | null;
  transform?: Partial<Transform>;
}

/*
 * A node is an element in a scene that represents a model.
 *
 * @class Node
 */
export default class Node extends SyncObject {
  static modelProvider: ModelProvider | null = null

  declare name: string | null
  declare modelIdentifier: string | null
  declare transform: Transform
  declare transientProperties: string[]

  constructor (param?: NodeParams) {
    super(param)
    this._isTransient = this._isTransient.bind(this)
    this.getPluginData = this.getPluginData.bind(this)
    this.storePluginData = this.storePluginData.bind(this)
    this.setModelIdentifier = this.setModelIdentifier.bind(this)
    this.getModelIdentifier = this.getModelIdentifier.bind(this)
    this.getModel = this.getModel.bind(this)
    this.setName = this.setName.bind(this)
    this.getName = this.getName.bind(this)
    this.setPosition = this.setPosition.bind(this)
    this.getPosition = this.getPosition.bind(this)
    this.setRotation = this.setRotation.bind(this)
    this.getRotation = this.getRotation.bind(this)
    this.setScale = this.setScale.bind(this)
    this.getScale = this.getScale.bind(this)
    this.setTransform = this.setTransform.bind(this)
    this.getTransform = this.getTransform.bind(this)
    this._setTransform = this._setTransform.bind(this)
    if (param == null) {
      param = {}
    }
    const {name, modelIdentifier, transform} = param
    this.transientProperties = []
    this.name = name ?? null
    this.modelIdentifier = modelIdentifier ?? null
    this.transform = {
      position: {x: 0, y: 0, z: 0},
      rotation: {x: 0, y: 0, z: 0},
      scale: {x: 1, y: 1, z: 1},
    }
    this._setTransform(transform)
  }

  _isTransient (key: string): boolean {
    return this.transientProperties.includes(key) || super._isTransient(key)
  }

  _loadSubObjects () {
    // Ensure transform is properly initialized after deserialization
    // The transform object may be missing or incomplete when restored from storage
    this._setTransform(this.transform)
  }

  getPluginData (key: string): Promise<unknown> {
    return this.done(() => this[key])
  }

  storePluginData (key: string, data: unknown, transient: boolean = true): this {
    return this.next(() => {
      this[key] = data
      if (transient && !this.transientProperties.includes(key)) {
        this.transientProperties.push(key)
      }
      else if (!transient && this.transientProperties.includes(key)) {
        const index = this.transientProperties.indexOf(key)
        this.transientProperties.splice(index, 1)
      }
    })
  }

  setModelIdentifier (identifier: string | null): this {
    return this.next(() => {
      this.modelIdentifier = identifier
    })
  }

  getModelIdentifier (): Promise<string | null | undefined> {
    return this.done(() => this.modelIdentifier)
  }

  getModel (): Promise<unknown> {
    return this.done(() => {
      if (!Node.modelProvider || !this.modelIdentifier) {
        return Promise.resolve(null)
      }
      return Node.modelProvider.request(this.modelIdentifier)
    })
  }

  setName (name: string | null): this {
    return this.next(() => {
      this.name = name
    })
  }

  getName (): Promise<string | undefined> {
    const _getName = () => {
      if (this.name != null) {
        return this.name
      }
      else {
        return `Node ${this.id}`
      }
    }
    return this.done(_getName)
  }

  setPosition (position: Vector3D): this {
    return this.setTransform({position})
  }

  getPosition (): Promise<Vector3D | undefined> {
    return this.done(() => this.transform.position)
  }

  setRotation (rotation: Vector3D): this {
    return this.setTransform({rotation})
  }

  getRotation (): Promise<Vector3D | undefined> {
    return this.done(() => this.transform.rotation)
  }

  setScale (scale: Vector3D): this {
    return this.setTransform({scale})
  }

  getScale (): Promise<Vector3D | undefined> {
    return this.done(() => this.transform.scale)
  }

  setTransform (param?: Partial<Transform>): this {
    if (param == null) {
      param = {}
    }
    return this.next(() => { this._setTransform(param) })
  }

  getTransform (): Promise<Transform | undefined> {
    return this.done(() => this.transform)
  }

  _setTransform (param?: Partial<Transform>): void {
    if (param == null) {
      param = {}
    }
    const {position, rotation, scale} = param
    this.transform.position = position ?? this.transform.position
    this.transform.rotation = rotation ?? this.transform.rotation
    this.transform.scale = scale ?? this.transform.scale
  }
}
