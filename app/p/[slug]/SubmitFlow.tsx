"use client";

import { useCallback, useEffect, useState } from "react";
import type { PoemState } from "@/app/api/p/[slug]/route";
import PoemView from "@/components/PoemView";

export default function SubmitFlow({
  slug,
  initiallyClosed,
}: {
  slug: string;
  initiallyClosed: boolean;
}) {
  // Visitors see the poem only after adding a word (or if the poem is closed).
  const [showPoem, setShowPoem] = useState(initiallyClosed);
  const [state, setState] = useState<PoemState | null>(null);
  const [word, setWord] = useState("");
  const [error, setError] = useState("");
  const [lastWord, setLastWord] = useState("");
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/p/${slug}`, { cache: "no-store" });
    if (res.ok) setState(await res.json());
  }, [slug]);

  // While the poem is on screen, check for updates (faster while it's rewriting).
  useEffect(() => {
    if (!showPoem) return;
    const delay = !state ? 0 : state.updating ? 3000 : 10000;
    const timer = setTimeout(refresh, delay);
    return () => clearTimeout(timer);
  }, [showPoem, state, refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch(`/api/p/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        if (res.status === 409) setShowPoem(true);
        return;
      }
      setLastWord(data.word);
      setState(data.state);
      setWord("");
      setShowPoem(true);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!showPoem) {
    return (
      <form className="add-word" onSubmit={submit}>
        <label htmlFor="word">Add a word</label>
        <input
          id="word"
          name="word"
          value={word}
          onChange={(e) => setWord(e.target.value.replace(/\s/g, ""))}
          autoComplete="off"
          autoCapitalize="none"
          autoFocus
          maxLength={30}
          placeholder="one word"
          required
        />
        <button type="submit" disabled={sending || word === ""}>
          {sending ? "Adding…" : "Add"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    );
  }

  const closed = state?.status === "closed" || initiallyClosed;

  return (
    <div className="after-submit">
      {lastWord && !closed && (
        <p className="thanks">
          Thanks! <strong>{lastWord}</strong> is now part of the poem.
        </p>
      )}
      {closed && <p className="note">This poem is finished and no longer taking words.</p>}
      {state ? <PoemView state={state} /> : <p className="muted">Loading the poem…</p>}
      {!closed && (
        <button
          className="secondary"
          onClick={() => {
            setShowPoem(false);
            setLastWord("");
          }}
        >
          Add another word
        </button>
      )}
    </div>
  );
}
