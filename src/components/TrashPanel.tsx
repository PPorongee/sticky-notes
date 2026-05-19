import type { Memo } from '../types'
import { isUrl } from '../utils'

type Props = {
  memos: Memo[]
  onClose: () => void
  onRestore: (id: string) => void
  onPermaDelete: (id: string) => void
  onEmpty: () => void
}

export default function TrashPanel({
  memos,
  onClose,
  onRestore,
  onPermaDelete,
  onEmpty,
}: Props) {
  const confirmPerma = (id: string) => {
    if (window.confirm('이 메모를 영구 삭제하시겠습니까?')) {
      onPermaDelete(id)
    }
  }
  const confirmEmpty = () => {
    if (memos.length === 0) return
    if (window.confirm(`휴지통의 메모 ${memos.length}개를 영구 삭제하시겠습니까?`)) {
      onEmpty()
    }
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-40 flex flex-col border-l border-black/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <span>🗑️</span>
          <span>휴지통</span>
          <span className="text-black/40 text-sm font-normal">({memos.length})</span>
        </h2>
        <button
          onClick={onClose}
          className="text-black/50 hover:text-black hover:bg-black/5 rounded w-7 h-7 flex items-center justify-center text-xl leading-none"
          title="닫기"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {memos.length === 0 && (
          <p className="text-sm text-black/40 text-center mt-12">
            휴지통이 비어 있습니다.
          </p>
        )}
        {memos.map(m => (
          <div
            key={m.id}
            className="p-3 rounded-md border border-black/10 bg-gray-50 hover:bg-white transition-colors"
          >
            <div className="text-sm text-black/80 mb-2 break-words max-h-32 overflow-hidden">
              {m.type === 'image' ? (
                <img src={m.content} alt="" className="max-h-24 rounded" />
              ) : isUrl(m.content) ? (
                <span className="text-blue-700 break-all line-clamp-3">
                  🔗 {m.content}
                </span>
              ) : (
                <span className="line-clamp-4">
                  {m.content || (
                    <span className="text-black/30 italic">빈 메모</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => onRestore(m.id)}
                className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium transition-colors"
              >
                복원
              </button>
              <button
                onClick={() => confirmPerma(m.id)}
                className="px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium transition-colors"
              >
                영구 삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-black/10">
        <button
          onClick={confirmEmpty}
          disabled={memos.length === 0}
          className="w-full py-2 rounded-md bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-black/40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          휴지통 비우기
        </button>
      </div>
    </div>
  )
}
