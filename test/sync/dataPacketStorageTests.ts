import { expect } from "chai"
import type { Request as ExpressRequest, Response as ExpressResponse } from "express"

import * as dataPackets from "../../routes/dataPackets.js"
import MockRequest from "../mocks/express-request.js"
import MockResponse from "../mocks/express-response.js"

// Helper to create mock request/response with proper types for testing
const Request = (params?: Record<string, string>, body?: unknown) =>
  new MockRequest(params, body) as unknown as ExpressRequest
const Response = () => new MockResponse() as unknown as ExpressResponse & MockResponse

describe("server-side dataPacket-storage tests", () => {
  afterEach(() => dataPackets.clear())

  describe("dataPacket creation", () => { it("should create empty packets", () => {
    const response = Response()
    dataPackets.create(Request(), response)
    return response.whenSent.then(() => {
      expect(response).to.have.property("type", "json")
      expect(response).to.have.property("code", 201)
      expect(response).to.have.nested.property("content.id")
      return expect(response).to.have.nested.property("content.data").to.be.empty
    })
  }) })

  describe("dataPacket existence checks", () => {
    it("should reject invalid id exists checks", () => {
      const response = Response()
      dataPackets.exists(
        Request({id: "äöü"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        return expect(response).to.have.property("code", 400)
      })
    })

    it("should not find non existing packet", () => {
      const response = Response()
      const id = "abcdefgh"
      dataPackets.exists(
        Request({id}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        expect(response).to.have.property("code", 404)
        expect(response.content).to.be.an.instanceof(Error)
        return expect((response.content as Error).message).to.equal(id)
      })
    })

    it("should find existing packet", () => {
      const createResponse = Response()
      dataPackets.create(Request(), createResponse)
      return createResponse.whenSent.then(() => {
        const {
          id,
        } = createResponse.content as { id: string }
        const existsResponse = Response()
        dataPackets.exists(
          Request({id}),
          existsResponse,
        )
        return existsResponse.whenSent.then(() => {
          expect(existsResponse).to.have.property("type", "text")
          expect(existsResponse).to.have.property("code", 200)
          return expect(existsResponse).to.have.property("content", id)
        })
      })
    })
  })

  describe("dataPacket get requests", () => {
    it("should reject invalid id gets", () => {
      const response = Response()
      dataPackets.get(
        Request({id: "äöü"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        return expect(response).to.have.property("code", 400)
      })
    })

    it("should not get non existing packet", () => {
      const response = Response()
      dataPackets.get(
        Request({id: "abcdefgh"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        expect(response).to.have.property("code", 404)
        expect(response.content).to.be.an.instanceof(Error)
        return expect((response.content as Error).message).to.equal("abcdefgh")
      })
    })

    it("should return existing packet", () => {
      const createResponse = Response()
      dataPackets.create(Request(), createResponse)
      return createResponse.whenSent.then(() => {
        const {
          id,
        } = createResponse.content as { id: string }
        const content = {a: 0, b: "c"}
        const putResponse = Response()
        dataPackets.put(
          Request({id}, content),
          putResponse,
        )
        return putResponse.whenSent.then(() => {
          const getResponse = Response()
          dataPackets.get(
            Request({id}),
            getResponse,
          )
          return getResponse.whenSent.then(() => {
            expect(getResponse).to.have.property("type", "json")
            expect(getResponse).to.have.property("code", 200)
            expect(getResponse).to.have.nested.property("content.id", id)
            return expect(getResponse).to.have.nested.property("content.data").that.deep.equals(content)
          })
        })
      })
    })
  })

  describe("dataPacket put requests", () => {
    it("should reject invalid id puts", () => {
      const response = Response()
      dataPackets.put(
        Request({id: "äöü"}, {a: 0, b: "c"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        return expect(response).to.have.property("code", 400)
      })
    })

    it("should not put non existing packet", () => {
      const response = Response()
      dataPackets.put(
        Request({id: "abcdefgh"}, {a: 0, b: "c"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        expect(response).to.have.property("code", 404)
        expect(response.content).to.be.an.instanceof(Error)
        return expect((response.content as Error).message).to.equal("abcdefgh")
      })
    })

    it("should put existing packet", () => {
      const createResponse = Response()
      dataPackets.create(Request(), createResponse)
      return createResponse.whenSent.then(() => {
        const {
          id,
        } = createResponse.content as { id: string }
        const content = {a: 0, b: "c"}
        const putResponse = Response()
        dataPackets.put(
          Request({id}, content),
          putResponse,
        )
        return putResponse.whenSent.then(() => {
          expect(putResponse).to.have.property("type", "text")
          expect(putResponse).to.have.property("code", 200)
          return expect(putResponse).to.have.property("content", id)
        })
      })
    })
  })

  describe("dataPacket deletion", () => {
    it("should reject invalid id puts", () => {
      const response = Response()
      dataPackets.delete_(
        Request({id: "äöü"}, {a: 0, b: "c"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        return expect(response).to.have.property("code", 400)
      })
    })

    it("should not delete non existing packet", () => {
      const response = Response()
      dataPackets.delete_(
        Request({id: "abcdefgh"}, {a: 0, b: "c"}),
        response,
      )
      return response.whenSent.then(() => {
        expect(response).to.have.property("type", "text")
        expect(response).to.have.property("code", 404)
        expect(response.content).to.be.an.instanceof(Error)
        return expect((response.content as Error).message).to.equal("abcdefgh")
      })
    })

    it("should delete specified packets", () => {
      const createResponse = Response()
      dataPackets.create(Request(), createResponse)
      return createResponse.whenSent.then(() => {
        const deleteResponse = Response()
        dataPackets.delete_(
          Request({id: (createResponse.content as { id: string }).id}),
          deleteResponse,
        )
        return deleteResponse.whenSent.then(() => {
          expect(deleteResponse).to.have.property("type", "text")
          expect(deleteResponse).to.have.property("code", 204)
          return expect(deleteResponse.content).to.satisfy((c: unknown) => c === undefined || c === "" || (typeof c === "string" && c.length === 0))
        })
      })
    })

    it("should not find deleted packets", () => {
      const createResponse = Response()
      dataPackets.create(Request(), createResponse)
      return createResponse.whenSent.then(() => {
        const {
          id,
        } = createResponse.content as { id: string }
        const deleteResponse = Response()
        dataPackets.delete_(
          Request({id}),
          deleteResponse,
        )
        return deleteResponse.whenSent.then(() => {
          const existsResponse = Response()
          dataPackets.exists(
            Request({id}),
            existsResponse,
          )
          return existsResponse.whenSent.then(() => {
            expect(existsResponse).to.have.property("type", "text")
            expect(existsResponse).to.have.property("code", 404)
            expect(existsResponse.content).to.be.an.instanceof(Error)
            return expect((existsResponse.content as Error).message).to.equal(id)
          })
        })
      })
    })
  })
})
