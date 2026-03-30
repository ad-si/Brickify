/*
 * The combined client-side local data packet provider and cache.
 *
 * @module clientDataPackets
 */

import * as cache from "./dataPacketsCache"
import * as proxy from "./dataPacketsProxy"

import type { DataPacket } from "../../common/sync/syncObject"

type Packet = DataPacket

export const create = (): Promise<Packet> => proxy.create()
  .then(cache.create)

export const exists = (id: string): Promise<string> => cache.exists(id)
  .catch(() => proxy.exists(id))

export const get = (id: string): Promise<Packet> => cache.get(id)
  .catch(() => proxy.get(id)
    .then(cache.cache))

export const put = (packet: Packet): Promise<void> => proxy.put(packet)
  .then(() => cache.cache(packet))
  .then((): void => undefined)

export const delete_ = (id: string): Promise<void> => proxy.delete_(id)
  .then(() => cache.ensureDelete(id))

export const clear = (): Promise<void> => cache.clear()
