import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getThreadBySlug, isDbConfigured } from "@/lib/db";
import SetupNotice from "@/components/SetupNotice";
import SubmitFlow from "./SubmitFlow";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  if (!isDbConfigured()) return {};
  const { slug } = await props.params;
  const thread = await getThreadBySlug(slug);
  return { title: thread ? `${thread.title} · Add a word` : "Poem not found" };
}

export default async function PublicPoemPage(props: PageProps<"/p/[slug]">) {
  if (!isDbConfigured()) return <SetupNotice />;
  const { slug } = await props.params;
  const thread = await getThreadBySlug(slug);
  if (!thread) notFound();

  return (
    <main className="public">
      <h1>{thread.title}</h1>
      <SubmitFlow slug={slug} initiallyClosed={thread.status === "closed"} />
    </main>
  );
}
