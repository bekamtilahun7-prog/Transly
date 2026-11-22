// Manual prompt-quality test. NOT shipped to production.
//
// Sends sample documents (photo or PDF) to Gemini with the EXTRACT prompt, then
// translates the extracted blocks: an Afaan Oromo sample goes om -> am, an
// Amharic sample goes am -> en. It uses the same client and prompts as /api.
//
// Usage:
//   npx tsx --env-file=.env scripts/gemini-test.ts [options] [files...]
//
// Options:
//   --thinking=<json>   thinkingConfig to send, e.g. --thinking={"thinkingLevel":"low"}
//   --extract-only      skip the translate step
//
// Without files it runs every pdf/jpg/png in test-samples/ (gitignored).
// Use synthetic or sample documents only, never a real ID.
// Full outputs are written to test-samples/out/ (also gitignored).

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GeminiError, describeAttempts, generateJson } from '../api/_lib/gemini';
import { EXTRACT_PROMPT, translatePrompt, type LangCode } from '../api/_lib/prompts';

interface Block {
  id: string;
  type: string;
  text: string;
}
interface ExtractResult {
  detectedLanguage: string;
  documentType: string;
  blocks: Block[];
}

const BLOCK_TYPES = ['heading', 'paragraph', 'table_row', 'list_item', 'stamp', 'signature', 'logo', 'handwriting'];
const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};
const SAMPLES_DIR = 'test-samples';
const OUT_DIR = path.join(SAMPLES_DIR, 'out');
const PREVIEW_LINES = 12;
const TIMEOUT_MS = 150_000;

function isBlockArray(value: unknown): value is Block[] {
  return (
    Array.isArray(value) &&
    value.every((b) => b && typeof b.id === 'string' && typeof b.type === 'string' && typeof b.text === 'string')
  );
}

function checkExtract(result: ExtractResult): string[] {
  const problems: string[] = [];
  if (!['om', 'am', 'en', 'other'].includes(result.detectedLanguage)) {
    problems.push(`detectedLanguage is "${result.detectedLanguage}"`);
  }
  if (!['academic', 'id_certificate', 'legal', 'other'].includes(result.documentType)) {
    problems.push(`documentType is "${result.documentType}"`);
  }
  result.blocks.forEach((b, i) => {
    if (b.id !== `block-${i + 1}`) problems.push(`block ${i + 1} has id "${b.id}"`);
    if (!BLOCK_TYPES.includes(b.type)) problems.push(`${b.id} has type "${b.type}"`);
  });
  return problems;
}

function checkTranslation(input: Block[], output: Block[]): string[] {
  const problems: string[] = [];
  if (input.length !== output.length) problems.push(`count changed: ${input.length} in, ${output.length} out`);
  for (let i = 0; i < Math.min(input.length, output.length); i++) {
    if (input[i].id !== output[i].id) problems.push(`position ${i + 1}: id "${input[i].id}" became "${output[i].id}"`);
    if (input[i].type !== output[i].type) problems.push(`${input[i].id}: type "${input[i].type}" became "${output[i].type}"`);
    const linesIn = input[i].text.split('\n').length;
    const linesOut = output[i].text.split('\n').length;
    if (linesIn !== linesOut) problems.push(`${input[i].id}: ${linesIn} line(s) became ${linesOut}`);
  }
  return problems;
}

function preview(title: string, blocks: Block[]): void {
  const multiline = blocks.filter((b) => b.text.includes('\n')).length;
  console.log(`--- ${title}: ${blocks.length} blocks, ${multiline} with line breaks (showing ${Math.min(PREVIEW_LINES, blocks.length)}) ---`);
  for (const b of blocks.slice(0, PREVIEW_LINES)) {
    // Line breaks are shown as a literal \n so they stay visible on one line.
    console.log(`${b.id} [${b.type}] ${b.text.replace(/\n/g, '\\n')}`);
  }
}

function save(name: string, data: unknown): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2), 'utf8');
}

/** Parses model output and reports whether it was valid JSON on the first try. */
function parse(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    console.log(`${label}: INVALID JSON. First 500 characters:\n${text.slice(0, 500)}`);
    return undefined;
  }
}

