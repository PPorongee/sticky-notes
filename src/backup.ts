import type { Memo } from './types'

// 보드 전체를 사용자 컴퓨터에 .json 파일로 내려받고, 다시 읽어 복원한다.
// 브라우저 저장소가 비워져도 이 파일만 있으면 메모를 되살릴 수 있는 최후의 보루.

export type BackupFile = {
  app: 'sticky-notes'
  version: 1
  exportedAt: number
  memos: Memo[]
}

export function downloadBackup(memos: Memo[]): void {
  const data: BackupFile = {
    app: 'sticky-notes',
    version: 1,
    exportedAt: Date.now(),
    memos,
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const a = document.createElement('a')
  a.href = url
  a.download = `sticky-notes-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 백업 파일(또는 공유 페이로드)을 파싱해 유효한 메모 배열을 돌려준다.
export function parseBackup(text: string): Memo[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다')
  }
  const raw = Array.isArray(data)
    ? data
    : (data as { memos?: unknown })?.memos
  if (!Array.isArray(raw)) {
    throw new Error('백업 파일 형식이 올바르지 않습니다')
  }
  const memos = raw.filter(
    (m): m is Memo =>
      !!m &&
      typeof (m as Memo).id === 'string' &&
      typeof (m as Memo).content === 'string' &&
      typeof (m as Memo).type === 'string',
  )
  if (memos.length === 0) {
    throw new Error('복원할 메모가 없습니다')
  }
  return memos
}
