import { createWorker, type Worker } from 'tesseract.js'

export type OcrProgress = {
  status: string
  progress: number
}

let workerPromise: Promise<Worker> | null = null
let currentLogger: ((p: OcrProgress) => void) | null = null

async function ensureWorker(): Promise<Worker> {
  if (workerPromise) return workerPromise
  workerPromise = (async () => {
    const w = await createWorker(['kor', 'eng'], 1, {
      logger: m => {
        if (currentLogger && typeof m.progress === 'number') {
          currentLogger({ status: m.status, progress: m.progress })
        }
      },
    })
    return w
  })()
  try {
    return await workerPromise
  } catch (err) {
    workerPromise = null
    throw err
  }
}

export async function recognizeText(
  imageSrc: string,
  onProgress?: (p: OcrProgress) => void,
): Promise<string> {
  currentLogger = onProgress ?? null
  try {
    const worker = await ensureWorker()
    const { data } = await worker.recognize(imageSrc)
    return data.text ?? ''
  } finally {
    currentLogger = null
  }
}
