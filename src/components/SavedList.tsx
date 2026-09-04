"use client";

import { useMemo } from "react";
import type { Discovery } from "@/lib/types";
import { downloadIcs, type IcsEvent } from "@/lib/ics";
import { regionLabel } from "@/lib/regions";

/**
 * My list. Deliberately not a weekend planner - the person picks the days, so
 * saved items are simply grouped by how soon they are.
 */
function toIcs(d: Discovery): IcsEvent {
  const start = new Date(d.starts_at ?? Date.now());
  const end = new Date(d.ends_at ?? start.getTime() + 2 * 3600 * 1000);
  return {
    id: d.id,
    title: d.title,
    description: d.description ?? "",
    location: [d.venue_name, d.address].filter(Boolean).join(", "),
    url: d.source_url,
    start,
    end,
  };
}

export default function SavedList({
  items,
  onRemove,
  onOpen,
  onImport,
}: {
  items: Discovery[];
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
  onImport: () => void;
}) {
  const groups = useMemo(() => {
    const now = Date.now();
    const g: Record<string, Discovery[]> = { soon: [], week: [], later: [], any: [] };
    for (const d of items) {
      if (!d.starts_at) g.any.push(d);
      else {
        const days = (new Date(d.starts_at).getTime() - now) / 86400000;
        if (days <= 2) g.soon.push(d);
        else if (days <= 7) g.week.push(d);
        else g.later.push(d);
      }
    }
    return g;
  }, [items]);

  const sections: Array<[string, Discovery[]]> = [
    ["Next 48 hours", groups.soon],
    ["This week", groups.week],
    ["Further out", groups.later],
    ["On regularly \u2014 go whenever", groups.any],
  ];

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-serif italic text-jacaranda">Your list</p>
          <p className="font-serif text-lg">{items.length} saved</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={onImport}>
            Add something you saw
          </button>
          {items.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => downloadIcs("scout-list.ics", items.map(toIcs))}
            >
              Add all to calendar
            </button>
          )}
        </div>
      </header>

      {items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink3">
          Nothing saved yet. Hit Save on anything in Discover.
        </p>
      )}

      {sections.map(([label, list]) =>
        list.length === 0 ? null : (
          <div key={label} className="mb-6">
            <h3 className="mb-2 font-serif text-base">{label}</h3>
            <div className="flex flex-col gap-2">
              {list.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3"
                >
                  <div className="min-w-0 flex-1">
                    <b className="block text-sm">{d.title}</b>
                    <span className="text-xs text-ink2">
                      {d.venue_name} &middot; {regionLabel(d.region ?? "")}
                      {d.user_submitted ? " \u00b7 added by you, unverified" : ""}
                    </span>
                  </div>
                  <button className="btn btn-sm" onClick={() => onOpen(d.id)}>
                    Open
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => downloadIcs(d.id + ".ics", [toIcs(d)])}
                  >
                    Calendar
                  </button>
                  <button className="btn btn-sm" onClick={() => onRemove(d.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </section>
  );
}
