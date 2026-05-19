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

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
