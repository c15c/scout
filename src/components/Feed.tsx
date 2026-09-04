"use client";
import { useEffect, useState } from "react";
import DiscoveryCard from "./DiscoveryCard";

const HORIZONS = [[3, "Next 3 days"], [7, "Next 7 days"], [14, "Next 2 weeks"], [30, "Next month"], [90, "Next 3 months"]] as const;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Feed() {
  const [horizon, setHorizon] = useState(14);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [free, setFree] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const q = new URLSearchParams({
      horizon: String(horizon),
      weekdays: weekdays.join(","),
      categories: cats.join(","),
      free: free ? "1" : "0"
    });
    fetch("/api/discoveries?" + q).then((r) => r.json()).then((d) => setRows(d.results ?? []));
  }, [horizon, weekdays, cats, free]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <>
      <header className="mb-4">
        <h1 className="text-[28px] font-semibold tracking-tight">What\u2019s on</h1>
        <p className="mt-1 text-[15px] text-ink2">{rows.length} verified things to do &middot; checked this morning</p>
      </header>

      {/* The user picks the days. Nothing is pinned to a Friday ritual. */}
      <div className="mb-5 flex flex-col gap-2.5">
        <div className="inline-flex flex-wrap gap-0.5 rounded-[10px] border border-line bg-panel p-0.5">
          {HORIZONS.map(([v, label]) => (
            <button key={v} onClick={() => setHorizon(v)}
              className={`min-h-9 rounded-lg px-3 text-[14px] ${horizon === v ? "bg-accent font-semibold text-white" : ""}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DOW.map((d, i) => (
            <button key={d} onClick={() => toggle(weekdays, i, setWeekdays)}
              className={`min-h-9 rounded-full border border-line px-3 text-[14px] ${weekdays.includes(i) ? "border-accent bg-accent text-white" : "bg-panel"}`}>
              {d}
            </button>
          ))}
          <button onClick={() => setFree(!free)}
            className={`min-h-9 rounded-full border border-line px-3 text-[14px] ${free ? "border-accent bg-accent text-white" : "bg-panel"}`}>
            Free only
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => (
          <DiscoveryCard key={d.id} d={d}
            onFeedback={(type) =>
              fetch("/api/feedback", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ discoveryId: d.id, type })
              })
            } />
        ))}
      </div>
    </>
  );
}
