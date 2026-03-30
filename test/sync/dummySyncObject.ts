import SyncObject from "../../src/common/sync/syncObject.js"

interface DummyClass {
  dummyClassProperty: string;
}

export default class Dummy extends SyncObject {
  static dummyClassProperty: string

  dummyProperty: string
  dummyTransient: string;
  [key: string]: unknown;

  static initClass () {
    (this as unknown as DummyClass).dummyClassProperty = "e"
  }
  constructor (param?: { _generateId?: boolean }) {
    super(param)
    this.dummyProperty = "a"
    this.dummyTransient = "transient"
  }

  dummyMethod () {
    return "b"
  }

  static dummyClassMethod () {
    return "d"
  }

  _isTransient (key: string): boolean {
    return (key === "dummyTransient") || super._isTransient(key)
  }
}
Dummy.initClass()
