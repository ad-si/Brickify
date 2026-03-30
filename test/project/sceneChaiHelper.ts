/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
interface LastModified {
  date: number;
  cause: string;
}

interface ObjectWithLastModified {
  lastModified: LastModified;
}

export default function (chaiObj: any, utils: any): void {
  chaiObj.Assertion.addMethod("modified", function (this: any, time: number, delta?: number) {
    // the property should always be there
    if (delta == null) {
      delta = 2000
    }
    new chaiObj.Assertion(this._obj).to.have.nested.property("lastModified.date")
    // the date should be between time-delta and time
    const assertDate = new chaiObj.Assertion((this._obj as ObjectWithLastModified).lastModified.date)
    utils.transferFlags(this, assertDate, false)
    assertDate.within(time - delta, time)
    return this
  })

  return chaiObj.Assertion.addMethod("cause", function (this: any, cause: string) {
    // the property should always be there
    new chaiObj.Assertion(this._obj).to.have.nested.property("lastModified.cause")
    // the cause should match
    const assertCause = new chaiObj.Assertion((this._obj as ObjectWithLastModified).lastModified.cause)
    utils.transferFlags(this, assertCause, false)
    assertCause.equal(cause)
    return this
  }) as unknown as undefined
}
