// Gemini speech for page and document reading. Uses dedicated TTS models,
// not GEMINI_MODEL (that one is JSON extract/translate). The API key stays
// on the server. GEMINI_MOCK does not skip this: mock is for extract/translate.

import { GoogleGenAI } from '@google/genai';
import type { LangCode } from '../../../shared/contract';
import { GeminiError, type GeminiAttempt } from './gemini';

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_FALLBACK = 'gemini-2.5-pro-preview-tts';

/** One Transly reader for every language so clips do not switch actors. */
const VOICE = 'kore'

const INSTRUCTION: Record<LangCode, string> = {
  am: 'Read this Amharic (አማርኛ) text aloud in a calm, consistent voice with a natural Ethiopian accent. Generate audio only. Do not translate.\n\n',
  om: 'Read this Afaan Oromo text aloud in a calm, consistent voice with a natural Oromo accent. Generate audio only. Do not translate.\n\n',
  en: 'Read this English text aloud in a calm, consistent voice. Generate audio only.\n\n',
};

function requireKey(): string {
  const value = process.env.GEMINI_API_KEY;
  if (!value) throw new Error('GEMINI_API_KEY is not set');
  return value;
}

function ttsModels(): string[] {
  const primary = process.env.GEMINI_TTS_MODEL || DEFAULT_MODEL;
  const extra = [process.env.GEMINI_TTS_FALLBACK_MODEL || DEFAULT_FALLBACK];
  return [primary, ...extra].filter((m, i, all) => m && all.indexOf(m) === i);
}

function pcmToWav(pcm: Buffer, sampleRate = 24_000): Buffer {
  const channels = 1;
  const bits = 16;
  const blockAlign = channels * (bits / 8);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function asBuffer(data: unknown): Buffer | null {
  if (typeof data === 'string') return Buffer.from(data, 'base64');
  if (data instanceof Uint8Array) return Buffer.from(data);
  return null;
}

export async function generateSpeech(text: string, lang: LangCode): Promise<Buffer> {
  const ai = new GoogleGenAI({
    apiKey: requireKey(),
    httpOptions: { apiVersion: 'v1beta' },
  });
  const attempts: GeminiAttempt[] = [];
  let sawRateLimit = false;
  const prompt = INSTRUCTION[lang] + text;

  for (const model of ttsModels()) {
    const started = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0,
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
          },
        },
      });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const audioPart = parts.find((p) => p.inlineData?.data);
      const raw = asBuffer(audioPart?.inlineData?.data);
      if (!raw?.length) {
        attempts.push({ model, ms: Date.now() - started, outcome: 'error', detail: 'empty audio' });
        continue;
      }
      attempts.push({ model, ms: Date.now() - started, outcome: 'ok' });
      console.log(`[tts] ${lang} ${model} ok (${attempts[attempts.length - 1].ms} ms)`);
      if (raw.subarray(0, 4).toString('ascii') === 'RIFF') return raw;
      return pcmToWav(raw);
    } catch (error) {
      const ms = Date.now() - started;
      const status = (error as { status?: unknown } | null)?.status;
      if (status === 429) sawRateLimit = true;
      const detail = String((error as Error)?.message ?? error).slice(0, 180);
      if (typeof status === 'number') attempts.push({ model, ms, outcome: `http ${status}`, detail });
      else attempts.push({ model, ms, outcome: 'error', detail });
      console.warn(`[tts] ${lang} ${model} failed (${ms} ms): ${detail}`);
    }
  }

  if (sawRateLimit) {
    throw new GeminiError('RATE_LIMITED', 'The reading service is busy. Try again in a minute.', attempts);
  }
  throw new GeminiError('BAD_GATEWAY', 'Could not generate speech for this text.', attempts);
}
