import Project from "../common/project/project.js"
import type Scene from "../common/project/scene.js"
import type Bundle from "./bundle.js"
import type Node from "../common/project/node.js"

/*
 * @class SceneManager
 */
export default class SceneManager {
  bundle: Bundle
  selectedNode: Node | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pluginHooks: any
  project: Promise<Project>
  scene: Promise<Scene | undefined>
  bootboxOpen?: boolean

  constructor (bundle: Bundle) {
    this.init = this.init.bind(this)
    this.getHotkeys = this.getHotkeys.bind(this)
    this._notify = this._notify.bind(this)
    this.add = this.add.bind(this)
    this._addNodeToScene = this._addNodeToScene.bind(this)
    this.remove = this.remove.bind(this)
    this.clearScene = this.clearScene.bind(this)
    this.select = this.select.bind(this)
    this.deselect = this.deselect.bind(this)
    this._deleteCurrentNode = this._deleteCurrentNode.bind(this)
    this.bundle = bundle
    this.selectedNode = null
    this.pluginHooks = this.bundle.pluginHooks
    this.project = Project.load()
    this.scene = this.project.then(project => project.getScene())
  }

  init () {
    return this.scene
      .then(scene => scene?.getNodes())
      .then(nodes => (nodes ?? [])
        .map((node: Node) => this._notify("onNodeAdd", node)))
  }

  getHotkeys () {
    return {
      title: "Scene",
      events: [
        this._getDeleteHotkey(),
      ],
    }
  }

  _notify (hook: string, node: Node) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return Promise.all(this.pluginHooks[hook](node))
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
      .then(() => __guardMethod__((this.bundle.ui as any)?.workflowUi, hook, (o, m) => o[m](node)))
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
  }

  //
  // Administration of nodes
  //

  add (node: Node) {
    return this.scene
      .then(scene => {
        if (scene && scene.nodes.length > 0) {
          void this.remove(scene.nodes[0])
        }
        return this._addNodeToScene(node)
      })
  }

  _addNodeToScene (node: Node) {
    return this.scene
      .then(scene => scene?.addNode(node))
      .then(() => this._notify("onNodeAdd", node))
      .then(() => { this.select(node) })
  }

  remove (node: Node) {
    return this.scene
      .then(scene => scene?.removeNode(node))
      .then(() => this._notify("onNodeRemove",  node))
      .then(() => {
        if (node === this.selectedNode) {
          this.deselect()
          return
        }
      })
  }

  clearScene () {
    return this.scene
      .then(scene => scene?.getNodes())
      .then(nodes => (nodes ?? [])
        .map((node: Node) => this.remove(node)))
  }

  //
  // Selection of nodes
  //

  select (selectedNode: Node) {
    this.selectedNode = selectedNode
    void this._notify("onNodeSelect", this.selectedNode)
  }

  deselect () {
    if (this.selectedNode != null) {
      void this._notify("onNodeDeselect", this.selectedNode)
      this.selectedNode = null
    }
  }

  //
  // Deletion of nodes
  //

  _deleteCurrentNode (): void {
    if (this.bootboxOpen) {
      return
    }
    if (this.selectedNode == null) {
      return
    }

    this.bootboxOpen = true
    void this.selectedNode.getName()
      .then((name: unknown) => {
        const question = `Do you really want to delete ${String(name)}?`
        return bootbox.confirm(question, result => {
          this.bootboxOpen = false
          if (result) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            void this.remove(this.selectedNode!)
            this.deselect()
          return
          }
        })
      })
  }

  _getDeleteHotkey () {
    return {
      hotkey: "del",
      description: "delete selected model",
      // eslint-disable-next-line @typescript-eslint/unbound-method
      callback: this._deleteCurrentNode,
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
function __guardMethod__ (obj: any, methodName: string, transform: (o: any, m: string) => any) {
  if (typeof obj !== "undefined" && obj !== null && typeof obj[methodName] === "function") {
    return transform(obj, methodName)
  }
  else {
    return undefined
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
