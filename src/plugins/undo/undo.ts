import $ from "jquery"
import type Node from "../../common/project/node.js"

interface UndoAction {
  undo: () => void;
  redo: () => void;
}

interface UndoData {
  undoTasks: UndoAction[];
  redoTasks: UndoAction[];
}

interface NullNode {
  getPluginData(key: string): Promise<UndoData>;
}

const nullData: UndoData = {
  undoTasks: [],
  redoTasks: [],
}

const nullNode: NullNode = {
  getPluginData () {
    return Promise.resolve(nullData)
  },
}

export default class Undo {
  currentNode: Node | NullNode
  $undo!: JQuery
  $redo!: JQuery

  constructor () {
    this.onNodeAdd = this.onNodeAdd.bind(this)
    this.onNodeSelect = this.onNodeSelect.bind(this)
    this.onNodeDeselect = this.onNodeDeselect.bind(this)
    this.onNodeRemove = this.onNodeRemove.bind(this)
    this.addTask = this.addTask.bind(this)
    this.undo = this.undo.bind(this)
    this.redo = this.redo.bind(this)
    this.getHotkeys = this.getHotkeys.bind(this)
    this._initUi = this._initUi.bind(this)
    this._updateUi = this._updateUi.bind(this)
    this.currentNode = nullNode
    this._initUi()
  }

  onNodeAdd (node: Node) {
    const nodeData: UndoData = {
      undoTasks: [],
      redoTasks: [],
    }
    node.storePluginData("undo", nodeData)
    this.currentNode = node
    void this._updateUi()
  }

  onNodeSelect (node: Node) {
    this.currentNode = node
    void this._updateUi()
  }

  onNodeDeselect () {
    this.currentNode = nullNode
    void this._updateUi()
  }

  onNodeRemove (node: Node) {
    if (node === this.currentNode) {
      this.currentNode = nullNode
    }
    void this._updateUi()
  }

  addTask (undo: () => void, redo: () => void) {
    return this.currentNode.getPluginData("undo")
      .then((data: unknown) => {
        const { undoTasks, redoTasks } = data as UndoData
        undoTasks.push({undo, redo})
        return redoTasks.length = 0
      })
      .then(() => this._updateUi())
  }

  undo () {
    return this.currentNode.getPluginData("undo")
      .then((data: unknown) => {
        const { undoTasks, redoTasks } = data as UndoData
        const action = undoTasks.pop()
        if (action == null) {
          return
        }

        redoTasks.push(action)
        action.undo()
      })
      .then(() => this._updateUi())
  }

  redo () {
    return this.currentNode.getPluginData("undo")
      .then((data: unknown) => {
        const { undoTasks, redoTasks } = data as UndoData
        const action = redoTasks.pop()
        if (action == null) {
          return
        }

        undoTasks.push(action)
        action.redo()
      })
      .then(() => this._updateUi())
  }

  getHotkeys () {
    return {
      title: "Undo/Redo",
      events: [
        {
          description: "Undo last brush action",
          hotkey: "ctrl+z",
          callback: () => { void this.undo() },
        },
        {
          description: "Redo last brush action",
          hotkey: "ctrl+y",
          callback: () => { void this.redo() },
        },
      ],
    }
  }

  _initUi () {
    this.$undo = $("#undo")
    this.$redo = $("#redo")

    this.$undo.on("click", () => { void this.undo() })
    return this.$redo.on("click", () => { void this.redo() })
  }

  _updateUi () {
    return this.currentNode.getPluginData("undo")
      .then((data: unknown) => {
        const { undoTasks, redoTasks } = data as UndoData
        this.$undo.toggleClass("disabled", undoTasks.length === 0)
        return this.$redo.toggleClass("disabled", redoTasks.length === 0)
      })
  }
}
