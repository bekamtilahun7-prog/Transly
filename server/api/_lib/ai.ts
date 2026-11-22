// The two AI operations the handlers use. The provider sits behind
// extractDocument(file) and translate(blocks, from, to), so it can be swapped
// without touching the handlers.
//
// GEMINI_MOCK=true returns canned answers and never calls Gemini (for local
// testing without spending quota).

import type { Block, LangCode } from '../../../shared/contract';
import { PLACEHOLDER, parseExtraction, parseTranslation, type Extraction } from './blocks';
import { describeAttempts, generateJson, type GeminiFile } from './gemini';
import { ApiFailure } from './http';
import { EXTRACT_PROMPT, translatePrompt } from './prompts';

// The web client gives up after 120 s, so one API request spends at most
// 105 s on the model: 70 s for the first attempt, the rest for the fallback
// or for the one retry after an unusable answer.
const BUDGET_MS = 105_000;
const ATTEMPT_MS = 70_000;

export function isMock(): boolean {
  return process.env.GEMINI_MOCK === 'true';
}

async function askTwice<T>(
  label: string,
  options: { prompt: string; file?: GeminiFile; input?: string },
  parse: (text: string) => T | null,
): Promise<T> {
  const deadlineAt = Date.now() + BUDGET_MS;
  for (let round = 1; round <= 2; round++) {
    const result = await generateJson({ ...options, timeoutMs: ATTEMPT_MS, deadlineAt });
    const parsed = parse(result.text);
    console.log(`[gemini] ${label} round ${round}: ${describeAttempts(result.attempts)}${parsed ? '' : ' -> unusable answer'}`);
    if (parsed) return parsed;
  }
  throw new ApiFailure('BAD_GATEWAY', 'The AI service returned an answer we could not use. Try again.');
}

export async function extractDocument(file: GeminiFile, hint?: LangCode): Promise<Extraction> {
  if (isMock()) return mockExtraction(hint ?? 'om');
  return askTwice('extract', { prompt: EXTRACT_PROMPT, file }, parseExtraction);
}

export async function translate(blocks: Block[], from: LangCode, to: LangCode): Promise<Block[]> {
  if (isMock()) {
    return blocks.map((b) => ({ ...b, text: PLACEHOLDER[b.type] ?? `[mock ${from}->${to}] ${b.text}` }));
  }
  return askTwice(
    'translate',
    { prompt: translatePrompt(from, to), input: JSON.stringify(blocks) },
    (text) => parseTranslation(text, blocks),
  );
}

function mockExtraction(language: LangCode): Extraction {
  return {
    detectedLanguage: language,
    documentType: 'academic',
    blocks: [
      { id: 'block-1', type: 'logo', text: 'round logo, mock data' },
      { id: 'block-2', type: 'heading', text: 'MOCK UNIVERSITY\nOffice of the Registrar' },
      { id: 'block-3', type: 'paragraph', text: 'Mock extraction (GEMINI_MOCK=true). No AI service was called.' },
      { id: 'block-4', type: 'table_row', text: 'Course | Code | Grade' },
      { id: 'block-5', type: 'table_row', text: 'Statistics | STAT-101 | A' },
      { id: 'block-6', type: 'stamp', text: 'round stamp, text unreadable' },
      { id: 'block-7', type: 'signature', text: 'handwritten signature' },
    ],
  };
}
