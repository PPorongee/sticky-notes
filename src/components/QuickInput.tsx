type Props = {
  onCreate: () => void
}

export default function QuickInput({ onCreate }: Props) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex-1 max-w-xl px-3 py-1.5 rounded-md bg-white border border-black/10 text-sm text-left text-black/45 hover:text-black/80 hover:border-amber-400 hover:bg-amber-50 transition flex items-center gap-2"
      title="새 빈 메모를 만들고 바로 작성합니다 (단축키: N)"
    >
      <span className="text-base leading-none">✏️</span>
      <span>새 메모 작성하기...</span>
    </button>
  )
}
