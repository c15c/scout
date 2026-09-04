"use client";

import { useState } from "react";

/**
 * The honest version of "pull it from Instagram". Platform APIs will not hand
 * over a following feed, so the person hands Scout what they saw. It is stored
 * as theirs and flagged unverified - never dressed up as an ingested listing.
 */
export default function ImportModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    venue_name: "",
    starts_at: "",
    source_url: "",
    category: "festival",
  });
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.title.trim()) return;
    setBusy(true);
    await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-parchment p-6">
        <p className="font-serif italic text-jacaranda">Add something you saw</p>
        <h2 className="font-serif text-2xl">Spotted something on Instagram or TikTok?</h2>
        <p className="mt-2 mb-5 text-sm text-ink2">
          Put in what you know. Scout saves it marked as yours and unverified. It
          will not invent a date, a price or a photo you did not give it.
        </p>

        {[
          ["title", "What is it?"],
          ["venue_name", "Where?"],
          ["starts_at", "Date, if you know it (YYYY-MM-DD)"],
          ["source_url", "Link, if you have one"],
        ].map(([k, label]) => (
          <label key={k} className="mb-4 block">
            <span className="mb-1 block text-xs text-ink2">{label}</span>
            <input
              className="w-full rounded-lg border border-line bg-white p-3"
              value={(form as Record<string, string>)[k]}
              onChange={(e) => set(k, e.target.value)}
            />
          </label>
        ))}

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            Save to my list
          </button>
        </div>
      </div>
    </div>
  );
}
