import { useEffect, useRef, useState } from 'react'
import type { Memo } from '../types'
import { COLOR_HEX } from '../utils'

type Box = { x: number; y: number; w: number; h: number }

type Props = {
  memo: Memo
  onClose: () => void
  /** 메모 patch 저장 콜백. 텍스트 편집·이미지 첨부 제거 등에 사용. */
  onUpdate?: (updates: Partial<Memo>) => void
  /** 이미지 위에서 드래그가 끝났을 때 호출. 호출되면 부모가 OCR 모달로 전환한다. */
  onOcrRequest?: (naturalBox: Box) => void
}

export default function MemoModal({ memo, onClose, onUpdate, onOcrRequest }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ startX: number; startY: number } | null>(null)
  const boxRef = useRef<Box | null>(null)
  const [dragBox, setDragBox] = useState<Box | null>(null)
  const [text, setText] = useState(memo.content)
  const textRef = useRef(text)
  textRef.current = text

  useEffect(() => {
    setText(memo.content)
  }, [memo.content])

  // 모달 닫힐 때 변경사항 자동 저장
  useEffect(() => {
    return () => {
      if (onUpdate && textRef.current !== memo.content) {
        onUpdate({ content: textRef.current })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!onOcrRequest || !imgRef.current) return
    if (e.button !== 0) return
    e.preventDefault()
    const rect = imgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    dragRef.current = { startX: x, startY: y }
    const empty = { x, y, w: 0, h: 0 }
    boxRef.current = empty
    setDragBox(empty)
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

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current || !imgRef.current) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    dragRef.current = null
    const box = boxRef.current
    boxRef.current = null
    setDragBox(null)
    if (!box || box.w < 6 || box.h < 6) return
    if (!onOcrRequest) return
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height
    onOcrRequest({
      x: box.x * scaleX,
      y: box.y * scaleY,
      w: box.w * scaleX,
      h: box.h * scaleY,
    })
  }

  const isLink = memo.type === 'link'
  const isImage = memo.type === 'image'
  const editable = !isImage && !isLink && !!onUpdate

  const commitText = () => {
    if (!onUpdate) return
    if (text !== memo.content) onUpdate({ content: text })
  }

  const removeAttachedImage = (index: number) => {
    if (!onUpdate) return
    const next = (memo.images ?? []).filter((_, i) => i !== index)
    onUpdate({ images: next })
  }

  const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      commitText()
      onClose()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      commitText()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-toast-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-[92vw] max-h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: COLOR_HEX[memo.color] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/10 bg-black/5">
          <span className="text-xs text-black/55">
            {new Date(memo.updatedAt).toLocaleString('ko-KR')}
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-black/10 text-black/60 hover:text-black text-xl leading-none flex items-center justify-center"
            title="닫기 (Esc)"
          >
            ×
          </button>
        </div>

        <div className="overflow-auto p-6 flex flex-col items-center gap-4">
          {memo.type === 'image' ? (
            <div className="relative inline-block max-w-full">
              <img
                ref={imgRef}
                src={memo.content}
                alt=""
                className="max-w-[88vw] max-h-[80vh] block rounded select-none"
                draggable={false}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }}
              />
              {dragBox && dragBox.w > 0 && dragBox.h > 0 && (
                <div
                  className="absolute border-2 border-amber-500 bg-amber-300/25 pointer-events-none rounded-sm"
                  style={{
                    left: dragBox.x,
                    top: dragBox.y,
                    width: dragBox.w,
                    height: dragBox.h,
                  }}
                />
              )}
            </div>
          ) : isLink ? (
            <a
              href={memo.content.trim()}
              target="_blank"
              rel="noreferrer"
              className="text-xl text-blue-700 underline break-all max-w-[80ch]"
            >
              🔗 {memo.content}
            </a>
          ) : editable ? (
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onBlur={commitText}
              onKeyDown={handleTextKeyDown}
              autoFocus
              className="text-base leading-relaxed text-black/90 whitespace-pre-wrap break-words w-[min(80ch,86vw)] min-w-[280px] min-h-[40vh] max-h-[72vh] bg-transparent outline-none resize-none p-3 rounded-md border border-black/10 focus:border-black/30 transition placeholder:text-black/30 placeholder:italic"
              placeholder="메모 내용을 입력하세요... (Esc 또는 Ctrl+Enter 로 저장 후 닫기)"
            />
          ) : (
            <div className="text-base leading-relaxed text-black/90 whitespace-pre-wrap break-words max-w-[80ch] min-w-[280px]">
              {memo.content || (
                <span className="text-black/30 italic">빈 메모</span>
              )}
            </div>
          )}

          {memo.images && memo.images.length > 0 && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              {memo.images.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt=""
                    className="w-full max-h-[50vh] object-contain rounded border border-black/10 bg-black/5 block"
                    draggable={false}
                  />
                  {onUpdate && (
                    <button
                      onClick={() => removeAttachedImage(i)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/55 hover:bg-black/80 text-white text-lg leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      title="이 이미지 첨부 제거"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-black/10 bg-black/5 text-[11px] text-black/45 text-center">
          배경 클릭 또는 Esc 로 닫기
        </div>
      </div>
    </div>
  )
}
