"use server";

import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db, type Mode } from "@/lib/db";
import { regenerateIfStale } from "@/lib/poem";

function newSlug() {
  // 8 random lowercase letters/digits: hard to guess, easy to type.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
}

export async function createThread(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) redirect("/admin?error=title");
  const mode: Mode =
    formData.get("default_mode") === "rearranged" ? "rearranged" : "chronological";
  const sql = await db();
  const rows = (await sql`
    INSERT INTO threads (slug, title, default_mode)
    VALUES (${newSlug()}, ${title}, ${mode})
    RETURNING id`) as { id: number }[];
  redirect(`/admin/${rows[0].id}`);
}

export async function setStatus(threadId: number, status: "open" | "closed") {
  await requireAdmin();
  const sql = await db();
  await sql`UPDATE threads SET status = ${status} WHERE id = ${threadId}`;
  revalidatePath("/admin", "layout");
}

export async function setDefaultMode(threadId: number, formData: FormData) {
  await requireAdmin();
  const mode: Mode =
    formData.get("default_mode") === "rearranged" ? "rearranged" : "chronological";
  const sql = await db();
  await sql`UPDATE threads SET default_mode = ${mode} WHERE id = ${threadId}`;
  revalidatePath(`/admin/${threadId}`);
}

export async function deleteWord(threadId: number, wordId: number) {
  await requireAdmin();
  const sql = await db();
  await sql`DELETE FROM words WHERE id = ${wordId} AND thread_id = ${threadId}`;
  // Force both poems to be rewritten without the removed word.
  await sql`DELETE FROM poems WHERE thread_id = ${threadId}`;
  await sql`UPDATE threads SET last_generated_at = NULL WHERE id = ${threadId}`;
  after(() => regenerateIfStale(threadId));
  revalidatePath(`/admin/${threadId}`);
}

export async function deleteThread(threadId: number) {
  await requireAdmin();
  const sql = await db();
  await sql`DELETE FROM threads WHERE id = ${threadId}`;
  redirect("/admin");
}
