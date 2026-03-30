import $ from "jquery"
import md5 from "blueimp-md5"
import meshlib from "meshlib"
import log from "loglevel"

interface MeshModel {
  getBase64(): Promise<string>;
}

// #
//  ModelCache
//  Caches models and allows all Plugins to retrieve
//  cached models from the server
// #

// The cache of optimized model promises
const modelCache: Partial<Record<string, Promise<unknown>>> = {}

const exists = (identifier: string): Promise<void> => Promise.resolve(
  $.ajax("/model/" + identifier,
    {type: "HEAD"}),
)
  .catch((jqXHR: unknown) => {
    const statusText = (jqXHR as { statusText?: string }).statusText ?? 'Request failed'
    throw new Error(statusText)
  })
export { exists }

// sends the model to the server if the server hasn't got a model
// with the same identifier
const submitDataToServer = function (identifier: string, data: string): Promise<void> {
  const send = function (): Promise<void> {
    const prom = Promise.resolve(
      $.ajax("/model/" + identifier, {
        data,
        type: "PUT",
        contentType: "application/octet-stream",
      }),
    )
      .catch((jqXHR: unknown) => {
        const statusText = (jqXHR && typeof jqXHR === 'object' && 'statusText' in jqXHR)
          ? String(jqXHR.statusText)
          : 'Unknown error'
        throw new Error(statusText)
      })
    prom.then(
      () => { log.debug("Sent model to the server") },
      () => { log.error("Unable to send model to the server") })
    return prom
  }
  return exists(identifier)
    .catch(send)
}

export const store = (model: MeshModel): Promise<string> => model
  .getBase64()
  .then((base64Model: string) => {
    const identifier = md5(base64Model)
    modelCache[identifier] = Promise.resolve(model)
    return submitDataToServer(identifier, base64Model)
      .then(() => identifier)
  })

// requests a mesh with the given identifier from the server
const requestDataFromServer = (identifier: string): Promise<string> => Promise.resolve($.get("/model/" + identifier))
  .catch((jqXHR: unknown) => {
    const statusText = (jqXHR as { statusText?: string }).statusText ?? 'Request failed'
    throw new Error(statusText)
  })

const buildModelPromise = (identifier: string): Promise<unknown> => requestDataFromServer(identifier)
  .then((base64Model: string) => meshlib.Model
    .fromBase64(base64Model)
    .buildFacesFromFaceVertexMesh())


// Request an optimized mesh with the given identifier
// The mesh will be provided by the cache if present or loaded from the server
// if available.
export const request = (identifier: string): Promise<unknown> => modelCache[identifier] != null ? modelCache[identifier] : modelCache[identifier] = buildModelPromise(identifier)
