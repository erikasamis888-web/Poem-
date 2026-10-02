import { after, NextResponse } from "next/server";
import { db, getPoems, getThreadBySlug, getWordCount, isDbConfigured } from "@/lib/db";
import { regenerateIfStale } from "@/lib/poem";
import { validateWord } from "@/lib/words";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export type PoemState = {
  title: string;
  status: "open" | "closed";
  defaultMode: "chronological" | "rearranged";
  wordCount: number;
  poems: {
    chronological: string | null;
    rearranged: string | null;
  };
  updating: boolean;
};

async function poemState(slug: string): Promise<PoemState | null> {
  const thread = await getThreadBySlug(slug);
  if (!thread) return null;
  const [wordCount, poems] = await Promise.all([
    getWordCount(thread.id),
    getPoems(thread.id),
  ]);
  const updating =
    poems.chronological?.word_count_at_generation !== wordCount ||
    poems.rearranged?.word_count_at_generation !== wordCount;
  if (updating) after(() => regenerateIfStale(thread.id));
  return {
    title: thread.title,
    status: thread.status,
    defaultMode: thread.default_mode,
    wordCount,
    poems: {
      chronological: poems.chronological?.text ?? null,
      rearranged: poems.rearranged?.text ?? null,
    },
    updating,
  };
}

// Viewers poll this to see the latest cached poems.
export async function GET(_req: Request, ctx: RouteContext<"/api/p/[slug]">) {
  if (!isDbConfigured()) return NextResponse.json({ error: "Not set up yet" }, { status: 503 });
  const { slug } = await ctx.params;
  const state = await poemState(slug);
  if (!state) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(state);
}

// Submits one word to the thread.
export async function POST(req: Request, ctx: RouteContext<"/api/p/[slug]">) {
  if (!isDbConfigured()) return NextResponse.json({ error: "Not set up yet" }, { status: 503 });
  const { slug } = await ctx.params;
  const thread = await getThreadBySlug(slug);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (thread.status !== "open")
    return NextResponse.json({ error: "This poem is closed to new words." }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const result = validateWord(body?.word);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const sql = await db();
  await sql`INSERT INTO words (thread_id, word) VALUES (${thread.id}, ${result.word})`;

  const state = await poemState(slug);
  return NextResponse.json({ word: result.word, state });
}
