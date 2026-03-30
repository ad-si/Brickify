import PluginLoader from "../client/pluginLoader.js"
import Ui from "./ui/ui.js"
import Renderer from "./rendering/Renderer.js"
import ModelLoader from "./modelLoading/modelLoader.js"
import SceneManager from "./sceneManager.js"
import * as Spinner from "./Spinner.js"

import SyncObject from "../common/sync/syncObject.js"
import * as dataPackets from "./sync/dataPackets.js"
SyncObject.dataPacketProvider = dataPackets
import Node from "../common/project/node.js"
import * as modelCache from "./modelLoading/modelCache.js"
Node.modelProvider = modelCache

import DownloadUi from "./ui/workflowUi/DownloadUi.js"
import type { GlobalConfig } from "../types/index.js"
import type { Plugin } from "../types/plugin.js"

/*
 * @class Bundle
 */
export default class Bundle {
  globalConfig: GlobalConfig
  pluginLoader: PluginLoader
  pluginHooks: any
  modelLoader: ModelLoader
  sceneManager: SceneManager
  renderer: Renderer
  pluginInstances: Plugin[]
  ui?: Ui
  exportUi?: DownloadUi

  constructor (globalConfig: GlobalConfig, controls?: any) {
    this.init = this.init.bind(this)
    this.getPlugin = this.getPlugin.bind(this)
    this.getControls = this.getControls.bind(this)
    this.loadByIdentifier = this.loadByIdentifier.bind(this)
    this.globalConfig = globalConfig
    Spinner.startOverlay(document.getElementById(this.globalConfig.renderAreaId))
    this.pluginLoader = new PluginLoader(this)
    this.pluginHooks = this.pluginLoader.pluginHooks
    this.modelLoader = new ModelLoader(this)
    this.sceneManager = new SceneManager(this)
    this.renderer = new Renderer(this.pluginHooks, this.globalConfig, controls)
    // Ensure pluginInstances exists early to avoid undefined iteration
    this.pluginInstances = []
    // Note: pluginInstances will be set by loadPlugins() method
    if (this.globalConfig.buildUi) {
      this.ui = new Ui(this)
    }
    if (this.globalConfig.offerDownload) {
      this.exportUi = new DownloadUi(this)
    }
  }

  async init () {
    this.pluginInstances = await this.pluginLoader.loadPlugins()
    this.pluginLoader.initPlugins()
    if (this.ui != null) {
      this.ui.init()
    }
    this.renderer.initControls()
    return this.sceneManager.init()
      .then(() => Spinner.stop(document.getElementById(this.globalConfig.renderAreaId)))
  }

  getPlugin (name: string) {
    const instances = this.pluginInstances
    for (const p of instances) {
      if (p.name === name) {
        return p
      }
    }
    return null
  }

  getControls () {
    return this.renderer.getControls()
  }

  loadByIdentifier (identifier: string) {
    if (this.exportUi != null) {
      this.exportUi.setEnabled(false)
    }
    return this.modelLoader.loadByIdentifier(identifier)
      .then(() => {
        return this.exportUi != null ? this.exportUi.setEnabled(true) : undefined
      })
  }
}
