export interface DataPacket {
  id: string;
  data: Record<string, unknown>;
}

export interface SyncObjectReference {
  dataPacketRef: string;
}

export interface DataPacketProvider {
  create(): Promise<DataPacket>;
  get(id: string): Promise<DataPacket>;
  put(packet: DataPacket): Promise<void>;
  delete_(id: string): Promise<void>;
}

export interface SyncObjectParams {
  _generateId?: boolean;
}

/*
 * This is a helper super class for objects that are synchronized using
 * dataPackets.
 * @class SyncObject
 */
export default class SyncObject {
  static dataPacketProvider: DataPacketProvider | null = null

  id!: string
  ready: Promise<unknown>;
  [key: string]: unknown;

  /*
   * Constructs a new SyncObject
   *
   * Due to the synchronization process there are restrictions to the constructors
   * of subclasses: All parameters must be passed as 'named parameters', meaning
   * as an object. The constructor must call SyncObject's constructor by calling
   * super(arguments[0]).
   *
   * @param {Object} params the named parameters
   * @param {Boolean} [params._generateId=true] true for a new SyncObject
   * @memberOf SyncObject
   */
  constructor(param?: SyncObjectParams) {
    this.getId = this.getId.bind(this)
    this.toJSON = this.toJSON.bind(this)
    this.toPOJSO = this.toPOJSO.bind(this)
    this._getPacket = this._getPacket.bind(this)
    this.save = this.save.bind(this)
    this.delete = this.delete.bind(this)
    this.next = this.next.bind(this)
    this.done = this.done.bind(this)
    this.catch = this.catch.bind(this)

    const _generateId = param?._generateId

    if (_generateId || _generateId == null) {
      if (!SyncObject.dataPacketProvider) {
        throw new Error('dataPacketProvider not set')
      }
      this.ready = SyncObject.dataPacketProvider.create().then((packet) => {
        this.id = packet.id
        return this.id
      })
    } else {
      this.ready = Promise.resolve()
    }
  }

  /*
   * Builds the respective subclass of SyncObject from a descriptor or a
   * descriptor array which can either be a packet with an id and a data plain
   * old javascript object or an array of packets or an id of a packet to load or
   * an array of packet ids to be loaded or a DataPacket reference or an array
   * of DataPacket references.
   *
   * @param {String|Array<String>|Object|Array<Object>} syncObjectDescriptor
   * @return {SyncObject|Array<SyncObject>} as Promise or Array of Promises
   * @promise
   * @memberOf SyncObject
   */
  static from<T extends SyncObject>(
    this: new (params?: SyncObjectParams) => T,
    syncObjectDescriptor: string | DataPacket | SyncObjectReference | Array<string | DataPacket | SyncObjectReference>,
  ): Promise<T> | Array<Promise<T>> {
    const _syncObjectFromPacket = (packet: DataPacket): Promise<T> => {
      const instance = new this({ _generateId: false })
      return instance.next((syncObject: T) => {
        for (const p of Object.keys(packet.data)) {
          (syncObject as Record<string, unknown>)[p] = packet.data[p]
        }
        syncObject.id = packet.id
        const loadResult = syncObject._loadSubObjects()
        // If _loadSubObjects returns a promise, wait for it before returning
        if (loadResult && typeof (loadResult).then === 'function') {
          return (loadResult).then(() => syncObject)
        }
        return syncObject
      }).ready as Promise<T>
    }

    const _packetFromId = (id: string): Promise<DataPacket> => {
      if (!SyncObject.dataPacketProvider) {
        return Promise.reject(new Error('dataPacketProvider not set'))
      }
      return SyncObject.dataPacketProvider.get(id)
    }

    const _fromOne = (descriptor: string | DataPacket | SyncObjectReference): Promise<T> => {
      let packet: Promise<DataPacket>
      if (typeof descriptor === 'string') {
        packet = _packetFromId(descriptor)
      } else if (SyncObject.isSyncObjectReference(descriptor)) {
        packet = _packetFromId(descriptor.dataPacketRef)
      } else if (SyncObject.isDataPacket(descriptor)) {
        packet = Promise.resolve(descriptor)
      } else {
        throw new Error(String(descriptor) + ' is not an id, a packet or a reference.')
      }

      return packet.then(_syncObjectFromPacket)
    }

    if (Array.isArray(syncObjectDescriptor)) {
      return syncObjectDescriptor.map(_fromOne)
    } else {
      return _fromOne(syncObjectDescriptor)
    }
  }

  /*
   * This method is called by @from after all properties of a restored SyncObject
   * are loaded, but without resolving children that are references to
   * DataPackets. A subclass that has such children should implement
   * loadSubObjects to resolve those references and load the respective
   * SyncObjects if they should be accessible after initialization.
   * Returns a Promise if async loading is needed.
   */
  _loadSubObjects(): void | Promise<void> {
    // Override in subclasses
  }

  getId(): string {
    return this.id
  }

