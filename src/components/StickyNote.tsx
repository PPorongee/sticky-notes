import { useEffect, useMemo, useRef, useState } from 'react'
import type { Memo, MemoColor } from '../types'
import { COLORS, COLOR_HEX, COLOR_LABEL, isUrl } from '../utils'

type Props = {
  memo: Memo
  selected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Memo>) => void
  onColorChange: (color: MemoColor) => void
  onDelete: () => void
  onExpand: () => void
  onShare: () => void
  onDragStart: () => void
  onDragMove: (clientX: number, clientY: number) => void
  onDragEnd: () => void
  checkTrashHit: (clientX: number, clientY: number) => boolean
}

export default function StickyNote({
  memo,
  selected,
  onSelect,
  onUpdate,
  onColorChange,
  onDelete,
  onExpand,
  onShare,
  onDragStart,
  onDragMove,
  onDragEnd,
  checkTrashHit,
}: Props) {
  const isTextLike = memo.type !== 'image'
  const [editing, setEditing] = useState(isTextLike && memo.content === '')
  const [text, setText] = useState(memo.content)
  const [pos, setPos] = useState({ x: memo.x, y: memo.y })
  const [dragging, setDragging] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const dragRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
    moved: boolean
  } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const rotation = useMemo(
    () => ((parseInt(memo.id.slice(0, 4), 36) || 0) % 7) - 3,
    [memo.id],
  )

  const headerSummary = isTextLike ? text.split('\n')[0].trim() : ''

  useEffect(() => {
    setPos({ x: memo.x, y: memo.y })
  }, [memo.x, memo.y])

  useEffect(() => {
    setText(memo.content)
  }, [memo.content])

  useEffect(() => {
    if (editing) {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        const len = ta.value.length
        ta.setSelectionRange(len, len)
      }
    }
  }, [editing])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editing) return
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-no-drag]')) return

    e.preventDefault()
    e.stopPropagation()
    onSelect()

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    }

    // window 레벨에 listener를 달면 자식 re-render나 메모 밖으로 마우스가 나가도 절대 끊기지 않는다
    const onMove = (ev: PointerEvent) => {
      const s = dragRef.current
      if (!s) return
      const dx = ev.clientX - s.startX
      const dy = ev.clientY - s.startY
      if (!s.moved && Math.hypot(dx, dy) > 5) {
        s.moved = true
        setDragging(true)
        onDragStart()
      }
      if (s.moved) {
        setPos({ x: s.origX + dx, y: s.origY + dy })
        onDragMove(ev.clientX, ev.clientY)
      }
    }

    const finish = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const s = dragRef.current
      if (!s) return
      dragRef.current = null
      if (s.moved) {
        const finalX = s.origX + (ev.clientX - s.startX)
        const finalY = s.origY + (ev.clientY - s.startY)
        const hitTrash = checkTrashHit(ev.clientX, ev.clientY)
        setDragging(false)
        onDragEnd()
        if (hitTrash) {
          onDelete()
        } else {
          onUpdate({ x: finalX, y: finalY })
        }
      } else {
        // 움직임 없는 클릭은 메모 종류와 무관하게 확대 모달
        onExpand()
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  const commitEdit = () => {
    setEditing(false)
    if (text !== memo.content) {
      onUpdate({ content: text })
    }
  }

  const handleEditKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setText(memo.content)
      setEditing(false)
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      commitEdit()
    }
    e.stopPropagation()
  }

  const bg = COLOR_HEX[memo.color]
  const showsAsLink = !editing && (memo.type === 'link' || isUrl(memo.content))

  return (
    <div
      className={`absolute select-none rounded-[2px] ${
        dragging
          ? 'shadow-note-drag z-50'
          : selected
            ? 'shadow-note-hover z-20 ring-2 ring-amber-300'
            : 'shadow-note z-10 hover:shadow-note-hover'
      }`}
      style={{
        left: pos.x,
        top: pos.y,
        width: memo.width ?? 220,
        minHeight: memo.height ?? (memo.type === 'image' ? 80 : 180),
        background: bg,
        transform: `rotate(${dragging ? 0 : rotation}deg)${dragging ? ' scale(1.03)' : ''}`,
        transition: dragging ? 'none' : 'transform 140ms ease, box-shadow 140ms ease',
        cursor: editing ? 'text' : dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onClick={e => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <div
        className="flex items-center gap-2 px-2 pt-1.5"
        data-no-drag
      >
        <div className="relative shrink-0">
          <button
            className="w-4 h-4 rounded-full border border-black/20 hover:scale-110 transition-transform"
            style={{ background: bg }}
            onClick={e => {
              e.stopPropagation()
              setShowColors(v => !v)
            }}
            title="색상 변경"
          />
          {showColors && (
            <div
              className="absolute top-6 left-0 flex gap-1.5 bg-white/95 backdrop-blur p-1.5 rounded-md shadow-lg z-50 border border-black/10"
              onClick={e => e.stopPropagation()}
            >
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded-full border ${memo.color === c ? 'border-black/60 ring-2 ring-amber-300' : 'border-black/15'} hover:scale-110 transition-transform`}
                  style={{ background: COLOR_HEX[c] }}
                  title={COLOR_LABEL[c]}
                  onClick={e => {
                    e.stopPropagation()
                    onColorChange(c)
                    setShowColors(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {isTextLike && (
          <div
            className="flex-1 min-w-0 text-[11px] leading-tight text-black/55 truncate font-medium"
            title={headerSummary}
          >
            {headerSummary || (
              <span className="text-black/25 italic">빈 메모</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-0.5 shrink-0 ml-auto">
          <button
            className="text-black/40 hover:text-black hover:bg-black/5 rounded w-5 h-5 leading-none text-xs flex items-center justify-center"
            onClick={e => {
              e.stopPropagation()
              onShare()
            }}
            title="이 메모를 공유 링크로 만들기"
          >
            🔗
          </button>
          <button
            className="text-black/40 hover:text-black hover:bg-black/5 rounded w-5 h-5 leading-none text-lg flex items-center justify-center"
            onClick={e => {
              e.stopPropagation()
              onDelete()
            }}
            title="휴지통으로 보내기"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pt-1">
        {memo.type === 'image' ? (
          <img
            src={memo.content}
            alt=""
            className="max-w-full max-h-[420px] rounded block select-none pointer-events-none"
            draggable={false}
          />
        ) : editing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKey}
            data-no-drag
            className="w-full min-h-[150px] resize-none bg-transparent outline-none text-sm font-medium text-black/85 leading-relaxed"
            placeholder="메모 내용을 입력하세요... (Esc 또는 Ctrl+Enter로 저장)"
          />
        ) : showsAsLink ? (
          <a
            href={memo.content.trim()}
            target="_blank"
            rel="noreferrer"
            data-no-drag
            className="block text-sm font-medium text-blue-700 underline break-all max-h-[300px] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            🔗 {memo.content}
          </a>
        ) : (
          <div className="text-sm font-medium text-black/85 whitespace-pre-wrap break-words leading-relaxed max-h-[300px] overflow-auto">
            {memo.content || (
              <span className="text-black/30 italic">
                빈 메모 (클릭해서 편집)
              </span>
            )}
          </div>
        )}

        {memo.images && memo.images.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {memo.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="w-full max-h-[120px] object-cover rounded border border-black/10 pointer-events-none select-none"
                draggable={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