async function runSample(file: string, thinkingConfig: Record<string, unknown> | undefined, extractOnly: boolean): Promise<void> {
  const mimeType = MIME[path.extname(file).toLowerCase()];
  const data = readFileSync(file);
  const stem = path.basename(file, path.extname(file));
  console.log(`\n================ ${file} (${mimeType}, ${(data.length / 1024).toFixed(0)} KB) ================`);

  const extractRun = await generateJson({ prompt: EXTRACT_PROMPT, file: { mimeType, data }, timeoutMs: TIMEOUT_MS, thinkingConfig });
  console.log(`extract attempts: ${describeAttempts(extractRun.attempts)}`);
  const extracted = parse(extractRun.text, 'extract') as ExtractResult | undefined;
  if (!extracted || !isBlockArray(extracted.blocks)) {
    console.log('extract: no valid "blocks" array, skipping this sample.');
    return;
  }
  const extractProblems = checkExtract(extracted);
  console.log(
    `extract: JSON valid first time, detectedLanguage=${extracted.detectedLanguage}, documentType=${extracted.documentType}, shape ${extractProblems.length ? `PROBLEMS: ${extractProblems.join('; ')}` : 'ok'}`,
  );
  preview('EXTRACT', extracted.blocks);
  save(`${stem}.extract.json`, extracted);
  if (extractOnly) return;

  const pair: [LangCode, LangCode] | undefined =
    extracted.detectedLanguage === 'om' ? ['om', 'am'] : extracted.detectedLanguage === 'am' ? ['am', 'en'] : undefined;
  if (!pair) {
    console.log(`translate: skipped, detected language "${extracted.detectedLanguage}" is neither om nor am.`);
    return;
  }
  const [from, to] = pair;
  const translateRun = await generateJson({
    prompt: translatePrompt(from, to),
    input: JSON.stringify(extracted.blocks),
    timeoutMs: TIMEOUT_MS,
    thinkingConfig,
  });
  console.log(`translate ${from}->${to} attempts: ${describeAttempts(translateRun.attempts)}`);
  const translated = parse(translateRun.text, `translate ${from}->${to}`);
  if (!isBlockArray(translated)) {
    console.log(`translate ${from}->${to}: the model did not return a JSON array of blocks.`);
    return;
  }
  const problems = checkTranslation(extracted.blocks, translated);
  console.log(
    `translate ${from}->${to}: JSON valid first time, structure ${problems.length ? `PROBLEMS: ${problems.join('; ')}` : 'ok (same ids, order, count, types, line counts)'}`,
  );
  preview(`TRANSLATE ${from} -> ${to}`, translated);
  save(`${stem}.translate.${from}-${to}.json`, translated);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const thinkingArg = args.find((a) => a.startsWith('--thinking='));
  const thinkingConfig = thinkingArg ? (JSON.parse(thinkingArg.slice('--thinking='.length)) as Record<string, unknown>) : undefined;
  const extractOnly = args.includes('--extract-only');
  let files = args.filter((a) => !a.startsWith('--'));
  if (files.length === 0) {
    let names: string[] = [];
    try {
      names = readdirSync(SAMPLES_DIR);
    } catch {
      /* handled below */
    }
    files = names.sort().filter((n) => MIME[path.extname(n).toLowerCase()]).map((n) => path.join(SAMPLES_DIR, n));
  }
  if (files.length === 0) {
    console.error(`ERROR: no sample files given and no pdf/jpg/png found in ${SAMPLES_DIR}/.`);
    process.exit(1);
  }
  const unsupported = files.find((f) => !MIME[path.extname(f).toLowerCase()]);
  if (unsupported) {
    console.error(`ERROR: unsupported sample type: ${unsupported} (use pdf, jpg or png).`);
    process.exit(1);
  }

  console.log(`primary model:  ${process.env.GEMINI_MODEL ?? '(GEMINI_MODEL not set)'}`);
  console.log(`fallback model: ${process.env.GEMINI_FALLBACK_MODEL ?? '(none)'}`);
  console.log(`thinkingConfig: ${thinkingConfig ? JSON.stringify(thinkingConfig) : '(model default)'}`);

  for (const file of files) {
    try {
      await runSample(file, thinkingConfig, extractOnly);
    } catch (error) {
      if (error instanceof GeminiError) {
        console.log(`FAILED ${error.code}: ${error.message} [${describeAttempts(error.attempts)}]`);
      } else {
        console.log(`FAILED: ${(error as Error).message}`);
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(`ERROR: ${(error as Error).message}`);
  process.exit(1);
});
