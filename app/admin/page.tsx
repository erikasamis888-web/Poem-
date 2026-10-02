import Link from "next/link";
import { isDbConfigured, listThreadsWithCounts } from "@/lib/db";
import AutoRefresh from "@/components/AutoRefresh";
import SetupNotice from "@/components/SetupNotice";
import { logout } from "../login/actions";
import { createThread } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Poem threads" };

export default async function AdminDashboard(props: PageProps<"/admin">) {
  if (!isDbConfigured()) return <SetupNotice />;
  const { error } = await props.searchParams;
  const threads = await listThreadsWithCounts();

  return (
    <main className="admin">
      <AutoRefresh seconds={5} />
      <header className="row">
        <h1>Poem threads</h1>
        <form action={logout}>
          <button className="link">Log out</button>
        </form>
      </header>

      <form action={createThread} className="card create">
        <h2>New thread</h2>
        <input name="title" placeholder="Title, e.g. Spring Fair 2026" required maxLength={120} />
        <label>
          Default view{" "}
          <select name="default_mode" defaultValue="chronological">
            <option value="chronological">In order</option>
            <option value="rearranged">Rearranged</option>
          </select>
        </label>
        <button type="submit">Create thread</button>
        {error && <p className="error">Please give the thread a title.</p>}
      </form>

      {threads.length === 0 ? (
        <p className="muted">No threads yet. Create your first one above.</p>
      ) : (
        <table className="threads">
          <thead>
            <tr>
              <th>Title</th>
              <th>Words</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/admin/${t.id}`}>{t.title}</Link>
                </td>
                <td>{t.word_count}</td>
                <td>
                  <span className={`badge ${t.status}`}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
