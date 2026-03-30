/*
 * @module pluginLoader
 */

// Load the hook list and initialize the pluginHook management
import THREE from "three"

import hooks from "./pluginHooks.yaml"
import PluginHooks from "../common/pluginHooks.js"
import type Bundle from "./bundle.js"
import type { GlobalConfig } from "../types/index.js"
import type { Plugin, PluginConstructor, PluginPackageJson } from "../types/plugin.js"

export default class PluginLoader {
  bundle: Bundle
  pluginHooks: PluginHooks
  globalConfig: GlobalConfig
  pluginInstances: Plugin[] = []

  constructor (bundle: Bundle) {
    this.initPlugins = this.initPlugins.bind(this)
    this.bundle = bundle
    this.pluginHooks = new PluginHooks()
    this.pluginHooks.initHooks(hooks)
    this.globalConfig = this.bundle.globalConfig
  }

  _loadPlugin (PluginClass: PluginConstructor, packageData: PluginPackageJson): Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const instance: Plugin = new PluginClass()

    for (const key of Object.keys(packageData)) {
      (instance as Record<string, unknown>)[key] = (packageData as unknown as Record<string, unknown>)[key]
    }

    return instance
  }

  _initPlugin (instance: Plugin) {
    let threeNode
    if (this.pluginHooks.hasHook(instance, "init")) {
      instance.init?.(this.bundle)
    }

    if (this.pluginHooks.hasHook(instance, "init3d")) {
      threeNode = new THREE.Object3D()
      threeNode.associatedPlugin = instance
      instance.init3d?.(threeNode)
    }

    this.pluginHooks.register(instance)

    if (threeNode != null) {
      this.bundle.renderer.addToScene(threeNode)
      return
    }
  }

  initPlugins () {
    return Array.from(this.pluginInstances)
      .map((plugin) =>
        { this._initPlugin(plugin) })
  }

  // Since browserify.js does not support dynamic require
  // all plugins must be explicitly written down
  async loadPlugins (): Promise<Plugin[]> {
    this.pluginInstances = []

    if (this.globalConfig.plugins.dummy) {
      const DummyPlugin = await import("../plugins/dummy/client.js")
      const dummyPackage = await import("../plugins/dummy/package.json")
      this.pluginInstances.push(this._loadPlugin(
        DummyPlugin.default,
        dummyPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.undo) {
      const UndoPlugin = await import("../plugins/undo/undo.js")
      const undoPackage = await import("../plugins/undo/package.json")
      this.pluginInstances.push(this._loadPlugin(
        UndoPlugin.default,
        undoPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.coordinateSystem) {
      const CoordinateSystemPlugin = await import("../plugins/coordinateSystem/coordinateSystem.js")
      const coordinateSystemPackage = await import("../plugins/coordinateSystem/package.json")
      this.pluginInstances.push(this._loadPlugin(
        CoordinateSystemPlugin.default,
        coordinateSystemPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.nodeVisualizer) {
      const NodeVisualizerPlugin = await import("../plugins/nodeVisualizer/nodeVisualizer.js")
      const nodeVisualizerPackage = await import("../plugins/nodeVisualizer/package.json")
      this.pluginInstances.push(this._loadPlugin(
        NodeVisualizerPlugin.default,
        nodeVisualizerPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.legoBoard) {
      const LegoBoardPlugin = await import("../plugins/legoBoard/LegoBoard.js")
      const legoBoardPackage = await import("../plugins/legoBoard/package.json")
      this.pluginInstances.push(this._loadPlugin(
        LegoBoardPlugin.default,
        legoBoardPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.newBrickator) {
      const NewBrickatorPlugin = await import("../plugins/newBrickator/newBrickator.js")
      const newBrickatorPackage = await import("../plugins/newBrickator/package.json")
      this.pluginInstances.push(this._loadPlugin(
        NewBrickatorPlugin.default,
        newBrickatorPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.fidelityControl) {
      const FidelityControlPlugin = await import("../plugins/fidelityControl/FidelityControl.js")
      const fidelityControlPackage = await import("../plugins/fidelityControl/package.json")
      this.pluginInstances.push(this._loadPlugin(
        FidelityControlPlugin.default,
        fidelityControlPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.editController) {
      const EditControllerPlugin = await import("../plugins/editController/editController.js")
      const editControllerPackage = await import("../plugins/editController/package.json")
      this.pluginInstances.push(this._loadPlugin(
        EditControllerPlugin.default,
        editControllerPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.csg) {
      const CsgPlugin = await import("../plugins/csg/csg.js")
      const csgPackage = await import("../plugins/csg/package.json")
      this.pluginInstances.push(this._loadPlugin(
        CsgPlugin.default,
        csgPackage.default,
      ),
      )
    }
    if (this.globalConfig.plugins.legoInstructions) {
      const LegoInstructionsPlugin = await import("../plugins/legoInstructions/LegoInstructions.js")
      const legoInstructionsPackage = await import("../plugins/legoInstructions/package.json")
      this.pluginInstances.push(this._loadPlugin(
        LegoInstructionsPlugin.default,
        legoInstructionsPackage.default,
      ),
      )
    }

    return this.pluginInstances
  }
}
