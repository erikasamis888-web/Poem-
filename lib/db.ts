import { neon } from "@neondatabase/serverless";

export type Mode = "chronological" | "rearranged";
export const MODES: Mode[] = ["chronological", "rearranged"];

export type Thread = {
  id: number;
  slug: string;
  title: string;
  status: "open" | "closed";
  default_mode: Mode;
  created_at: string;
};

export type Poem = {
  mode: Mode;
  text: string;
  word_count_at_generation: number;
  updated_at: string;
};

// Vercel's Neon integration sets DATABASE_URL (and sometimes POSTGRES_URL).
function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function isDbConfigured() {
  return databaseUrl() !== "";
}

type Sql = ReturnType<typeof neon>;
let client: Sql | null = null;
let schemaReady: Promise<void> | null = null;

// Creates the tables the first time the app talks to the database,
// so there is no separate "migration" step to run.
async function ensureSchema(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS threads (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    default_mode TEXT NOT NULL DEFAULT 'chronological',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    regen_started_at TIMESTAMPTZ,
    last_generated_at TIMESTAMPTZ
  )`;
  await sql`CREATE TABLE IF NOT EXISTS words (
    id SERIAL PRIMARY KEY,
    thread_id INT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS words_thread_idx ON words (thread_id, id)`;
  await sql`CREATE TABLE IF NOT EXISTS poems (
    thread_id INT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    text TEXT NOT NULL,
    word_count_at_generation INT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, mode)
  )`;
}

export async function db(): Promise<Sql> {
  if (!client) client = neon(databaseUrl());
  if (!schemaReady) {
    schemaReady = ensureSchema(client).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
  return client;
}

type Rows = Record<string, unknown>[];

export async function getThreadBySlug(slug: string) {
  const sql = await db();
  const rows = (await sql`SELECT * FROM threads WHERE slug = ${slug}`) as Rows;
  return (rows[0] as Thread | undefined) ?? null;
}

export async function getThreadById(id: number) {
  const sql = await db();
  const rows = (await sql`SELECT * FROM threads WHERE id = ${id}`) as Rows;
  return (rows[0] as Thread | undefined) ?? null;
}

export async function listThreadsWithCounts() {
  const sql = await db();
  const rows = (await sql`
    SELECT t.*, COUNT(w.id)::int AS word_count
    FROM threads t LEFT JOIN words w ON w.thread_id = t.id
    GROUP BY t.id
    ORDER BY t.status = 'closed', t.created_at DESC
  `) as Rows;
  return rows as (Thread & { word_count: number })[];
}

export async function getWords(threadId: number) {
  const sql = await db();
  const rows = (await sql`
    SELECT id, word, created_at FROM words WHERE thread_id = ${threadId} ORDER BY id
  `) as Rows;
  return rows as { id: number; word: string; created_at: string }[];
}

export async function getWordCount(threadId: number) {
  const sql = await db();
  const rows = (await sql`
    SELECT COUNT(*)::int AS n FROM words WHERE thread_id = ${threadId}
  `) as Rows;
  return rows[0].n as number;
}

export async function getPoems(threadId: number) {
  const sql = await db();
  const rows = (await sql`
    SELECT mode, text, word_count_at_generation, updated_at
    FROM poems WHERE thread_id = ${threadId}
  `) as Rows;
  const poems: Partial<Record<Mode, Poem>> = {};
  for (const row of rows as Poem[]) poems[row.mode] = row;
  return poems;
}
