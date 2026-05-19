type Props = {
  value: string
  onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
}

export default function SearchBar({ value, onChange, inputRef }: Props) {
  return (
    <div className="relative shrink-0">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40 text-sm pointer-events-none">
        🔍
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="검색  ( / )"
        className="w-56 pl-8 pr-3 py-1.5 rounded-md bg-white border border-black/10 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition"
      />
    </div>
  )
}
