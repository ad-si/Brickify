import { expect } from "chai"
import * as idGenerator from "../../src/server/sync/idGenerator.js"

describe("id generator tests", () => {
  it("should only contain alphanumeric characters", () => {
    const id = idGenerator.generate()
    return expect(id).to.match(/^[a-zA-z0-9]+$/)
  })

  it("should generate and validate according to the same pattern", () => {
    const id = idGenerator.generate()
    if (id == null) throw new Error("id should not be null")
    return expect(idGenerator.check(id)).to.be.ok
  })

  it("should generate ids of the correct length", () => {
    const acceptingFilter = () => true
    const id = idGenerator.generate(acceptingFilter, 5)
    return expect(id).to.have.length(5)
  })

  it("should abort if the filter does not accept any id", () => {
    const rejectingFilter = () => false
    const id = idGenerator.generate(rejectingFilter, 3)
    return expect(id).to.be.null
  })
})
