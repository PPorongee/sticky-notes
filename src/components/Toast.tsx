import { useEffect } from 'react'

type Props = {
  message: string
  actionLabel?: string
  onAction?: () => void
  onClose: () => void
  duration?: number
}

export default function Toast({
  message,
  actionLabel,
  onAction,
  onClose,
  duration = 5000,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-3 bg-black/90 text-white text-sm rounded-lg shadow-xl backdrop-blur animate-toast-in">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3 py-1 rounded bg-amber-400 text-black font-semibold hover:bg-amber-300 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
