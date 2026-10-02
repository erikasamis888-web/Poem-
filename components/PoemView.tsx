"use client";

import { useState } from "react";
import type { PoemState } from "@/app/api/p/[slug]/route";

// Shows the cached poem with an In order / Rearranged toggle.
// Toggling only switches between saved versions: it never calls the AI.
export default function PoemView({ state }: { state: PoemState }) {
  const [mode, setMode] = useState(state.defaultMode);
  const text = state.poems[mode];

  return (
    <section className="poem-view">
      <div className="toggle" role="group" aria-label="Poem version">
        <button
          className={mode === "chronological" ? "active" : ""}
          aria-pressed={mode === "chronological"}
          onClick={() => setMode("chronological")}
        >
          In order
        </button>
        <button
          className={mode === "rearranged" ? "active" : ""}
          aria-pressed={mode === "rearranged"}
          onClick={() => setMode("rearranged")}
        >
          Rearranged
        </button>
      </div>
      {text ? (
        <pre className="poem">{text}</pre>
      ) : (
        <p className="muted">The poem is being written…</p>
      )}
      <p className="meta">
        {state.wordCount} {state.wordCount === 1 ? "word" : "words"}
        {state.updating && text ? " · updating with the newest words…" : ""}
      </p>
    </section>
  );
}
