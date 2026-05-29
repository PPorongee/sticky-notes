import { useRef } from 'react'
import QuickInput from './QuickInput'
import SearchBar from './SearchBar'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onCreateEmpty: () => void
  onShareBoard: () => void
  shareDisabled?: boolean
  onDownloadBackup: () => void
  onRestoreBackup: (file: File) => void
  backupDisabled?: boolean
  searchRef: React.RefObject<HTMLInputElement>
}

export default function Toolbar({
  query,
  onQueryChange,
  onCreateEmpty,
  onShareBoard,
  shareDisabled,
  onDownloadBackup,
  onRestoreBackup,
  backupDisabled,
  searchRef,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onRestoreBackup(file)
    e.target.value = '' // 같은 파일을 다시 골라도 onChange가 다시 발생하도록 초기화
  }

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
      <button
        type="button"
        onClick={onDownloadBackup}
        disabled={backupDisabled}
        className="shrink-0 px-3 py-1.5 rounded-md bg-white border border-black/10 text-sm font-medium hover:border-amber-400 hover:bg-amber-50 disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-black/10 transition flex items-center gap-1.5"
        title="모든 메모를 내 컴퓨터에 .json 파일로 저장합니다 (백업)"
      >
        <span>💾</span>
        <span>백업 저장</span>
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="shrink-0 px-3 py-1.5 rounded-md bg-white border border-black/10 text-sm font-medium hover:border-amber-400 hover:bg-amber-50 transition flex items-center gap-1.5"
        title="백업한 .json 파일에서 메모를 되살립니다"
      >
        <span>📂</span>
        <span>불러오기</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
