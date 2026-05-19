import { openDB, type IDBPDatabase } from 'idb'
import type { Memo } from './types'

const DB_NAME = 'sticky-notes-db'
const STORE = 'memos'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function getAllMemos(): Promise<Memo[]> {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function putMemo(memo: Memo): Promise<void> {
  const db = await getDb()
  await db.put(STORE, memo)
}

export async function deleteMemo(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function bulkDelete(ids: string[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  await Promise.all(ids.map(id => tx.store.delete(id)))
  await tx.done
}
