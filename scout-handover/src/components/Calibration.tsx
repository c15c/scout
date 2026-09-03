"use client";

import { useState } from "react";
import type { Discovery } from "@/lib/types";

/**
 * Taste check. Eight real listings, one per category, reacted to at signup.
 * This exists because a cold feed is the fastest way to lose somebody: the
 * first screen after onboarding is already shaped by something learned.
 */
export default function Calibration({
  items,
  onDone,
}: {
  items: Discovery[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const item = items[i];
  if (!item) return null;

  async function react(type: string | null) {
    if (type) {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          discovery_id: item.id,
          type,
          source: "calibration",
        }),
      });
    }
    if (i + 1 >= items.length) onDone();
    else setI(i + 1);
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <p className="font-serif italic text-jacaranda">Last thing</p>
      <h1 className="font-serif text-3xl leading-tight">
        A quick taste check &mdash; {items.length} real listings.
      </h1>
      <p className="mt-2 mb-6 text-ink2">
        This teaches Scout faster than any settings screen. Skip anything you are
        unsure about.
      </p>

      <div className="mb-5 flex gap-1.5">
        {items.map((_, n) => (
          <span
            key={n}
            className={
              "h-2 w-2 rounded-full " +
              (n < i ? "bg-jacaranda" : n === i ? "scale-125 bg-teal" : "bg-line")
            }
          />
        ))}
      </div>

      <article className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="p-5">
          <p className="text-xs text-ink3">
            {item.category} &middot; {item.region}
          </p>
          <h2 className="font-serif text-xl">{item.title}</h2>
          <p className="mt-2 text-sm text-ink2">{item.description}</p>
        </div>
      </article>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn" onClick={() => react(null)}>
          Skip
        </button>
        <button className="btn" onClick={() => react("down")}>
          Not for me
        </button>
        <button className="btn" onClick={() => react("up")}>
          Interested
        </button>
        <button className="btn btn-primary" onClick={() => react("save")}>
          Love it
        </button>
      </div>

      <p className="mt-3 text-xs text-ink3">
        {i + 1} of {items.length}
      </p>
    </div>
  );
}
