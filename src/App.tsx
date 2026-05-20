import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Board from './components/Board'
import Toolbar from './components/Toolbar'
import TrashBin from './components/TrashBin'
import TrashPanel from './components/TrashPanel'
import Toast from './components/Toast'
import MemoModal from './components/MemoModal'
import OcrModal from './components/OcrModal'
import ShareModal from './components/ShareModal'
import ImportPreview from './components/ImportPreview'
import { useMemoStore } from './store'
import { blobToDataUrl, detectType } from './utils'
import type { SharePayload } from './share'
import type { Memo } from './types'

function htmlClipboardToText(html: string): string {
  // <br>, 블록 요소 닫는 태그를 줄바꿈으로 치환한 뒤 textContent로 추출
  const normalized = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr|article|section)>/gi, '\n')
  const div = document.createElement('div')
  div.innerHTML = normalized
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

export default function App() {
  const store = useMemoStore()
  const [query, setQuery] = useState('')
  const [trashOpen, setTrashOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [ocrTargetId, setOcrTargetId] = useState<string | null>(null)
  const [ocrInitialBox, setOcrInitialBox] = useState<
    { x: number; y: number; w: number; h: number } | null
  >(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [sharePayload, setSharePayload] = useState<{ payload: SharePayload; title: string } | null>(
    null,
  )
  const [importId, setImportId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ key: number; message: string; onUndo: () => void } | null>(
    null,
  )
  const [dropping, setDropping] = useState(false)
  const dragCounter = useRef(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const active = useMemo(() => store.memos.filter(m => !m.deletedAt), [store.memos])
  const trashed = useMemo(
    () =>
      store.memos
        .filter(m => !!m.deletedAt)
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [store.memos],
  )

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const cd = e.clipboardData
      if (!cd) return

      const selected = selectedId
        ? store.memos.find(m => m.id === selectedId && !m.deletedAt)
        : null

      // 1) 이미지가 있으면 포커스 위치와 무관하게 무조건 처리
      const collectImageFile = (): File | null => {
        const items = cd.items
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.kind === 'file' && item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (file) return file
            }
          }
        }
        const files = cd.files
        if (files) {
          for (let i = 0; i < files.length; i++) {
            const f = files[i]
            if (f.type.startsWith('image/')) return f
          }
        }
        return null
      }

      const imageFile = collectImageFile()
      if (imageFile) {
        e.preventDefault()
        try {
          const dataUrl = await blobToDataUrl(imageFile)
          if (selected) {
            // 선택된 메모에 이미지 첨부
            store.updateMemo(selected.id, {
              images: [...(selected.images ?? []), dataUrl],
            })
          } else {
            store.createMemo({ type: 'image', content: dataUrl })
          }
        } catch (err) {
          console.error('image paste failed', err)
        }
        return
      }

      // 2) 텍스트는 input/textarea 안에서는 가로채지 않음
      const target = e.target as HTMLElement | null
      const inField =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (inField) return

      let text = cd.getData('text/plain') ?? ''
      const html = cd.getData('text/html')
      if (html) {
        const fromHtml = htmlClipboardToText(html)
        // HTML 쪽이 줄바꿈을 더 많이 보존했으면 그것을 사용 (워드/웹 등은 plain text를 한 줄로 평탄화하는 경우가 있음)
        const plainLines = text.split('\n').length
        const htmlLines = fromHtml.split('\n').length
        if (fromHtml && htmlLines > plainLines) text = fromHtml
      }
      if (text && text.trim()) {
        e.preventDefault()
        if (selected && (selected.type === 'text' || selected.type === 'link')) {
          // 선택된 텍스트/링크 메모 본문에 append
          const merged = selected.content ? `${selected.content}\n\n${text}` : text
          store.updateMemo(selected.id, {
            content: merged,
            type: detectType(merged),
          })
        } else {
          // 새 메모 (이미지 메모에 텍스트 paste한 경우 등 포함)
          store.createMemo({ type: detectType(text), content: text })
        }
      }
    },
    [store, selectedId],
  )

  useEffect(() => {
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const handleCreateEmpty = useCallback(() => {
    store.createMemo({ type: 'text', content: '' })
  }, [store])

  // ?s=<id> URL로 들어왔으면 import 흐름 시작
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const s = params.get('s')
    if (s) setImportId(s)
  }, [])

  const handleShareBoard = useCallback(() => {
    if (active.length === 0) return
    setSharePayload({
      payload: {
        version: 1,
        kind: 'board',
        createdAt: Date.now(),
        memos: active,
      },
      title: `보드 공유 (${active.length}개 메모)`,
    })
  }, [active])

  const handleShareMemo = useCallback(
    (id: string) => {
      const memo = active.find(m => m.id === id)
      if (!memo) return
      setSharePayload({
        payload: {
          version: 1,
          kind: 'memo',
          createdAt: Date.now(),
          memos: [memo],
        },
        title: '메모 공유',
      })
    },
    [active],
  )

  const handleImportMemos = useCallback(
    (memos: Memo[]) => {
      for (const m of memos) {
        store.createMemo({
          type: m.type,
          content: m.content,
          color: m.color,
          images: m.images,
          width: m.width,
          height: m.height,
        })
      }
      setImportId(null)
      // 주소창의 ?s=<id> 정리해서 새로고침 시 다시 import 모달이 안 뜨도록
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('s')
        window.history.replaceState({}, '', url.toString())
      }
    },
    [store],
  )

  const handleImportCancel = useCallback(() => {
    setImportId(null)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('s')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  const hasFiles = (dt: DataTransfer | null) =>
    !!dt && Array.from(dt.types).includes('Files')

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hasFiles(e.dataTransfer)) return
    e.preventDefault()
    dragCounter.current += 1
    setDropping(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!hasFiles(e.dataTransfer)) return
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDropping(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasFiles(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = async (e: React.DragEvent) => {
    const dt = e.dataTransfer
    if (!dt) return
    const files = Array.from(dt.files ?? [])
    if (files.length === 0) return

    e.preventDefault()
    dragCounter.current = 0
    setDropping(false)

    const baseX = e.clientX - 110
    const baseY = e.clientY - 60
    let offset = 0
    for (const f of files) {
      if (f.type.startsWith('image/')) {
        try {
          const dataUrl = await blobToDataUrl(f)
          store.createMemo({
            type: 'image',
            content: dataUrl,
            x: baseX + offset,
            y: baseY + offset,
          })
        } catch (err) {
          console.error('drop image failed', err)
        }
      } else if (f.type.startsWith('text/') || f.type === '' /* .md, .txt 등 */) {
        try {
          const text = await f.text()
          if (text.trim()) {
            store.createMemo({
              type: detectType(text),
              content: text,
              x: baseX + offset,
              y: baseY + offset,
            })
          }
        } catch (err) {
          console.error('drop text failed', err)
        }
      }
      offset += 24
    }
  }

  const handleDeleteWithToast = useCallback(
    (id: string) => {
      const memo = store.memos.find(m => m.id === id)
      if (!memo) return
      store.moveToTrash(id)
      setSelectedId(prev => (prev === id ? null : prev))
      setToast({
        key: Date.now(),
        message: '메모를 휴지통으로 옮겼습니다.',
        onUndo: () => {
          store.restore(id)
          setToast(null)
        },
      })
    },
    [store],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      // 모달이 열려 있을 때는 모달의 Esc 핸들러만 동작하도록 다른 단축키는 무시
      if (expandedId || ocrTargetId) {
        if (e.key === 'Escape') setSelectedId(null)
        return
      }

      if (e.key === '/' && !inField) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.key.toLowerCase() === 'n' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        store.createMemo({ type: 'text', content: '' })
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inField && selectedId) {
        e.preventDefault()
        handleDeleteWithToast(selectedId)
        return
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, selectedId, handleDeleteWithToast, expandedId, ocrTargetId])

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Board
        memos={active}
        query={query}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdate={store.updateMemo}
        onColorChange={store.setColor}
        onDelete={handleDeleteWithToast}
        onExpand={setExpandedId}
        onShare={handleShareMemo}
        onDragStart={setDraggingId}
        onDragMove={setPointer}
        onDragEnd={() => {
          setDraggingId(null)
          setPointer(null)
        }}
      />

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        onCreateEmpty={handleCreateEmpty}
        onShareBoard={handleShareBoard}
        shareDisabled={active.length === 0}
        searchRef={searchRef}
      />

      <TrashBin
        active={!!draggingId}
        pointer={pointer}
        count={trashed.length}
        onOpen={() => setTrashOpen(true)}
      />

      {trashOpen && (
        <TrashPanel
          memos={trashed}
          onClose={() => setTrashOpen(false)}
          onRestore={store.restore}
          onPermaDelete={store.permaDelete}
          onEmpty={store.emptyTrash}
        />
      )}

      {dropping && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center bg-amber-300/20 border-4 border-dashed border-amber-400">
          <div className="bg-white/95 backdrop-blur px-6 py-4 rounded-xl shadow-2xl text-amber-700 font-semibold text-lg flex items-center gap-3">
            <span className="text-2xl">📥</span>
            여기에 놓으면 포스트잇이 만들어집니다
          </div>
        </div>
      )}

      {expandedId &&
        (() => {
          const m = store.memos.find(x => x.id === expandedId && !x.deletedAt)
          if (!m) return null
          return (
            <MemoModal
              memo={m}
              onClose={() => setExpandedId(null)}
              onUpdate={updates => store.updateMemo(m.id, updates)}
              onOcrRequest={
                m.type === 'image'
                  ? naturalBox => {
                      setExpandedId(null)
                      setOcrInitialBox(naturalBox)
                      setOcrTargetId(m.id)
                    }
                  : undefined
              }
            />
          )
        })()}

      {ocrTargetId &&
        (() => {
          const m = store.memos.find(x => x.id === ocrTargetId && !x.deletedAt)
          if (!m || m.type !== 'image') return null
          return (
            <OcrModal
              memo={m}
              initialNaturalBox={ocrInitialBox}
              onClose={() => {
                setOcrTargetId(null)
                setOcrInitialBox(null)
              }}
              onCreateTextMemo={text =>
                store.createMemo({
                  type: detectType(text),
                  content: text,
                  x: m.x + 30,
                  y: m.y + 30,
                })
              }
            />
          )
        })()}

      {sharePayload && (
        <ShareModal
          payload={sharePayload.payload}
          title={sharePayload.title}
          onClose={() => setSharePayload(null)}
        />
      )}

      {importId && (
        <ImportPreview
          shareId={importId}
          onClose={handleImportCancel}
          onImport={handleImportMemos}
        />
      )}

      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          actionLabel="되돌리기"
          onAction={toast.onUndo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
