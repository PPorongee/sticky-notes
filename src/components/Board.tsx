import StickyNote from './StickyNote'
import type { Memo, MemoColor } from '../types'

type Props = {
  memos: Memo[]
  query: string
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdate: (id: string, updates: Partial<Memo>) => void
  onColorChange: (id: string, color: MemoColor) => void
  onDelete: (id: string) => void
  onExpand: (id: string) => void
  onShare: (id: string) => void
  onDragStart: (id: string) => void
  onDragMove: (pt: { x: number; y: number }) => void
  onDragEnd: () => void
}

function checkTrashHit(x: number, y: number): boolean {
  const el = document.getElementById('trash-bin')
  if (!el) return false
  const r = el.getBoundingClientRect()
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

export default function Board({
  memos,
  query,
  selectedId,
  onSelect,
  onUpdate,
  onColorChange,
  onDelete,
  onExpand,
  onShare,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const q = query.trim().toLowerCase()
  const isFiltering = q.length > 0
  const matches = (m: Memo) =>
    m.type === 'image' ? false : m.content.toLowerCase().includes(q)

  const visible = isFiltering ? memos.filter(matches) : memos

  return (
    <div
      className="absolute inset-0 board-bg"
      onClick={() => onSelect(null)}
    >
      {memos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-black/45 max-w-md px-6">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-medium leading-relaxed">
              복사한 텍스트나 캡처한 이미지를{' '}
              <kbd className="px-1.5 py-0.5 bg-white/80 rounded text-sm border border-black/10">
                Ctrl+V
              </kbd>
              로 붙여보세요.
            </p>
            <p className="text-base mt-2">포스트잇처럼 바로 메모가 만들어집니다.</p>
            <p className="text-sm mt-6 text-black/35">
              <kbd className="px-1.5 py-0.5 bg-white/80 rounded text-xs border border-black/10">
                N
              </kbd>{' '}
              새 메모 ·{' '}
              <kbd className="px-1.5 py-0.5 bg-white/80 rounded text-xs border border-black/10">
                /
              </kbd>{' '}
              검색
            </p>
          </div>
        </div>
      )}

      {isFiltering && visible.length === 0 && memos.length > 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none text-sm text-black/40">
          “{query}”에 해당하는 메모가 없습니다.
        </div>
      )}

      {visible.map(m => (
        <StickyNote
          key={m.id}
          memo={m}
          selected={selectedId === m.id}
          onSelect={() => onSelect(m.id)}
          onUpdate={updates => onUpdate(m.id, updates)}
          onColorChange={c => onColorChange(m.id, c)}
          onDelete={() => onDelete(m.id)}
          onExpand={() => onExpand(m.id)}
          onShare={() => onShare(m.id)}
          onDragStart={() => onDragStart(m.id)}
          onDragMove={(x, y) => onDragMove({ x, y })}
          onDragEnd={() => onDragEnd()}
          checkTrashHit={checkTrashHit}
        />
      ))}
    </div>
  )
}
