// The two Gemini prompts. Files under api/_lib are not exposed as routes.

export type LangCode = 'om' | 'am' | 'en';

export const LANGUAGE_NAME: Record<LangCode, string> = {
  om: 'Afaan Oromo',
  am: 'Amharic',
  en: 'English',
};

export const EXTRACT_PROMPT =
  'You are reading a photographed or scanned official document. Extract ALL visible text exactly as written, in the original language. Do NOT translate, correct spelling, or guess. Write [unclear] for any word you cannot read. Keep reading order. Keep each separately printed line separate: when a block contains more than one printed line, put "\\n" between the lines inside the block\'s text instead of merging them into one line. Split into blocks with ids block-1, block-2, ... in order. Each block type is one of: heading, paragraph, table_row, list_item, stamp, signature, logo, handwriting. For table_row put the cells in one text separated by \' | \'. For stamp, signature and logo, text is a short English description (for example \'round stamp, text unreadable\'); only transcribe stamp text if it is clearly legible. Return only JSON: {"detectedLanguage":"om|am|en|other","documentType":"academic|id_certificate|legal|other","blocks":[{"id":"block-1","type":"heading","text":"..."}]}';

const TRANSLATE_PROMPT =
  "Translate the text of each block from {SOURCE} to {TARGET}. The input is a JSON array of blocks. Return the SAME JSON array with the same ids, same order, same count and same types; change only the text. Do not change numbers, dates, reference codes, phones or emails. Personal names: if a name is already written in the script of the target language, copy it exactly as written and never re-spell it (for example a Latin-script name when the target is English or Afaan Oromo); otherwise transliterate it into the target script (Ethiopic script for Amharic, Latin script for English and Afaan Oromo). For blocks of type stamp, signature, logo or handwriting, output exactly '[Stamp present in original]', '[Signature present in original]', '[Logo present in original]' or '[Handwriting present in original]'. Keep '[unclear]' as '[unclear]'. Keep ' | ' separators in table rows. Keep the \"\\n\" line breaks inside a block's text. Never add, summarize or omit content. Return only JSON.";

export function translatePrompt(from: LangCode, to: LangCode): string {
  return TRANSLATE_PROMPT.replace('{SOURCE}', LANGUAGE_NAME[from]).replace('{TARGET}', LANGUAGE_NAME[to]);
}
