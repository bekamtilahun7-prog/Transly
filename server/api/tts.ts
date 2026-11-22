// POST /api/tts  { text, lang } -> { mimeType, audio }
// Public: homepage reading has no session. Text is capped. No document payload.

import type { LangCode } from '../../shared/contract';
import { ApiFailure, jsonBody, langField, route } from './_lib/http';
import { generateSpeech } from './_lib/tts';

const MAX_CHARS = 2_400;

export default route('POST', async (req) => {
  const body = jsonBody(req);
  const lang = langField(body, 'lang');
  const text = body.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new ApiFailure('BAD_REQUEST', 'text is required.');
  }
  const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  const wav = await generateSpeech(trimmed, lang as LangCode);
  return { mimeType: 'audio/wav', audio: wav.toString('base64') };
});
