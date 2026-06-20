const DB_NAME = 'gram-phase1'
const DB_VERSION = 1
const KV_STORE = 'kv'
const EVENT_STORE = 'events'

let dbPromise = null
let storageMode = 'indexeddb'

const memoryKV = new Map()
const memoryEvents = []

function useMemoryFallback() {
  storageMode = 'memory'
}

function clone(value) {
  return value == null ? value : structuredClone(value)
}

function openDB() {
  if (storageMode === 'memory' || typeof indexedDB === 'undefined') {
    useMemoryFallback()
    return Promise.resolve(null)
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result

        if (!db.objectStoreNames.contains(KV_STORE)) {
          db.createObjectStore(KV_STORE)
        }

        if (!db.objectStoreNames.contains(EVENT_STORE)) {
          const store = db.createObjectStore(EVENT_STORE, { keyPath: 'id' })
          store.createIndex('createdAt', 'createdAt')
          store.createIndex('type', 'type')
          store.createIndex('shard', 'shard')
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
      request.onblocked = () => reject(new Error('IndexedDB open request was blocked'))
    }).catch(() => {
      useMemoryFallback()
      return null
    })
  }

  return dbPromise
}

async function withStore(storeName, mode, fn) {
  const db = await openDB()
  if (!db) {
    throw new Error('memory-fallback')
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)

    let settled = false

    tx.oncomplete = () => {
      if (!settled) {
        resolve(undefined)
      }
    }

    tx.onerror = () => reject(tx.error || new Error(`IndexedDB transaction failed for ${storeName}`))
    tx.onabort = () => reject(tx.error || new Error(`IndexedDB transaction aborted for ${storeName}`))

    fn(store, resolve, reject)
  }).catch((error) => {
    useMemoryFallback()
    if (error?.message === 'memory-fallback') {
      return undefined
    }
    throw error
  })
}

export async function getStorageMode() {
  await openDB()
  return storageMode
}

export async function getKV(key) {
  if (storageMode === 'memory') {
    return clone(memoryKV.get(key) ?? null)
  }

  try {
    const value = await withStore(KV_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
    return clone(value ?? null)
  } catch {
    useMemoryFallback()
    return clone(memoryKV.get(key) ?? null)
  }
}

export async function setKV(key, value) {
  if (storageMode === 'memory') {
    memoryKV.set(key, clone(value))
    return value
  }

  try {
    await withStore(KV_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.put(clone(value), key)
      request.onsuccess = () => resolve(value)
      request.onerror = () => reject(request.error)
    })
    return value
  } catch {
    useMemoryFallback()
    memoryKV.set(key, clone(value))
    return value
  }
}

export async function addEvent(event) {
  const saved = clone(event)

  if (storageMode === 'memory') {
    const existingIndex = memoryEvents.findIndex((item) => item.id === saved.id)
    if (existingIndex >= 0) {
      memoryEvents[existingIndex] = saved
    } else {
      memoryEvents.unshift(saved)
    }
    memoryEvents.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    return saved
  }

  try {
    await withStore(EVENT_STORE, 'readwrite', (store, resolve, reject) => {
      const request = store.put(saved)
      request.onsuccess = () => resolve(saved)
      request.onerror = () => reject(request.error)
    })
    return saved
  } catch {
    useMemoryFallback()
    return addEvent(saved)
  }
}

export async function listRecentEvents(limit = 50) {
  if (storageMode === 'memory') {
    return clone(memoryEvents.slice(0, limit))
  }

  try {
    const events = await withStore(EVENT_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
    return clone((events || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit))
  } catch {
    useMemoryFallback()
    return clone(memoryEvents.slice(0, limit))
  }
}

export async function countEvents() {
  if (storageMode === 'memory') {
    return memoryEvents.length
  }

  try {
    const count = await withStore(EVENT_STORE, 'readonly', (store, resolve, reject) => {
      const request = store.count()
      request.onsuccess = () => resolve(request.result || 0)
      request.onerror = () => reject(request.error)
    })
    return count || 0
  } catch {
    useMemoryFallback()
    return memoryEvents.length
  }
}
