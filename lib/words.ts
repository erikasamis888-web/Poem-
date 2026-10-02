import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const profanity = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const MAX_WORD_LENGTH = 30;

// Letters (any language), with apostrophes or hyphens inside: "don't", "sun-lit".
const WORD_PATTERN = /^\p{L}[\p{L}\p{M}'’-]*$/u;

export function validateWord(
  input: unknown,
): { ok: true; word: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Please type a word." };
  const word = input.trim().toLowerCase().replace(/’/g, "'");
  if (word === "") return { ok: false, error: "Please type a word." };
  if (/\s/.test(word)) return { ok: false, error: "Just one word, please (no spaces)." };
  if (word.length > MAX_WORD_LENGTH)
    return { ok: false, error: `That word is too long (max ${MAX_WORD_LENGTH} letters).` };
  if (!WORD_PATTERN.test(word))
    return { ok: false, error: "Letters only, please (no numbers or symbols)." };
  if (/(.)\1{3,}/u.test(word))
    return { ok: false, error: "That doesn't look like a word." };
  if (profanity.hasMatch(word))
    return { ok: false, error: "Let's keep it friendly. Try another word." };
  return { ok: true, word };
}
