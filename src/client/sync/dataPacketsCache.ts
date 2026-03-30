/*
 * The client's data packet cache
 *
 * @module clientDataPacketsCache
 */

import type { DataPacket } from "../../common/sync/syncObject"

type Packet = DataPacket

// A map of promises that resolve to the respective packet or reject with its id
let packets: Partial<Record<string, Promise<Packet>>> = {}

// cache is the big brother of put: it will always store the packet and resolve
export const cache = (packet: Packet): Promise<Packet> => {
  const promise = Promise.resolve(packet)
  packets[packet.id] = promise
  return promise
}

// ensureDelete is the big brother of delete: it will delete the packet if
// present and always resolve
export const ensureDelete = function (id: string): Promise<void> {
  Reflect.deleteProperty(packets, id)
  return Promise.resolve()
}

export const create = (packet: Packet): Promise<Packet> => cache(packet)

export const exists = function (id: string): Promise<string> {
  if (packets[id] == null) {
    return Promise.reject(new Error(id))
  }
  return packets[id].then(() => id)
}

export const get = (id: string): Promise<Packet> => {
  if (packets[id] != null) {
    return packets[id]
  }
  return Promise.reject(new Error(id))
}

export const put = (packet: Packet): Promise<void> => exists(packet.id)
  .then(() => cache(packet))
  .then((): void => undefined)

export const delete_ = function (id: string): Promise<void> {
  if (packets[id] != null) {
    return ensureDelete(id)
  }
  else {
    return Promise.reject(new Error(id))
  }
}

export const clear = function (): Promise<void> {
  packets = {}
  return Promise.resolve()
}
