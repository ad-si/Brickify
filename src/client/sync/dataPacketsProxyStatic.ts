/*
 * Static/offline data packet proxy that uses localStorage instead of server
 *
 * @module clientDataPacketsProxyStatic
 */

interface Packet {
  id: string
  data: Record<string, unknown>
  [key: string]: unknown
}

const STORAGE_KEY = 'brickify_datapackets'

function generateId(): string {
  return `dp_${String(Date.now())}_${Math.random().toString(36).slice(2, 11)}`
}

function getStorage(): Partial<Record<string, Packet>> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) as Partial<Record<string, Packet>> : {}
  } catch {
    return {}
  }
}

function saveStorage(packets: Partial<Record<string, Packet>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packets))
  } catch {
    // localStorage may be full or unavailable
  }
}

export const create = (): Promise<Packet> => {
  const id = generateId()
  const packet = { id, data: {} }
  const packets = getStorage()
  packets[id] = packet
  saveStorage(packets)
  return Promise.resolve(packet)
}

export const exists = (id: string): Promise<string> => {
  const packets = getStorage()
  if (packets[id]) {
    return Promise.resolve(id)
  }
  const error = new Error('Not Found') as Error & { status: number; statusText: string; responseText: string }
  error.status = 404
  error.statusText = 'Not Found'
  error.responseText = id
  return Promise.reject(error)
}

export const get = (id: string): Promise<Packet> => {
  const packets = getStorage()
  if (packets[id]) {
    return Promise.resolve(packets[id])
  }
  const error = new Error('Not Found') as Error & { status: number; statusText: string; responseText: string }
  error.status = 404
  error.statusText = 'Not Found'
  error.responseText = id
  return Promise.reject(error)
}

export const put = (packet: Packet): Promise<string> => {
  const packets = getStorage()
  if (packets[packet.id]) {
    packets[packet.id] = packet
    saveStorage(packets)
    return Promise.resolve(packet.id)
  }
  const error = new Error('Not Found') as Error & { status: number; statusText: string; responseText: string }
  error.status = 404
  error.statusText = 'Not Found'
  error.responseText = packet.id
  return Promise.reject(error)
}

export const delete_ = (id: string): Promise<void> => {
  const packets = getStorage()
  if (packets[id]) {
    Reflect.deleteProperty(packets, id)
    saveStorage(packets)
    return Promise.resolve()
  }
  const error = new Error('Not Found') as Error & { status: number; statusText: string; responseText: string }
  error.status = 404
  error.statusText = 'Not Found'
  error.responseText = id
  return Promise.reject(error)
}
