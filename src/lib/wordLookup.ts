/**
============================================================================
WORD LOOKUP MODULE
============================================================================
WHAT THIS DOES
You give it a word (e.g. "apple") and it gives you back:
the definition(s), grouped by part of speech (noun, verb, etc.)
example sentences for each definition, where available
synonyms, where available
phonetic spelling, where available

WHY IT'S BUILT THIS WAY
We were using a single free API (dictionaryapi.dev) and it kept going
down. So instead of relying on ONE source, this file tries THREE, in
order, and only moves to the next one if the current one fails:

1st try: dictionaryapi.dev (free, no signup)
2nd try: Wiktionary's own API (free, no signup, very reliable)
3rd try: Merriam-Webster API (free, but needs a signup + API key)

If all three fail (rare), it returns null instead of crashing, so the
app can show a "word not found, try again" message instead of breaking.

SETUP — the one thing you need to do before this works
Step 1 and 2 need nothing — they work immediately, no signup, no key.
Step 3 (Merriam-Webster) is optional but recommended as a safety net.
To enable it:
a. Go to https://dictionaryapi.com/register/index
b. Sign up for a free account (takes 2 minutes)
c. Request a key for the "Collegiate Dictionary" API (it's free,
1,000 requests/day)
d. Paste that key into MERRIAM_WEBSTER_API_KEY below

If you skip step 3, everything still works — you just lose the third
safety net, and only have two fallback sources instead of three.

HOW TO USE THIS FILE
import { getWordData } from './wordLookup.js';
const result = await getWordData('apple');
console.log(result);

See the bottom of this file for a full example of what result looks
like.
============================================================================
*/

// ── PASTE YOUR FREE MERRIAM-WEBSTER KEY HERE (optional, see step 3 above) ──
const MERRIAM_WEBSTER_API_KEY = '';

/**
Main function — this is the only thing the rest of the app needs to call.
Tries each dictionary source in order until one works.

@param {string} word - the word to look up, e.g. "apple"
@returns {Promise<object|null>} normalized word data, or null if every
source failed / the word wasn't found anywhere
*/
export async function getWordData(word: string) {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return null;

  const sources = [
    { name: 'dictionaryapi.dev', fn: fromDictionaryApiDev },
    { name: 'Wiktionary', fn: fromWiktionary },
    ...(MERRIAM_WEBSTER_API_KEY ? [{ name: 'Merriam-Webster', fn: fromMerriamWebster }] : []),
  ];

  for (const source of sources) {
    try {
      const result = await source.fn(cleanWord);
      if (result) {
        return { ...result, source: source.name };
      }
    } catch (err: any) {
      // This source failed — log it for debugging, then move on to the
      // next source automatically. The app never sees this error.
      console.warn(`[wordLookup] "${source.name}" failed for "${cleanWord}":`, err.message);
    }
  }

  // Every source failed or nobody has this word.
  return null;
}

// ============================================================================
// SOURCE 1: dictionaryapi.dev — tried first, no key needed
// ============================================================================
async function fromDictionaryApiDev(word: string) {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const entry = data[0];
  if (!entry) return null;

  return {
    word: entry.word,
    phonetic: entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || '',
    meanings: entry.meanings.map((m: any) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.map((d: any) => ({
        meaning: d.definition,
        example: d.example || '',
      })),
      synonyms: m.synonyms || [],
    })),
  };
}

// ============================================================================
// SOURCE 2: Wiktionary's official API — tried second, no key needed
// (This is the same underlying data dictionaryapi.dev uses, but hosted
// directly by Wikimedia, so it's much more reliable.)
// ============================================================================
async function fromWiktionary(word: string) {
  const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const entries = data.en; // English definitions
  if (!entries || entries.length === 0) return null;

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim();

  return {
    word,
    phonetic: '', // Wiktionary's definition endpoint doesn't include this
    meanings: entries.map((entry: any) => ({
      partOfSpeech: entry.partOfSpeech,
      definitions: entry.definitions.map((d: any) => ({
        meaning: stripHtml(d.definition || ''),
        example: d.examples?.[0] ? stripHtml(d.examples[0]) : '',
      })),
      synonyms: [], // not provided by this endpoint
    })),
  };
}

// ============================================================================
// SOURCE 3: Merriam-Webster — tried last, needs a free API key (see SETUP)
// ============================================================================
async function fromMerriamWebster(word: string) {
  if (!MERRIAM_WEBSTER_API_KEY) return null;

  const res = await fetch(
    `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${MERRIAM_WEBSTER_API_KEY}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Merriam-Webster returns an array of suggested words (strings) if it
  // can't find an exact match — that's not a real result, so treat it as
  // "not found" rather than trying to parse it as a definition.
  if (!Array.isArray(data) || typeof data[0] === 'string' || !data[0]) return null;

  return {
    word,
    phonetic: data[0].hwi?.prs?.[0]?.mw || '',
    meanings: data.map((entry: any) => ({
      partOfSpeech: entry.fl || '',
      definitions: (entry.shortdef || []).map((def: string) => ({
        meaning: def,
        example: '',
      })),
      synonyms: [],
    })),
  };
}

/**
============================================================================
EXAMPLE OUTPUT — what getWordData('apple') returns
============================================================================
{
  word: "apple",
  phonetic: "/ˈæp.əl/",
  source: "dictionaryapi.dev",
  meanings: [
    {
      partOfSpeech: "noun",
      definitions: [
        {
          meaning: "A common, round fruit produced by the tree Malus domestica.",
          example: "She ate an apple for lunch."
        }
      ],
      synonyms: []
    }
  ]
}

If the word isn't found anywhere, getWordData(...) returns null —
always check for that before using the result:
const result = await getWordData(someWord);
if (!result) {
  // show "word not found" in the UI
} else {
  // show result.meanings, etc.
}
============================================================================
*/
