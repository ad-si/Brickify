import fsp from "fs/promises"
import path from "path"
import yaml from "js-yaml"

import log from "./logger.js"
import PluginHooks from "../common/pluginHooks.js"
import packageJson from "../../package.json" with { type: "json"}
import type { Plugin } from "../types/plugin.js"

interface NodeError extends Error {
  code?: string;
}

// Load the hook list and initialize the pluginHook management
export const pluginHooks = new PluginHooks()

const __dirname = import.meta.dirname
const hooks = yaml.load(
  await fsp.readFile(path.join(__dirname, "pluginHooks.yaml"), "utf8")
) as string[]
pluginHooks.initHooks(hooks)

function initPluginInstance (pluginInstance: Plugin): void {
  if (typeof pluginInstance.init === "function") {
    pluginInstance.init()
  }
  pluginHooks.register(pluginInstance)
}

async function loadPlugin (directory: string): Promise<void> {
  // Skip client-only plugins (browser entry but no main/server entry)
  try {
    const pluginPkg = JSON.parse(
      await fsp.readFile(path.join(directory, "package.json"), "utf8"),
    ) as Record<string, unknown>
    if (pluginPkg.browser && !pluginPkg.main) {
      return
    }
  }
  catch {
    // No package.json — try loading anyway
  }

  log.info(`Loading plugin "${directory}" …`)

  let instance: Record<string, unknown>
  try {
    instance = await import(`${directory}/${path.basename(directory)}.js`) as Record<string, unknown>
  }
  catch (error) {
    const code = (error as NodeError).code
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      return
    }
    log.warn(`Failed to load plugin "${path.basename(directory)}": ${String(error)}`)
    return
  }

  // Merge the plugin module with package.json to ensure name/version are present
  const pluginBase = (instance.default ?? instance) as Record<string, unknown>
  const fullInstance = Object.assign(
    {},
    pluginBase,
    { name: packageJson.name, version: packageJson.version },
  ) as Plugin

  initPluginInstance(fullInstance)

  log.info(`Plugin ${fullInstance.name} loaded`)
}

// TODO: Maybe load plugins in parallel
export async function loadPlugins (directory: string): Promise<void> {
  const dirs = (await fsp.readdir(directory))
    .filter(dir => dir !== ".DS_Store" && dir !== "dummy")

  for (const dir of dirs) {
    await loadPlugin(path.resolve(__dirname, `../plugins/${dir}`))
  }
}