  /*
   * Checks whether the property with the given key should be synchronized or
   * ignored. All functions will be ignored automatically.
   * This function can be overwritten by subclasses to ignore additional
   * properties, but the subclass has to call super(key)!
   *
   * @param {String} key the name of the property to be checked.
   * @return {Boolean} true if the key should be ignored
   */
  _isTransient(key: string): boolean {
    return ['id', 'ready'].indexOf(key) !== -1
  }

  /*
   * For JSON serialization of parent objects only write a reference.
   * @return {String} a DataPacket reference to this SyncObject.
   */
  toJSON(): SyncObjectReference {
    return { dataPacketRef: this.getId() }
  }

  static isSyncObjectReference(pojso: unknown): pojso is SyncObjectReference {
    return (
      typeof pojso === 'object' &&
      pojso !== null &&
      'dataPacketRef' in pojso &&
      typeof (pojso as SyncObjectReference).dataPacketRef === 'string'
    )
  }

  static isDataPacket(pojso: unknown): pojso is DataPacket {
    return (
      typeof pojso === 'object' &&
      pojso !== null &&
      'id' in pojso &&
      typeof (pojso as DataPacket).id === 'string' &&
      'data' in pojso
    )
  }

  /*
   * Builds an object that only consists of non-transient plain objects.
   * (Also called "Plain Old JavaScript Object")
   * @return {Object} key/value mapping of this object's non-transient properties
   */
  toPOJSO(): Record<string, unknown> {
    const pojso: Record<string, unknown> = {}
    const keys = Object.keys(this).filter(
      (key) => typeof this[key] !== 'function' && !this._isTransient(key),
    )
    for (const key of keys) {
      pojso[key] = this[key]
    }
    return pojso
  }

  _getPacket(): DataPacket {
    return { id: this.getId(), data: this.toPOJSO() }
  }

  /*
   * Saves any non-transient data of this object to the server.
   * @promise
   */
  save(): Promise<unknown> {
    if (!SyncObject.dataPacketProvider) {
      return Promise.reject(new Error('dataPacketProvider not set'))
    }
    const provider = SyncObject.dataPacketProvider
    this.ready = this.ready.then(() => provider.put(this._getPacket()))
    return this.ready
  }

  /*
   * Deletes the object from the server.
   * Caution: after calling delete() on a SyncObject, it will be more or less
   * unusable, because next, done, save and delete will reject all further calls.
   * @promise
   */
  delete(): Promise<unknown> {
    if (!SyncObject.dataPacketProvider) {
      return Promise.reject(new Error('dataPacketProvider not set'))
    }
    const provider = SyncObject.dataPacketProvider
    this.ready = this.ready.then(() => provider.delete_(this.getId()))
    this.ready.then(() => {
      // After deletion completes, replace ready with a permanently rejected promise.
      // This ensures all future calls to done()/next()/save() will reject.
      this.ready = Promise.reject(
        new ReferenceError(`${this.constructor.name} #${this.getId()} was deleted`),
      )
      // Attach a no-op catch handler to prevent Node.js "unhandled rejection" warnings.
      // The error will still propagate to any explicit .done()/.catch() calls.
      this.ready.catch(() => undefined)
    }).catch(() => undefined)
    return this.ready
  }

  /*
   * ##Asynchronous task chaining
   * A syncObject implements an access point to chain asynchronous tasks via
   * promises.
   */

  /*
   * Chains up a new asynchronous task that is run after all previous tasks
   * have completed. Both arguments are optional.
   *
   * @param {Function} onFulfilled run when previous task fulfilled with @
   * @param {Function} onRejected run when previous task rejected with its reason
   * @return {SyncObject} this
   */
  next<T = unknown>(
    onFulfilled?: (self: this) => T | PromiseLike<T>,
    onRejected?: (reason: unknown) => T | PromiseLike<T>,
  ): this {
    void this.done(onFulfilled, onRejected)
    return this
  }

  /*
   * Chains up a new asynchronous task that is run after all previous tasks
   * have completed. Both arguments are optional.
   *
   * @param {Function} onFulfilled run when previous task fulfilled with @
   * @param {Function} onRejected run when previous task rejected with its reason
   * @return {Object} resolves or rejects according to the run callback's result
   * @promise
   */
  done<T = unknown>(
    onFulfilled?: (self: this) => T | PromiseLike<T>,
    onRejected?: (reason: unknown) => T | PromiseLike<T>,
  ): Promise<T | undefined> {
    // we don't want to pass return values from a previous then but pass @
    const onFulfilledThis = (): T | PromiseLike<T> | undefined =>
      typeof onFulfilled === 'function' ? onFulfilled(this) : undefined
    this.ready = this.ready.then(onFulfilledThis, onRejected)
    return this.ready as Promise<T | undefined>
  }

  /*
   * Chains up a new error handler.
   * This is only syntactic sugar for done(undefined, onRejected)
   * @param {Function} onRejected run when previous task rejected with its reason
   * @promise
   */
  catch<T = unknown>(onRejected: (reason: unknown) => T | PromiseLike<T>): Promise<unknown> {
    this.ready = this.ready.catch(onRejected)
    return this.ready
  }
}
