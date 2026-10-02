import Anthropic from "@anthropic-ai/sdk";
import { db, getPoems, getWords, MODES, type Mode } from "./db";

const MODEL = "claude-opus-5-5";

// At most one regeneration per thread every few seconds, so a busy thread
// doesn't trigger an AI call for every single word.
const MIN_SECONDS_BETWEEN_GENERATIONS = 5;
// If a generation crashes midway, its "lock" expires after this long.
const GENERATION_LOCK_SECONDS = 90;

// The only words the AI may add on its own: articles, prepositions,
// conjunctions (plus a few contractions of them).
const CONNECTIVES = new Set(
  `a an the
  of in on at to into onto upon from with without within by for about above below
  under over beneath beside besides between beyond through throughout across along
  around among amid against toward towards past near off out up down behind before
  after during until till since like unlike via per inside outside
  and or but nor so yet for if as than then though although because while when
  whenever where wherever whether once unless`
    .split(/\s+/)
    .filter(Boolean),
);

const SYSTEM_PROMPT = `You assemble community poems. People each contributed a single word; your job is to turn their words into a short, evocative poem.

Strict rules:
- Use every contributed word, as many times as it appears in the list. Keep each word's spelling exactly as given (no plurals, tenses or other changes).
- The ONLY words you may add are articles (a, an, the), prepositions (of, in, on, with, through, ...) and conjunctions (and, or, but, as, when, ...).
- Never add nouns, verbs, adjectives, adverbs, pronouns or any other content words.
- You may add punctuation and line breaks, and group lines into stanzas.
- Output only the poem: no title, no quotation marks, no commentary.`;

function instructions(mode: Mode, words: string[]) {
  const list = words.map((w, i) => `${i + 1}. ${w}`).join("\n");
  const order =
    mode === "chronological"
      ? "Keep the words in exactly this order. Do not move any word."
      : "You may reorder the words however makes the best poem.";
  return `${order}\n\nContributed words:\n${list}`;
}

function tokens(text: string) {
  return text.toLowerCase().replace(/’/g, "'").match(/\p{L}[\p{L}\p{M}'-]*/gu) ?? [];
}

// Checks the AI's poem follows the rules: every submitted word is present,
// and nothing was added beyond connectives.
function followsRules(poem: string, words: string[]) {
  const remaining = new Map<string, number>();
  for (const w of words) remaining.set(w, (remaining.get(w) ?? 0) + 1);
  for (const t of tokens(poem)) {
    const left = remaining.get(t) ?? 0;
    if (left > 0) remaining.set(t, left - 1);
    else if (!CONNECTIVES.has(t) && !words.includes(t)) return false;
  }
  return [...remaining.values()].every((n) => n === 0);
}

// Used when there is no API key yet, or the AI couldn't follow the rules.
function simplePoem(words: string[]) {
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += 4) lines.push(words.slice(i, i + 4).join(" "));
  return lines.join("\n");
}

let anthropic: Anthropic | null = null;

async function askClaude(mode: Mode, words: string[]): Promise<string | null> {
  anthropic ??= new Anthropic();
  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: instructions(mode, words) }],
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  return text || null;
}

async function composePoem(mode: Mode, words: string[]) {
  if (!process.env.ANTHROPIC_API_KEY) return simplePoem(words);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const poem = await askClaude(mode, words);
      if (poem && followsRules(poem, words)) return poem;
    } catch (err) {
      console.error(`Poem generation failed (${mode}):`, err);
      if (err instanceof Anthropic.AuthenticationError) break;
    }
  }
  return simplePoem(words);
}

/**
 * Regenerates a thread's two cached poems if new words have arrived since
 * they were last written. Safe to call often: it skips the work when the
 * poems are fresh, when another request is already generating, or when the
 * last generation was only a few seconds ago (whoever polls next picks up
 * the new words).
 */
export async function regenerateIfStale(threadId: number) {
  const sql = await db();
  const words = (await getWords(threadId)).map((w) => w.word);
  const poems = await getPoems(threadId);
  const stale = MODES.filter(
    (mode) => (poems[mode]?.word_count_at_generation ?? -1) !== words.length,
  );
  if (stale.length === 0) return;

  const claimed = await sql`
    UPDATE threads SET regen_started_at = now()
    WHERE id = ${threadId}
      AND (regen_started_at IS NULL
           OR regen_started_at < now() - make_interval(secs => ${GENERATION_LOCK_SECONDS}))
      AND (last_generated_at IS NULL
           OR last_generated_at < now() - make_interval(secs => ${MIN_SECONDS_BETWEEN_GENERATIONS}))
    RETURNING id`;
  if ((claimed as unknown[]).length === 0) return;

  try {
    await Promise.all(
      stale.map(async (mode) => {
        const text = words.length === 0 ? "" : await composePoem(mode, words);
        await sql`
          INSERT INTO poems (thread_id, mode, text, word_count_at_generation, updated_at)
          VALUES (${threadId}, ${mode}, ${text}, ${words.length}, now())
          ON CONFLICT (thread_id, mode) DO UPDATE
          SET text = EXCLUDED.text,
              word_count_at_generation = EXCLUDED.word_count_at_generation,
              updated_at = now()`;
      }),
    );
  } finally {
    await sql`
      UPDATE threads SET regen_started_at = NULL, last_generated_at = now()
      WHERE id = ${threadId}`;
  }
}
