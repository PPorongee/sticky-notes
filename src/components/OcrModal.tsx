import { useEffect, useRef, useState } from 'react'
import type { Memo } from '../types'
import { recognizeText } from '../ocr'

type Props = {
  memo: Memo
  onClose: () => void
  /** 모달이 열릴 때 미리 인식할 영역 (원본 이미지 좌표) */
  initialNaturalBox?: Box | null
}

type Box = { x: number; y: number; w: number; h: number }

function translateStatus(s: string): string {
  const low = s.toLowerCase()
  if (low.includes('loading language')) return '언어 데이터 다운로드 중...'
  if (low.includes('initializing tesseract')) return 'OCR 엔진 초기화 중...'
  if (low.includes('initializing api')) return '엔진 준비 중...'
  if (low.includes('recognizing text')) return '텍스트 인식 중...'
  if (low.includes('loading core')) return '엔진 로딩 중...'
  if (low.includes('loading tesseract')) return '엔진 로딩 중...'
  return s || '처리 중...'
}

async function cropDataUrl(srcDataUrl: string, box: Box): Promise<string> {
  const img = new Image()
  img.src = srcDataUrl
  await img.decode()
  const sx = Math.max(0, Math.floor(box.x))
  const sy = Math.max(0, Math.floor(box.y))
  const sw = Math.min(img.naturalWidth - sx, Math.floor(box.w))
  const sh = Math.min(img.naturalHeight - sy, Math.floor(box.h))
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return canvas.toDataURL('image/png')
}

