import { useEffect, useState } from 'react'
import type { Memo } from '../types'
import type { SharePayload } from '../share'
import { fetchShare } from '../share'
import { COLOR_HEX } from '../utils'

type Props = {
  shareId: string
  onClose: () => void
  onImport: (memos: Memo[]) => void
}

export default function ImportPreview({ shareId, onClose, onImport }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchShare(shareId)
      .then(data => {
        if (cancelled) return
        setPayload(data)
        setStatus('ready')
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '불러오기 실패')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [shareId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleImport = () => {
    if (!payload) return
    onImport(payload.memos)
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-modal-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[min(720px,94vw)] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 bg-gray-50">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <span>📥</span>
            <span>공유받은 메모 미리보기</span>
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-black/10 text-black/60 hover:text-black text-xl leading-none flex items-center justify-center"
            title="닫기 (Esc)"
          >
            ×
          </button>
        </div>

        <div className="overflow-auto p-5 flex-1">
          {status === 'loading' && (
            <div className="py-10 text-center text-black/60">
              <div className="inline-block w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-sm">불러오는 중...</div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
              <div className="font-medium mb-1">불러오기 실패</div>
              <div className="text-xs whitespace-pre-wrap break-words">{error}</div>
            </div>
          )}

          {status === 'ready' && payload && (
            <div className="flex flex-col gap-3">
              <div className="text-xs text-black/55">
                메모 {payload.memos.length}개 · 공유 생성:{' '}
                {new Date(payload.createdAt).toLocaleString('ko-KR')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {payload.memos.map(m => (
                  <div
                    key={m.id}
                    className="rounded-md border border-black/10 p-3 text-sm"
                    style={{ background: COLOR_HEX[m.color] }}
                  >
                    {m.type === 'image' ? (
                      <img
                        src={m.content}
                        alt=""
                        className="max-h-32 rounded mx-auto block"
                        draggable={false}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-black/85 max-h-32 overflow-hidden">
                        {m.content || (
                          <span className="text-black/30 italic">빈 메모</span>
                        )}
                      </div>
                    )}
                    {m.images && m.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.images.slice(0, 4).map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="w-12 h-12 object-cover rounded border border-black/10"
                            draggable={false}
                          />
                        ))}
                        {m.images.length > 4 && (
                          <span className="text-xs text-black/55 self-center">
                            +{m.images.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-black/10 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-white border border-black/15 hover:bg-gray-100 text-sm font-medium transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleImport}
            disabled={status !== 'ready'}
            className="px-4 py-2 rounded-md bg-amber-400 hover:bg-amber-300 disabled:bg-gray-200 disabled:text-black/40 text-black font-semibold text-sm transition-colors"
          >
            📥 내 보드에 추가
          </button>
        </div>
      </div>
    </div>
  )
}
