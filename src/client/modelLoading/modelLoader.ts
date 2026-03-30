/*
 * @module modelLoader
 */

import log from "loglevel"

import type { MeshlibModel } from "meshlib"

import * as modelCache from "./modelCache.js"
import Node from "../../common/project/node.js"
import type Bundle from "../bundle.js"

/*
 * @class ModelLoader
 */
export default class ModelLoader {
  bundle: Bundle

  constructor (bundle: Bundle) {
    this.loadByIdentifier = this.loadByIdentifier.bind(this)
    this._load = this._load.bind(this)
    this.bundle = bundle
  }

  loadByIdentifier (identifier: string) {
    return modelCache
      .request(identifier)
      .then((model) => this._load(model as MeshlibModel, identifier))
      .catch((error: unknown) => {
        log.error(`Could not load model ${identifier}`)
        log.error(error instanceof Error ? error.stack : String(error))
      })
  }

  _load (model: MeshlibModel, identifier: string) {
    return model
      .done()
      .then(() => {
        const name = model.model.name || model.model.fileName || identifier
        return this._addModelToScene(name, identifier, model)
      })
  }

  // adds a new model to the state
  _addModelToScene (name: string, identifier: string, model: MeshlibModel) {
    return model
      .getAutoAlignMatrix()
      .then((matrix: number[][] | undefined) => {
        const node = new Node({
          name,
          modelIdentifier: identifier,
          transform: {
            position: {
              x: matrix?.[0]?.[3] ?? 0,
              y: matrix?.[1]?.[3] ?? 0,
              z: matrix?.[2]?.[3] ?? 0,
            },
          }})

        return this.bundle.sceneManager.add(node)
      })
  }
}
