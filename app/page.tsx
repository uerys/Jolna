"use client";

import { useEffect, useState } from "react";

type Note = {
  id: number;
  content: string;
  created_at: string;
};

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadNotes() {
    setError("");

    try {
      const response = await fetch("/api/notes", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load notes");
      }

      setNotes(data.notes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to create note");
        }

        setContent("");
        setNotes(previous => [data.note, ...previous]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create note");
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">JOLNA Notes</h1>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={content}
          onChange={event => setContent(event.target.value)}
          placeholder="Write a note"
          className="flex-1 rounded-md border border-black/15 px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add"}
        </button>
      </form>

      <button
        onClick={loadNotes}
        className="w-fit rounded-md border border-black/20 px-3 py-1 text-sm"
      >
        Refresh
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="space-y-2">
        {notes.map(note => (
          <li
            key={note.id}
            className="rounded-md border border-black/10 px-3 py-2"
          >
            <p>{note.content}</p>
            <p className="mt-1 text-xs text-black/60">
              {new Date(note.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
