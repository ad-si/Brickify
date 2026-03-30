/*
 * A simple data packet storage that holds data in memory
 *
 * @module dataPacketRamStorage
 */

import * as idGenerator from "./idGenerator.js"

interface DataPacket {
  id: string
  data: Record<string, unknown>
}

type PacketsMap = Partial<Record<string, DataPacket>>

let packets: PacketsMap = {}

export function create (): Promise<DataPacket> {
  const id = idGenerator.generate((id: string) => packets[id] == null)
  if (id === null) {
    return Promise.reject(new Error("Could not generate unique id"))
  }
  packets[id] = {
    id,
    data: {},
  }
  return Promise.resolve(packets[id])
}

export function isSaneId (id: string): Promise<string> {
  if (idGenerator.check(id)) {
    return Promise.resolve(id)
  }
  else {
    return Promise.reject(new Error(id))
  }
}

export function exists (id: string): Promise<string> {
  if (packets[id] != null) {
    return Promise.resolve(id)
  }
  else {
    return Promise.reject(new Error(id))
  }
}

export function get (id: string): Promise<DataPacket> {
  if (packets[id] != null) {
    return Promise.resolve(packets[id])
  }
  else {
    return Promise.reject(new Error(id))
  }
}

export function put (packet: DataPacket): Promise<string> {
  const existing = packets[packet.id]
  if (existing != null) {
    existing.data = packet.data
    return Promise.resolve(packet.id)
  }
  else {
    return Promise.reject(new Error(packet.id))
  }
}

export function delete_ (id: string): Promise<void> {
  if (packets[id] != null) {
    Reflect.deleteProperty(packets, id)
    return Promise.resolve()
  }
  else {
    return Promise.reject(new Error(id))
  }
}

export function clear (): Promise<void> {
  packets = {}
  return Promise.resolve()
}
