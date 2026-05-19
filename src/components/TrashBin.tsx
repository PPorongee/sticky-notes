import { useEffect, useRef, useState } from 'react'

type Props = {
  active: boolean
  pointer: { x: number; y: number } | null
  count: number
  onOpen: () => void
}

export default function TrashBin({ active, pointer, count, onOpen }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!active || !pointer || !ref.current) {
      if (hover) setHover(false)
      return
    }
    const r = ref.current.getBoundingClientRect()
    const inside =
      pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom
    setHover(inside)
  }, [active, pointer, hover])

  const baseClasses =
    'absolute bottom-6 right-6 z-30 flex items-center justify-center rounded-full cursor-pointer shadow-lg transition-all duration-150 select-none'
  const stateClasses = active
    ? hover
      ? 'w-24 h-24 bg-red-500 text-white scale-110 ring-4 ring-red-200'
      : 'w-20 h-20 bg-red-100 text-red-700 scale-105'
    : 'w-14 h-14 bg-white/85 backdrop-blur text-black/65 hover:bg-white border border-black/10'

  return (
    <div
      id="trash-bin"
      ref={ref}
      onClick={onOpen}
      className={`${baseClasses} ${stateClasses}`}
      title={active ? '여기로 드롭하면 휴지통으로 이동' : '휴지통 열기'}
    >
      <span className={active ? 'text-3xl' : 'text-2xl'}>🗑️</span>
      {!active && count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[11px] font-semibold rounded-full flex items-center justify-center shadow">
          {count}
        </span>
      )}
    </div>
  )
}
