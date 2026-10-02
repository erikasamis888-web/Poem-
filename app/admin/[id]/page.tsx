import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import QRCode from "qrcode";
import { getPoems, getThreadById, getWords, isDbConfigured } from "@/lib/db";
import { regenerateIfStale } from "@/lib/poem";
import { siteUrl } from "@/lib/url";
import AutoRefresh from "@/components/AutoRefresh";
import ConfirmButton from "@/components/ConfirmButton";
import SetupNotice from "@/components/SetupNotice";
import { deleteThread, deleteWord, setDefaultMode, setStatus } from "../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function ThreadAdminPage(props: PageProps<"/admin/[id]">) {
  if (!isDbConfigured()) return <SetupNotice />;
  const id = Number((await props.params).id);
  if (!Number.isInteger(id)) notFound();
  const thread = await getThreadById(id);
  if (!thread) notFound();

  const [words, poems] = await Promise.all([getWords(id), getPoems(id)]);
  const stale = (["chronological", "rearranged"] as const).some(
    (m) => poems[m]?.word_count_at_generation !== words.length,
  );
  if (stale) after(() => regenerateIfStale(id));

  const publicUrl = `${await siteUrl()}/p/${thread.slug}`;
  const qrSvg = await QRCode.toString(publicUrl, { type: "svg", margin: 2, width: 240 });
  const isOpen = thread.status === "open";

  return (
    <main className="admin">
      <AutoRefresh seconds={5} />
      <p>
        <Link href="/admin">← All threads</Link>
      </p>
      <header className="row">
        <h1>{thread.title}</h1>
        <span className={`badge ${thread.status}`}>{thread.status}</span>
      </header>

      <section className="card qr-card">
        <div className="qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="stack">
          <p>
            Public link:
            <br />
            <a href={publicUrl} target="_blank" rel="noreferrer">
              {publicUrl}
            </a>
          </p>
          <a className="button" href={`/admin/${id}/qr`} download={`qr-${thread.slug}.png`}>
            Download QR code (PNG)
          </a>
          <form action={setStatus.bind(null, id, isOpen ? "closed" : "open")}>
            <button className={isOpen ? "danger" : ""}>
              {isOpen ? "Close thread" : "Reopen thread"}
            </button>
          </form>
          <form action={setDefaultMode.bind(null, id)} className="row">
            <label>
              Default view{" "}
              <select name="default_mode" defaultValue={thread.default_mode}>
                <option value="chronological">In order</option>
                <option value="rearranged">Rearranged</option>
              </select>
            </label>
            <button className="secondary">Save</button>
          </form>
        </div>
      </section>

      <section className="poems">
        {(["chronological", "rearranged"] as const).map((mode) => (
          <div className="card" key={mode}>
            <h2>{mode === "chronological" ? "In order" : "Rearranged"}</h2>
            {poems[mode]?.text ? (
              <pre className="poem">{poems[mode]!.text}</pre>
            ) : (
              <p className="muted">{words.length ? "Being written…" : "No words yet."}</p>
            )}
            {poems[mode] && poems[mode]!.word_count_at_generation !== words.length && (
              <p className="meta">Updating with the newest words…</p>
            )}
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Words ({words.length})</h2>
        {words.length === 0 ? (
          <p className="muted">No words yet. Scan the QR code to add the first one.</p>
        ) : (
          <ol className="words">
            {words.map((w) => (
              <li key={w.id}>
                {w.word}
                <form action={deleteWord.bind(null, id, w.id)}>
                  <button className="link" title="Remove this word">
                    remove
                  </button>
                </form>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form action={deleteThread.bind(null, id)} className="danger-zone">
        <ConfirmButton
          className="link danger-text"
          message="Delete this thread, all its words and poems? This can't be undone."
        >
          Delete this thread permanently
        </ConfirmButton>
      </form>
    </main>
  );
}
