import type { Memo } from './types'

export type SharePayload = {
  version: 1
  kind: 'board' | 'memo'
  createdAt: number
  memos: Memo[]
}

const BLOB_BASE = (import.meta.env.VITE_BLOB_BASE_URL as string | undefined)
  ?.trim()
  .replace(/\\n$/, '')
  .replace(/\/$/, '')
  || 'https://xzid9pf7saao6cmi.public.blob.vercel-storage.com'

export async function uploadShare(payload: SharePayload): Promise<string> {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let message = `업로드 실패 (HTTP ${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  const data = await res.json()
  if (!data?.id) throw new Error('서버 응답이 비어 있습니다')
  return data.id as string
}

export async function fetchShare(id: string): Promise<SharePayload> {
  const safe = id.replace(/[^a-z0-9]/gi, '')
  if (!safe) throw new Error('잘못된 공유 ID')
  const res = await fetch(`${BLOB_BASE}/shares/${safe}.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error('공유 데이터를 찾을 수 없습니다 (만료되었거나 잘못된 링크)')
  const data = await res.json()
  if (!data || data.version !== 1 || !Array.isArray(data.memos)) {
    throw new Error('공유 데이터 형식이 올바르지 않습니다')
  }
  return data as SharePayload
}

export function buildShareUrl(id: string): string {
  return `${window.location.origin}/?s=${encodeURIComponent(id)}`
}
