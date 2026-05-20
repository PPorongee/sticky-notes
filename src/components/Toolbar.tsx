import QuickInput from './QuickInput'
import SearchBar from './SearchBar'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onCreateEmpty: () => void
  onShareBoard: () => void
  shareDisabled?: boolean
  searchRef: React.RefObject<HTMLInputElement>
}

export default function Toolbar({
  query,
  onQueryChange,
  onCreateEmpty,
  onShareBoard,
  shareDisabled,
  searchRef,
}: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-white/70 backdrop-blur border-b border-black/10">
      <div className="text-lg font-semibold text-black/85 mr-2 shrink-0 flex items-center gap-1.5">
        <span>📋</span>
        <span>포스트잇 보드</span>
      </div>
      <QuickInput onCreate={onCreateEmpty} />
      <SearchBar value={query} onChange={onQueryChange} inputRef={searchRef} />
      <button
        type="button"
        onClick={onShareBoard}
        disabled={shareDisabled}
        className="shrink-0 px-3 py-1.5 rounded-md bg-white border border-black/10 text-sm font-medium hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-black/10 transition flex items-center gap-1.5"
        title="현재 보드의 모든 메모를 공유 링크로 만듭니다"
      >
        <span>🔗</span>
        <span>보드 공유</span>
      </button>
    </div>
  )
}
