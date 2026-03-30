import md5 from "blueimp-md5"
import meshlib, { MeshlibModel } from "meshlib"
import log from "loglevel"

// Static ModelCache - loads models from local files instead of server API
// Used for static builds that run without a server

// The cache of optimized model promises
const modelCache: Partial<Record<string, Promise<MeshlibModel>>> = {}

// For static builds, we check if the model file exists via fetch
export const exists = (identifier: string): Promise<string> => fetch(`./model/${identifier}`, { method: 'HEAD' })
  .then(response => {
    if (!response.ok) throw new Error('Not found')
    return identifier
  })

// For static builds, storing is not supported - just cache locally
export const store = (model: MeshlibModel): Promise<string> => model
  .getBase64()
  .then((base64Model: string) => {
    const identifier = md5(base64Model)
    modelCache[identifier] = Promise.resolve(model)
    log.warn('Static build: model stored locally only, not on server')
    return identifier
  })

// Request model data from local file
const requestDataFromLocal = (identifier: string): Promise<string> => fetch(`./model/${identifier}`)
  .then(response => {
    if (!response.ok) throw new Error(`Model not found: ${identifier}`)
    return response.text()
  })

const buildModelPromise = (identifier: string): Promise<MeshlibModel> => requestDataFromLocal(identifier)
  .then(base64Model => meshlib.Model
    .fromBase64(base64Model)
    .buildFacesFromFaceVertexMesh())

// Request an optimized mesh with the given identifier
// The mesh will be provided by the cache if present or loaded from local file
export const request = (identifier: string): Promise<MeshlibModel> => modelCache[identifier] != null
  ? modelCache[identifier]
  : modelCache[identifier] = buildModelPromise(identifier)