export default function OcrModal({
  memo,
  onClose,
  initialNaturalBox,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [statusText, setStatusText] = useState('')
  const [progress, setProgress] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragBox, setDragBox] = useState<Box | null>(null)
  const [selection, setSelection] = useState<Box | null>(null) // in display coords
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ startX: number; startY: number } | null>(null)
  const boxRef = useRef<Box | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const beginRun = () => {
    setStatus('loading')
    setStatusText('이미지 자르는 중...')
    setProgress(0)
    setText('')
    setError('')
  }

  const runOcrNatural = async (naturalBox: Box) => {
    beginRun()
    try {
      const cropped = await cropDataUrl(memo.content, naturalBox)
      const result = await recognizeText(cropped, p => {
        setStatusText(translateStatus(p.status))
        setProgress(p.progress)
      })
      setText(result.trim())
      setStatus('done')
    } catch (err) {
      console.error('OCR failed', err)
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const displayToNatural = (displayBox: Box): Box | null => {
    if (!imgRef.current) return null
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height
    return {
      x: displayBox.x * scaleX,
      y: displayBox.y * scaleY,
      w: displayBox.w * scaleX,
      h: displayBox.h * scaleY,
    }
  }

  const naturalToDisplay = (naturalBox: Box): Box | null => {
    if (!imgRef.current) return null
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    if (img.naturalWidth === 0 || img.naturalHeight === 0) return null
    const scaleX = rect.width / img.naturalWidth
    const scaleY = rect.height / img.naturalHeight
    return {
      x: naturalBox.x * scaleX,
      y: naturalBox.y * scaleY,
      w: naturalBox.w * scaleX,
      h: naturalBox.h * scaleY,
    }
  }

  const runOcr = async (displayBox: Box) => {
    const nb = displayToNatural(displayBox)
    if (!nb) return
    await runOcrNatural(nb)
  }

  // initialNaturalBox 가 있으면 마운트 시 자동으로 인식
  const initialRef = useRef(false)
  useEffect(() => {
    if (initialRef.current) return
    if (!initialNaturalBox) return
    initialRef.current = true
    void runOcrNatural(initialNaturalBox)
    // 이미지가 로드된 뒤에야 표시 좌표 계산이 가능하므로, 로드를 기다림
    const tryDraw = () => {
      const disp = naturalToDisplay(initialNaturalBox)
      if (disp) {
        setSelection(disp)
        return true
      }
      return false
    }
    if (!tryDraw()) {
      // 이미지 로드 핸들러에서 다시 시도
      const interval = window.setInterval(() => {
        if (tryDraw()) window.clearInterval(interval)
      }, 80)
      window.setTimeout(() => window.clearInterval(interval), 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (status === 'loading') return
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    dragRef.current = { startX: x, startY: y }
    const empty = { x, y, w: 0, h: 0 }
    boxRef.current = empty
    setDragBox(empty)
    setSelection(null)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current || !imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const curX = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const curY = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    const x = Math.min(dragRef.current.startX, curX)
    const y = Math.min(dragRef.current.startY, curY)
    const w = Math.abs(curX - dragRef.current.startX)
    const h = Math.abs(curY - dragRef.current.startY)
    const box = { x, y, w, h }
    boxRef.current = box
    setDragBox(box)
  }

  const handlePointerUp = async (e: React.PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    dragRef.current = null
    const box = boxRef.current
    boxRef.current = null
    setDragBox(null)
    if (!box || box.w < 6 || box.h < 6) return // 너무 작으면 무시
    setSelection(box)
    await runOcr(box)
  }

  const handleFullImage = async () => {
    if (!imgRef.current || status === 'loading') return
    const rect = imgRef.current.getBoundingClientRect()
    const box: Box = { x: 0, y: 0, w: rect.width, h: rect.height }
    setSelection(box)
    await runOcr(box)
  }

  const reset = () => {
    setSelection(null)
    setText('')
    setStatus('idle')
    setStatusText('')
    setProgress(0)
    setError('')
  }

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('copy failed', err)
    }
  }

  const visibleBox = dragBox ?? selection

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-modal-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[min(900px,94vw)] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/10 bg-gray-50">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <span>🔍</span>
            <span>이미지 텍스트 추출</span>
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-black/10 text-black/60 hover:text-black text-xl leading-none flex items-center justify-center"
            title="닫기 (Esc)"
          >
            ×
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3 flex-1 overflow-auto">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-black/65">
            <p>
              이미지 위에서 <strong>드래그</strong>로 영역을 선택하면 그 부분만 인식됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleFullImage}
                disabled={status === 'loading'}
                className="underline text-blue-700 hover:text-blue-900 disabled:text-black/30 disabled:no-underline"
              >
                전체 인식
              </button>
              {(selection || status !== 'idle') && (
                <button
                  onClick={reset}
                  disabled={status === 'loading'}
                  className="underline text-black/55 hover:text-black disabled:text-black/30 disabled:no-underline"
                >
                  선택 해제
                </button>
              )}
            </div>
          </div>

          <div className="relative inline-block self-center max-w-full">
            <img
              ref={imgRef}
              src={memo.content}
              alt=""
              className="block max-w-full max-h-[55vh] rounded border border-black/10 select-none bg-gray-50"
              draggable={false}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                cursor: status === 'loading' ? 'wait' : 'crosshair',
                touchAction: 'none',
              }}
            />
            {visibleBox && visibleBox.w > 0 && visibleBox.h > 0 && (
              <div
                className="absolute border-2 border-amber-500 bg-amber-300/25 pointer-events-none rounded-sm"
                style={{
                  left: visibleBox.x,
                  top: visibleBox.y,
                  width: visibleBox.w,
                  height: visibleBox.h,
                }}
              />
            )}
          </div>

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-2 text-sm text-black/65 py-2">
              <div className="font-medium">{statusText}</div>
              <div className="w-full max-w-xs h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="text-xs text-black/45 tabular-nums">
                {Math.round(progress * 100)}%
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-600 text-sm">
              <p className="font-medium">인식 중 오류가 발생했습니다.</p>
              <pre className="text-xs whitespace-pre-wrap bg-red-50 p-2 rounded border border-red-200 max-h-32 overflow-auto mt-1">
                {error}
              </pre>
            </div>
          )}

          {status === 'done' && (
            <>
              <label className="text-xs text-black/55">
                인식된 텍스트 (직접 수정 후 복사/메모 변환 가능)
              </label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                className="w-full min-h-[140px] p-3 rounded-md border border-black/15 text-sm font-medium leading-relaxed resize-none outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition"
                placeholder="이 영역에서 인식된 텍스트가 없습니다."
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleCopy}
                  disabled={!text}
                  className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 disabled:bg-gray-200 disabled:text-black/40 text-black font-semibold text-sm transition-colors"
                >
                  {copied ? '✓ 복사됨' : '📋 클립보드에 복사'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
