import { NON_TEXT_TYPES } from '../constants'
import type { Block } from '../../types'

export interface SpeechSegment {
  id: string
  text: string
  blockIndex: number
}

const MAX_CHARS = 900

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text]
  const parts: string[] = []
  let rest = text
  while (rest.length > MAX_CHARS) {
    let cut = rest.lastIndexOf(' ', MAX_CHARS)
    if (cut < 40) cut = MAX_CHARS
    parts.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

/** Paragraph-sized speakable pieces from document blocks, in order. */
export function blocksToSegments(blocks: Block[]): SpeechSegment[] {
  const out: SpeechSegment[] = []
  blocks.forEach((block, blockIndex) => {
    if (NON_TEXT_TYPES.includes(block.type) && !block.text.trim()) return
    const text = block.text.replace(/\s+/g, ' ').trim()
    if (!text) return
    splitLong(text).forEach((chunk, i) => {
      out.push({ id: `${block.id}:${i}`, text: chunk, blockIndex })
    })
  })
  return out
}
