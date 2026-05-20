import type { MemoColor, MemoType } from './types'

export const COLORS: MemoColor[] = ["yellow", "pink", "blue", "green"]

export const COLOR_HEX: Record<MemoColor, string> = {
  yellow: "#FEF3A2",
  pink:   "#FFCFE3",
  blue:   "#C7E6FF",
  green:  "#CFF3D2",
}

export const COLOR_LABEL: Record<MemoColor, string> = {
  yellow: "노랑",
  pink:   "분홍",
  blue:   "파랑",
  green:  "초록",
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const URL_REGEX = /^https?:\/\/\S+$/i

export function detectType(text: string): MemoType {
  const trimmed = text.trim()
  if (URL_REGEX.test(trimmed)) return "link"
  return "text"
}

export function isUrl(text: string): boolean {
  return URL_REGEX.test(text.trim())
}

export function randomNearCenter(): { x: number; y: number } {
  const noteW = 220
  const noteH = 180
  const cx = window.innerWidth / 2 - noteW / 2
  const cy = window.innerHeight / 2 - noteH / 2
  const offset = 180
  return {
    x: Math.max(20, cx + (Math.random() - 0.5) * offset),
    y: Math.max(80, cy + (Math.random() - 0.5) * offset),
  }
}

type Box = { x: number; y: number; w: number; h: number }

function estimateSize(m: { type: MemoType; width?: number; height?: number }): { w: number; h: number } {
  const w = m.width ?? (m.type === 'image' ? 320 : 220)
  const h = m.height ?? (m.type === 'image' ? 240 : 200)
  return { w, h }
}

function overlaps(a: Box, b: Box, pad = 12): boolean {
  if (a.x + a.w + pad <= b.x) return false
  if (b.x + b.w + pad <= a.x) return false
  if (a.y + a.h + pad <= b.y) return false
  if (b.y + b.h + pad <= a.y) return false
  return true
}

/**
 * 보드에서 새 메모를 둘 위치를 찾는다.
 * - 상단 중앙에서 가까운 셀부터 그리드 스캔 → 모든 메모와 안 겹치는 첫 자리
 * - 빈 자리가 없으면 가장 오래된 메모부터 하나씩 무시하면서 다시 검색
 *   (= 새 메모끼리는 절대 안 겹치고, 오래된 메모 위에는 겹쳐 올라감)
 * - aboveAll: 어떤 기존 메모와 겹쳐 배치되었으면 true → 호출자가 selected로 만들어 z-index 위로
 */
export function findFreePosition(
  existing: Array<{
    x: number
    y: number
    type: MemoType
    width?: number
    height?: number
    createdAt: number
  }>,
  newMemo: { type: MemoType; width?: number; height?: number },
): { x: number; y: number; aboveAll: boolean } {
  const { w, h } = estimateSize(newMemo)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const minX = 20
  const minY = 70 // 상단 툴바 아래
  const maxX = Math.max(minX, vw - w - 20)
  const maxY = Math.max(minY, vh - h - 20)
  const step = 40
  const centerX = vw / 2 - w / 2

  // 후보 셀들 만들고 상단 중앙에서 가까운 순으로 정렬
  const cells: Array<{ x: number; y: number; dist: number }> = []
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      cells.push({ x, y, dist: Math.hypot(x - centerX, (y - minY) * 1.4) })
    }
  }
  cells.sort((a, b) => a.dist - b.dist)
  if (cells.length === 0) {
    return { x: minX, y: minY, aboveAll: true }
  }

  // 메모를 오래된 순으로 정렬 → ignoreCount만큼 앞에서 잘라내며 점진적으로 무시
  const sorted = [...existing].sort((a, b) => a.createdAt - b.createdAt)

  for (let ignoreCount = 0; ignoreCount <= sorted.length; ignoreCount++) {
    const considered = sorted.slice(ignoreCount)
    const boxes: Box[] = considered.map(m => {
      const s = estimateSize(m)
      return { x: m.x, y: m.y, w: s.w, h: s.h }
    })

    for (const cell of cells) {
      const cand: Box = { x: cell.x, y: cell.y, w, h }
      let collide = false
      for (const b of boxes) {
        if (overlaps(cand, b)) {
          collide = true
          break
        }
      }
      if (!collide) {
        return { x: cell.x, y: cell.y, aboveAll: ignoreCount > 0 }
      }
    }
  }

  // 이론상 도달 안 함 (ignoreCount === sorted.length 단계에서 considered가 비어 첫 셀 반환됨)
  return { x: cells[0].x, y: cells[0].y, aboveAll: true }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
