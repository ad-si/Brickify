import SyncObject, { SyncObjectParams, SyncObjectReference, DataPacket } from "../sync/syncObject.js"
import Node from "./node.js"

interface LastModified {
  date: number;
  cause: string;
}

/*
 * A scene is a collection of nodes and settings and represents a state of a
 * project.
 *
 * @class Scene
 */
export default class Scene extends SyncObject {
  declare nodes: Node[]
  declare lastModified: LastModified

  constructor (param?: SyncObjectParams) {
    super(param)
    this._modify = this._modify.bind(this)
    this._loadSubObjects = this._loadSubObjects.bind(this)
    this.addNode = this.addNode.bind(this)
    this.getNodes = this.getNodes.bind(this)
    this.removeNode = this.removeNode.bind(this)
    this.nodes = []
    this._modify("Scene creation")
  }

  _modify (cause: string): LastModified {
    this.lastModified = {
      date: Date.now(),
      cause,
    }
    return this.lastModified
  }

  _loadSubObjects (): Promise<void> {
    const _loadNode = (reference: string | DataPacket | SyncObjectReference) => Node.from(reference) as Promise<Node>
    // During deserialization, this.nodes contains references (strings/objects) not Node instances
    const nodeRefs = this.nodes as unknown as Array<string | DataPacket | SyncObjectReference>
    return Promise.all(nodeRefs.map(_loadNode))
      .then(nodes => {
        this.nodes = nodes
      })
  }

  addNode (node: Node): this {
    const _addNode = () => {
      return node.getName()
        .then((name: string | undefined) => {
          this.nodes.push(node)
          return this._modify(`Node "${name ?? ""}" added`)
        })
    }
    return this.next(_addNode)
  }

  getNodes (): Promise<Node[] | undefined> {
    return this.done(() => this.nodes)
  }

  removeNode (node: Node): this {
    const _removeNode = () => {
      return node.getName()
        .then((name: string | undefined) => {
          const index = this.nodes.indexOf(node)
          if (index !== -1) {
            this.nodes.splice(index, 1)
          }
          return this._modify(`Node "${name ?? ""}" removed`)
        })
    }
    return this.next(_removeNode)
  }
}
