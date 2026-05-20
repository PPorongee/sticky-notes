import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
}

function randomId(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let id = ''
  for (let i = 0; i < 8; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return id
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (!body || body === 'null' || body === '{}') {
      return res.status(400).json({ error: '빈 데이터입니다' })
    }
    const id = randomId()
    const blob = await put(`shares/${id}.json`, body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    })
    res.status(200).json({ id, url: blob.url })
  } catch (err) {
    console.error('share upload failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'upload failed' })
  }
}
