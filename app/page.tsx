import Link from "next/link";

export default function Home() {
  return (
    <main className="narrow">
      <h1>Community Poems</h1>
      <p>
        Scan a poem&apos;s QR code to add your word. Every word becomes part of a poem
        written together.
      </p>
      <p className="muted">
        Organizer? <Link href="/admin">Go to the dashboard</Link>.
      </p>
    </main>
  );
}
