import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"

import DataPacketsMock from "../mocks/dataPacketsMock.js"
import SyncObject from "../../src/common/sync/syncObject.js"
import ModelProviderMock from "../mocks/modelProviderMock.js"
import Node from "../../src/common/project/node.js"

chai.use(chaiAsPromised)
const { expect } = chai

let modelProvider: ModelProviderMock
let dataPackets: DataPacketsMock

describe("Node tests", () => {
  beforeEach(() => {
    modelProvider = new ModelProviderMock()
    Node.modelProvider = modelProvider
    dataPackets = new DataPacketsMock()
    SyncObject.dataPacketProvider = dataPackets
  })

  describe("Node creation", () => {
    it("should resolve after creation", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      return expect(node.done()).to.be.fulfilled
    })

    it("should be a Node and a SyncObject", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      return node.done(() => {
        expect(node).to.be.an.instanceof(Node)
        return expect(node).to.be.an.instanceof(SyncObject)
      })
    })
  })

  describe("Node manipulation", () => {
    it("should set the model's identifier chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const identifier = "randomModelIdentifier"
      const result = node.setModelIdentifier(identifier)
      expect(result).to.equal(node)
      return result.done(() => expect(node).to.have.property("modelIdentifier", identifier))
    })

    it("should get the model's identifier", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const identifier = "randomModelIdentifier"
      node.setModelIdentifier(identifier)
      return expect(node.getModelIdentifier()).to.eventually.equal(identifier)
    })

    it("should store the model's identifier", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      const node = new Node()
      const identifier = "randomModelIdentifier"
      node.setModelIdentifier(identifier)
      return node.save()
        .then(() => {
          expect(dataPackets.calls).to.equal(2)
          expect(dataPackets.createCalls).to.have.length(1)
          return expect(dataPackets.putCalls[0].packet.data).to.have.property("modelIdentifier", identifier)
        })
    })

    it("should set the model's identifier in constructor", () => {
      dataPackets.nextIds.push("abcdefgh")
      const identifier = "randomModelIdentifier"
      const node = new Node({modelIdentifier: identifier})
      return expect(node.getModelIdentifier()).to.eventually.equal(identifier)
    })

    it("should request the correct model", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      modelProvider.nextRequest = "dummy"
      const node = new Node()
      const identifier = "randomModelIdentifier"
      node.setModelIdentifier(identifier)
      const model = node.getModel()
      expect(model).to.eventually.equal("dummy")
      return model.then(() => {
        expect(modelProvider.calls).to.equal(1)
        return expect(modelProvider.requestCalls[0])
          .to.have.property("identifier", identifier)
      })
    })

    it("should set the node's name chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const name = "Beautiful Model"
      const result = node.setName(name)
      expect(result).to.equal(node)
      return result.done(() => expect(node).to.have.property("name", name))
    })

    it("should get the node's name", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const name = "Beautiful Model"
      node.setName(name)
      return expect(node.getName()).to.eventually.equal(name)
    })

    it("should store the node's name", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      const node = new Node()
      const name = "Beautiful Model"
      node.setName(name)
      return node.save()
        .then(() => {
          expect(dataPackets.calls).to.equal(2)
          expect(dataPackets.createCalls).to.have.length(1)
          return expect(dataPackets.putCalls[0].packet.data)
            .to.have.property("name", name)
        })
    })

    it("should set the node's name in constructor", () => {
      dataPackets.nextIds.push("abcdefgh")
      const name = "Beautiful Model"
      const node = new Node({name})
      return expect(node.getName()).to.eventually.equal(name)
    })
  })

  describe("plugin data in nodes", () => {
    it("should store plugin data chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const data = {random: ["plugin", "data"]}
      const result = node.storePluginData("pluginName", data)
      expect(result).to.equal(node)
      return result.done(() => expect(node).to.have.property("pluginName").that.deep.equals(data))
    })

    it("should get plugin data", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const data = {random: ["plugin", "data"]}
      node.storePluginData("pluginName", data)
      return expect(node.getPluginData("pluginName")).to.eventually.deep.equal(data)
    })

    it("should return undefined if plugin data is not available", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      return expect(node.getPluginData("pluginName")).to.eventually.be.undefined
    })

    it("should not store plugin data by default", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      const node = new Node()
      const data = {random: ["plugin", "data"]}
      node.storePluginData("pluginName", data)
      return node.save()
        .then(() => {
          expect(dataPackets.calls).to.equal(2)
          expect(dataPackets.createCalls).to.have.length(1)
          return expect(dataPackets.putCalls[0].packet.data).to.not.have.property("pluginName")
        })
    })

    it("should store plugin data if transient set to false", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      const node = new Node()
      const data = {random: ["plugin", "data"]}
      node.storePluginData("pluginName", data, false)
      return node.save()
        .then(() => {
          expect(dataPackets.calls).to.equal(2)
          expect(dataPackets.createCalls).to.have.length(1)
          return expect(dataPackets.putCalls[0].packet.data)
            .to.have.property("pluginName")
            .that.deep.equals(data)
        })
    })

    it("should store plugin data if transient set to false in later call", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      const node = new Node()
      const data = {random: ["plugin", "data"]}
      node
        .storePluginData("pluginName", {}, true)
        .storePluginData("pluginName", data, false)
      return node.save()
        .then(() => {
          expect(dataPackets.calls).to.equal(2)
          expect(dataPackets.createCalls).to.have.length(1)
          return expect(dataPackets.putCalls[0].packet.data)
            .to.have.property("pluginName")
            .that.deep.equals(data)
        })
    })
  })

  describe("node transform", () => {
    it("should provide reasonable default transforms", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const position = {x: 0, y: 0, z: 0}
      const rotation = {x: 0, y: 0, z: 0}
      const scale = {x: 1, y: 1, z: 1}
      return Promise.all([
        expect(node.getPosition()).to.eventually.deep.equal(position),
        expect(node.getRotation()).to.eventually.deep.equal(rotation),
        expect(node.getScale()).to.eventually.deep.equal(scale),
      ])
    })

    it("should set the position chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const position = {x: 10, y: 20, z: 30}
      const result = node.setPosition(position)
      expect(result).to.equal(node)
      return result.done(() => expect(node).to.have.nested.property("transform.position").that.deep.equals(position))
    })

    it("should get the position", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const position = {x: 10, y: 20, z: 30}
      node.setPosition(position)
      return expect(node.getPosition()).to.eventually.deep.equal(position)
    })

    it("should set the rotation chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const rotation = {x: 1, y: 2, z: 3}
      const result = node.setRotation(rotation)
      expect(result).to.equal(node)
      return result.done(() => expect(node).to.have.nested.property("transform.rotation").that.deep.equals(rotation))
    })

    it("should get the rotation", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const rotation = {x: 1, y: 2, z: 3}
      node.setRotation(rotation)
      return expect(node.getRotation()).to.eventually.deep.equal(rotation)
    })

    it("should set the scale chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const scale = {x: 2, y: 2, z: 2}
      const result = node.setScale(scale)
      expect(result).to.equal(node)
      return result.done(() => expect(node).to.have.nested.property("transform.scale").that.deep.equals(scale))
    })

    it("should get the scale", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const scale = {x: 2, y: 2, z: 2}
      node.setScale(scale)
      return expect(node.getScale()).to.eventually.deep.equal(scale)
    })

    it("should set the transform chainable", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const position = {x: 0, y: 10, z: 20}
      const rotation = {x: 30, y: 40, z: 50}
      const scale = {x: 1, y: 2, z: 3}
      const transform = {position, rotation, scale}
      const result = node.setTransform(transform)
      expect(result).to.equal(node)
      return result.done(() => {
        expect(node).to.have.nested.property("transform.position").that.deep.equals(position)
        expect(node).to.have.nested.property("transform.rotation").that.deep.equals(rotation)
        return expect(node).to.have.nested.property("transform.scale").that.deep.equals(scale)
      })
    })

    it("should set the transform in constructor", () => {
      dataPackets.nextIds.push("abcdefgh")
      const position = {x: 0, y: 10, z: 20}
      const rotation = {x: 30, y: 40, z: 50}
      const scale = {x: 1, y: 2, z: 3}
      const transform = {position, rotation, scale}
      const node = new Node({transform})
      return Promise.all([
        expect(node.getPosition()).to.eventually.deep.equal(position),
        expect(node.getRotation()).to.eventually.deep.equal(rotation),
        expect(node.getScale()).to.eventually.deep.equal(scale),
      ])
    })

    it("should get the transform", () => {
      dataPackets.nextIds.push("abcdefgh")
      const node = new Node()
      const position = {x: 0, y: 10, z: 20}
      const rotation = {x: 30, y: 40, z: 50}
      const scale = {x: 1, y: 2, z: 3}
      const transform = {position, rotation, scale}
      node.setTransform(transform)
      return expect(node.getTransform()).to.eventually.deep.equal(transform)
    })

    it("should store the transform", () => {
      dataPackets.nextIds.push("abcdefgh")
      dataPackets.nextPuts.push(true)
      const node = new Node()
      const position = {x: 0, y: 10, z: 20}
      const rotation = {x: 30, y: 40, z: 50}
      const scale = {x: 1, y: 2, z: 3}
      const transform = {position, rotation, scale}
      node.setTransform(transform)
      return node.save()
        .then(() => {
          expect(dataPackets.calls).to.equal(2)
          expect(dataPackets.createCalls).to.have.length(1)
          return expect(dataPackets.putCalls[0].packet.data)
            .to.have.property("transform")
            .that.deep.equals(transform)
        })
    })
  })
})
