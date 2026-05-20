import { useCallback, useEffect, useState } from 'react'
import type { Memo, MemoColor, MemoType } from './types'
import { getAllMemos, putMemo, deleteMemo as dbDelete, bulkDelete } from './db'
import { uid, randomNearCenter, COLORS } from './utils'

export function useMemoStore() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getAllMemos()
      .then(rows => {
        setMemos(rows)
        setLoaded(true)
      })
      .catch(err => {
        console.error('Failed to load memos:', err)
        setLoaded(true)
      })
  }, [])

  const persist = useCallback((memo: Memo) => {
    putMemo(memo).catch(err => console.error('persist failed', err))
  }, [])

  const createMemo = useCallback(
    (partial: Partial<Memo> & { type: MemoType; content: string }) => {
      const pos = randomNearCenter()
      const now = Date.now()
      const memo: Memo = {
        id: uid(),
        type: partial.type,
        content: partial.content,
        images: partial.images,
        x: partial.x ?? pos.x,
        y: partial.y ?? pos.y,
        width: partial.width ?? (partial.type === 'image' ? 320 : 220),
        height: partial.height,
        color: partial.color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }
      setMemos(prev => [...prev, memo])
      persist(memo)
      return memo
    },
    [persist],
  )

  const updateMemo = useCallback(
    (id: string, updates: Partial<Memo>) => {
      setMemos(prev =>
        prev.map(m => {
          if (m.id !== id) return m
          const updated: Memo = { ...m, ...updates, updatedAt: Date.now() }
          persist(updated)
          return updated
        }),
      )
    },
    [persist],
  )

  const moveToTrash = useCallback(
    (id: string) => {
      const now = Date.now()
      setMemos(prev =>
        prev.map(m => {
          if (m.id !== id) return m
          const updated: Memo = { ...m, deletedAt: now, updatedAt: now }
          persist(updated)
          return updated
        }),
      )
    },
    [persist],
  )

  const restore = useCallback(
    (id: string) => {
      setMemos(prev =>
        prev.map(m => {
          if (m.id !== id) return m
          const updated: Memo = { ...m, deletedAt: null, updatedAt: Date.now() }
          persist(updated)
          return updated
        }),
      )
    },
    [persist],
  )

  const permaDelete = useCallback((id: string) => {
    setMemos(prev => prev.filter(m => m.id !== id))
    dbDelete(id).catch(err => console.error('delete failed', err))
  }, [])

  const emptyTrash = useCallback(() => {
    setMemos(prev => {
      const toDelete = prev.filter(m => m.deletedAt).map(m => m.id)
      if (toDelete.length > 0) {
        bulkDelete(toDelete).catch(err => console.error('bulk delete failed', err))
      }
      return prev.filter(m => !m.deletedAt)
    })
  }, [])

  const setColor = useCallback(
    (id: string, color: MemoColor) => {
      updateMemo(id, { color })
    },
    [updateMemo],
  )

  return {
    memos,
    loaded,
    createMemo,
    updateMemo,
    moveToTrash,
    restore,
    permaDelete,
    emptyTrash,
    setColor,
  }
}
