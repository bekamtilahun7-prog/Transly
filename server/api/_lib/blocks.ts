// Validation of block lists, both from clients and from the model.

import type { Block, BlockType, DocType } from '../../../shared/contract';
import { ApiFailure } from './http';

const BLOCK_TYPES: readonly string[] = [
  'heading', 'paragraph', 'table_row', 'list_item', 'stamp', 'signature', 'logo', 'handwriting',
];
const DOC_TYPES: readonly string[] = ['academic', 'id_certificate', 'legal', 'other'];

const MAX_BLOCKS = 400;
const MAX_TOTAL_CHARS = 60_000;

/** Fixed translated text for blocks that carry no translatable text. */
export const PLACEHOLDER: Partial<Record<BlockType, string>> = {
  stamp: '[Stamp present in original]',
  signature: '[Signature present in original]',
  logo: '[Logo present in original]',
  handwriting: '[Handwriting present in original]',
};

function isBlock(value: unknown): value is Block {
  const b = value as Partial<Block> | null;
  return (
    !!b && typeof b === 'object' &&
    typeof b.id === 'string' && b.id.length > 0 && b.id.length <= 64 &&
    typeof b.type === 'string' && BLOCK_TYPES.includes(b.type) &&
    typeof b.text === 'string'
  );
}

/** Returns why a value is not a usable block list, or null if it is one. */
function blockListProblem(value: unknown): string | null {
  if (!Array.isArray(value)) return 'blocks must be an array';
  if (value.length === 0) return 'blocks is empty';
  if (value.length > MAX_BLOCKS) return `too many blocks (max ${MAX_BLOCKS})`;
  const ids = new Set<string>();
  let chars = 0;
  for (const [index, block] of value.entries()) {
    if (!isBlock(block)) return `block ${index + 1} needs a string id, a valid type and a string text`;
    if (ids.has(block.id)) return `duplicate block id "${block.id}"`;
    ids.add(block.id);
    chars += block.text.length;
  }
  if (chars > MAX_TOTAL_CHARS) return `too much text (max ${MAX_TOTAL_CHARS} characters)`;
  return null;
}

/** Blocks sent by a client: BAD_REQUEST if malformed. Unknown fields are dropped. */
export function clientBlocks(value: unknown): Block[] {
  const problem = blockListProblem(value);
  if (problem) throw new ApiFailure('BAD_REQUEST', `Invalid blocks: ${problem}.`);
  return (value as Block[]).map(({ id, type, text }) => ({ id, type, text }));
}

export interface Extraction {
  /** 'om', 'am', 'en', or whatever else the model reported (the handler rejects it). */
  detectedLanguage: string;
  documentType: DocType;
  blocks: Block[];
}

/** Parses the model's extract answer. Returns null if it is not usable (caller retries). */
export function parseExtraction(text: string): Extraction | null {
  const data = parseJson(text) as { detectedLanguage?: unknown; documentType?: unknown; blocks?: unknown } | null;
  if (!data || typeof data !== 'object' || typeof data.detectedLanguage !== 'string') return null;
  if (blockListProblem(data.blocks)) return null;
  const documentType = typeof data.documentType === 'string' && DOC_TYPES.includes(data.documentType)
    ? (data.documentType as DocType)
    : 'other';
  // Ids are renumbered here so they are always block-1..n in reading order.
  const blocks = (data.blocks as Block[]).map((b, i) => ({ id: `block-${i + 1}`, type: b.type, text: b.text }));
  return { detectedLanguage: data.detectedLanguage.trim().toLowerCase(), documentType, blocks };
}

/** Parses the model's translate answer: same ids, order, count and types as the input, or null. */
export function parseTranslation(text: string, source: Block[]): Block[] | null {
  let data = parseJson(text);
  if (data && !Array.isArray(data) && Array.isArray((data as { blocks?: unknown }).blocks)) {
    data = (data as { blocks: unknown }).blocks;
  }
  if (!Array.isArray(data) || data.length !== source.length) return null;
  const out: Block[] = [];
  for (const [i, original] of source.entries()) {
    const b = data[i] as Partial<Block> | null;
    if (!b || b.id !== original.id || b.type !== original.type || typeof b.text !== 'string') return null;
    out.push({ id: original.id, type: original.type, text: PLACEHOLDER[original.type] ?? b.text });
  }
  return out;
}

function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
