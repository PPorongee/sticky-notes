import QuickInput from './QuickInput'
import SearchBar from './SearchBar'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onCreateEmpty: () => void
  searchRef: React.RefObject<HTMLInputElement>
}

export default function Toolbar({ query, onQueryChange, onCreateEmpty, searchRef }: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-2.5 bg-white/70 backdrop-blur border-b border-black/10">
      <div className="text-lg font-semibold text-black/85 mr-2 shrink-0 flex items-center gap-1.5">
        <span>📋</span>
        <span>포스트잇 보드</span>
      </div>
      <QuickInput onCreate={onCreateEmpty} />
      <SearchBar value={query} onChange={onQueryChange} inputRef={searchRef} />
    </div>
  )
}
