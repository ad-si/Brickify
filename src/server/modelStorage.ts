import fs from "fs"
import fsp from "fs-promise"
import mkdirp from "mkdirp"
import md5 from "blueimp-md5"
import log from "./logger.js"

const cacheDirectory = "modelCache/"

// create cache directory on require (read: on server startup)
mkdirp(cacheDirectory).catch((error: unknown) => {
  log.warn("Unable to create cache directory: " + String(error))
})

// API

export function exists (hash: string): Promise<string> {
  if (!checkHash(hash)) {
    return Promise.reject(new Error("invalid hash"))
  }

  return new Promise((resolve, reject) => {
    fs.access(cacheDirectory + hash, fs.constants.F_OK, (err) => {
      if (!err) {
        resolve(hash)
      }
      else {
        reject(new Error(hash))
      }
    })
  })
}

export function get (hash: string): Promise<Buffer> {
  if (!checkHash(hash)) {
    return Promise.reject(new Error("invalid hash"))
  }

  return fsp.readFile(cacheDirectory + hash) as unknown as Promise<Buffer>
}

export function store (hash: string, model: string): Promise<string> {
  if (!checkHash(hash)) {
    return Promise.reject(new Error("invalid hash"))
  }

  if (hash !== md5(model)) {
    return Promise.reject(new Error("wrong hash"))
  }

  return fsp.writeFile(cacheDirectory + hash, model)
    .then(() => hash)
}

// checks if the hash has the correct format
function checkHash (hash: string): boolean {
  const p = /^[0-9a-z]{32}$/
  return p.test(hash)
}
