import { useEffect, useRef, useState } from 'react'
import type { SharePayload } from '../share'
import { buildShareUrl, uploadShare } from '../share'

type Props = {
  payload: SharePayload
  title: string
  onClose: () => void
}

export default function ShareModal({ payload, title, onClose }: Props) {
  const [status, setStatus] = useState<'uploading' | 'done' | 'error'>('uploading')
  const [shareUrl, setShareUrl] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    let cancelled = false
    uploadShare(payload)
      .then(id => {
        if (cancelled) return
        setShareUrl(buildShareUrl(id))
        setStatus('done')
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '업로드 실패')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [payload])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('copy failed', err)
    }
  }

  const memoCount = payload.memos.length
  const hasImages = payload.memos.some(
    m => m.type === 'image' || (m.images && m.images.length > 0),
  )

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-toast-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[min(560px,94vw)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 bg-gray-50">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <span>🔗</span>
            <span>{title}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-black/10 text-black/60 hover:text-black text-xl leading-none flex items-center justify-center"
            title="닫기 (Esc)"
          >
            ×
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="text-xs text-black/55">
            {memoCount}개 메모 {hasImages && '· 이미지 포함'} · 공유 링크를 받은 사람은 누구나 미리보기 후
            자기 보드에 가져갈 수 있습니다.
          </div>

          {status === 'uploading' && (
            <div className="py-6 text-center text-black/60">
              <div className="inline-block w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
              <div className="text-sm">업로드 중...</div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-md p-3 text-sm">
              <div className="font-medium mb-1">업로드 실패</div>
              <div className="text-xs whitespace-pre-wrap break-words">{error}</div>
            </div>
          )}

          {status === 'done' && (
            <>
              <label className="text-xs text-black/55">공유 링크</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={e => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-3 py-2 rounded-md border border-black/15 text-sm bg-gray-50 font-mono outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-md bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm whitespace-nowrap transition-colors"
                >
                  {copied ? '✓ 복사됨' : '📋 복사'}
                </button>
              </div>
              <div className="text-xs text-black/45">
                링크를 받은 사람이 열면 메모 미리보기 후 “내 보드에 추가” 버튼으로 가져갈 수 있습니다.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
