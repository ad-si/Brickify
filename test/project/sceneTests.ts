import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"
import chaiShallowDeepEqual from "chai-shallow-deep-equal"

import DataPacketsMock from "../mocks/dataPacketsMock.js"
import SyncObject from "../../src/common/sync/syncObject.js"
import Scene from "../../src/common/project/scene.js"
import Node from "../../src/common/project/node.js"
import sceneChaiHelper from "./sceneChaiHelper.js"

// Extend chai assertion interface to include custom methods
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Chai {
    interface Assertion {
      modified(time: number, delta?: number): Assertion;
      cause(cause: string): Assertion;
      shallowDeepEqual(expected: unknown): Assertion;
    }
  }
}

chai.use(sceneChaiHelper)
chai.use(chaiAsPromised)
chai.use(chaiShallowDeepEqual)

const { expect } = chai

let dataPackets: DataPacketsMock

describe("Scene tests", () => {
  beforeEach(() => {
    dataPackets = new DataPacketsMock()
    return SyncObject.dataPacketProvider = dataPackets
  })

  describe("Scene creation", () => {
    it("should resolve after creation", () => {
      dataPackets.nextIds.push("abcdefgh")
      const scene = new Scene()
      return expect(scene.done()).to.be.fulfilled
    })

    it("should be a Scene and a SyncObject", () => {
      dataPackets.nextIds.push("abcdefgh")
      const before = Date.now()
      const scene = new Scene()
      return scene.done(() => {
        expect(scene).to.be.an.instanceof(Scene)
        expect(scene).to.be.an.instanceof(SyncObject)
        expect(scene).to.have.property("nodes")
          .that.is.an("array").with.length(0)
        // Check lastModified properties directly
        expect(scene).to.have.nested.property("lastModified.date")
        expect(scene).to.have.nested.property("lastModified.cause", "Scene creation")
        const now = Date.now()
        expect(scene.lastModified.date).to.be.within(before, now + 2000)
      })
    })
  })

  describe("Scene manipulation", () => {
    it("should accept new nodes", () => {
      dataPackets.nextIds.push("abcdefgh")
      const scene = new Scene()
      dataPackets.nextIds.push("ijklmnop")
      const node = new Node()
      const name = "Beautiful Model"
      node.setName(name)
      const before = Date.now()
      const result = scene.addNode(node)
      expect(result).to.equal(scene)
      return scene.done(() => {
        expect(scene).to.have.property("nodes").that.deep.equals([node])
        // Check lastModified properties directly
        expect(scene).to.have.nested.property("lastModified.date")
        expect(scene).to.have.nested.property("lastModified.cause", `Node "${name}" added`)
        const now = Date.now()
        expect(scene.lastModified.date).to.be.within(before, now + 2000)
      })
    })

    it("should remove present nodes", () => {
      dataPackets.nextIds.push("abcdefgh")
      const scene = new Scene()
      dataPackets.nextIds.push("ijklmnop")
      const node = new Node()
      const name = "Beautiful Model"
      node.setName(name)
      const before = Date.now()
      scene.addNode(node)
      const result = scene.removeNode(node)
      expect(result).to.equal(scene)
      return scene.done(() => {
        expect(scene).to.have.property("nodes")
          .that.is.an("array").with.length(0)
        // Check lastModified properties directly
        expect(scene).to.have.nested.property("lastModified.date")
        expect(scene).to.have.nested.property("lastModified.cause", `Node "${name}" removed`)
        const now = Date.now()
        expect(scene.lastModified.date).to.be.within(before, now + 2000)
      })
    })
  })

  describe("Scene synchronization", () => {
    it("should store nodes as references", () => {
      let nodeId: string
      dataPackets.nextIds.push("sceneid")
      const scene = new Scene()
      dataPackets.nextIds.push(nodeId = "nodeid")
      const node = new Node()
      node.setName("Beautiful Model")
      scene.addNode(node)
      dataPackets.nextPuts.push(true)
      void scene.save()
      return scene.done(() => {
        const {
          packet,
        } = dataPackets.putCalls[0]
        expect(packet).to.have.nested.property("data.nodes").that.is.an("array")
        const {
          nodes,
        } = packet.data as { nodes: Array<{ dataPacketRef: string }> }
        expect(nodes).to.have.length(1)
        return expect(nodes[0]).to.deep.equal({dataPacketRef: nodeId})
      })
    })

    it("should restore node objects from references", () => {
      const scene = {
        id: "sceneid",
        data: {
          nodes: [{dataPacketRef: "nodeid"}],
        },
      }
      dataPackets.nextGets.push(scene)
      const node = {
        id: "nodeid",
        data: { modelIdentifier: "abcdefghijklmnop", name: "Beautiful Model" },
      }
      dataPackets.nextGets.push(node)

      const request = Scene.from("sceneid")
      void expect(request).to.be.fulfilled
      return (request as Promise<Scene>).then(scene => scene.done(() => {
        expect(scene).to.have.property("nodes").that.is.an("array")
        const {
          nodes,
        } = scene
        expect(nodes).to.have.length(1)
        return expect(nodes[0]).to.shallowDeepEqual(node.data)
      }))
    })
  })
})
