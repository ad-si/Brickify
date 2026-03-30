import fs from "fs"
import fsp from "fs-promise"
import yaml from "js-yaml"
import log from "winston"


const samplesDirectory = "modelSamples/"

interface Sample {
  name: string
  printTime: number
  [key: string]: unknown
}

type SamplesMap = Partial<Record<string, Sample>>

let samples: SamplesMap | null = null


export function loadSamples (): SamplesMap {
  if (samples !== null) {
    return samples
  }

  samples = {}

  fs
    .readdirSync(samplesDirectory)
    .filter((file: string) => file.endsWith(".yaml"))
    .map((file: string) => yaml.load(fs.readFileSync(samplesDirectory + file, "utf8")) as Sample)
    .forEach(sample => (samples as SamplesMap)[sample.name] = sample)

  log.info("Sample models loaded")

  return samples
}


export function exists (name: string): Promise<string> {
  const loadedSamples = loadSamples()
  if (loadedSamples[name] != null) {
    return Promise.resolve(name)
  }
  else {
    return Promise.reject(new Error(name))
  }
}


export function get (name: string): Promise<Buffer> {
  const loadedSamples = loadSamples()
  if (loadedSamples[name] != null) {
    return fsp.readFile(samplesDirectory + name) as unknown as Promise<Buffer>
  }
  else {
    return Promise.reject(new Error(name))
  }
}


export function getSamples (): Sample[] {
  const loadedSamples = loadSamples()
  return Object.keys(loadedSamples)
    .map(key => loadedSamples[key])
    .filter((s): s is Sample => s != null)
    .sort((a, b) => a.printTime - b.printTime)
}
