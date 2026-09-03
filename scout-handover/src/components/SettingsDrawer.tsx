"use client";
import { useEffect, useState } from "react";
import { SETTINGS_TABS } from "./ProfileMenu";

/**
 * Everything that used to clutter the main navigation lives here, behind the
 * profile picture: account, preferences, what the agent learned, what it did
 * this morning, and what it deliberately held back.
 */
export default function SettingsDrawer({
  tab, onTab, onClose, onRerun
}: { tab: string; onTab: (t: string) => void; onClose: () => void; onRerun: () => void }) {
  const [data, setData] = useState<any>({ held: [], learned: [], sources: [] });

  useEffect(() => {
    Promise.all([
      fetch("/api/discoveries?horizon=90").then((r) => r.json()),
      fetch("/api/sources").then((r) => r.json())
    ]).then(([feed, src]) => setData({ held: feed.held ?? [], learned: feed.learned ?? [], sources: src.sources ?? [] }));
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-[min(520px,96vw)] flex-col border-l border-line bg-panel">
        <div className="flex items-center gap-3 border-b border-line p-5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white">C</span>
          <strong>Your profile</strong>
          <button onClick={onClose} className="ml-auto h-9 w-9 rounded-[9px] border border-line">\u2715</button>
        </div>
        <nav className="flex gap-1 overflow-auto border-b border-line p-3">
          {SETTINGS_TABS.map((t) => (
            <button key={t.key} onClick={() => onTab(t.key)}
              className={`min-h-9 whitespace-nowrap rounded-[9px] px-3 text-[14px] ${tab === t.key ? "bg-accent-soft font-semibold text-accent" : ""}`}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-3 overflow-auto p-5">
          {tab === "held" && data.held.map((h: any) => (
            <div key={h.sourceUrl} className="flex items-center gap-3 rounded-xl border border-line p-3 text-[14px]">
              <div className="flex-1"><strong>{h.title}</strong> <span className="text-ink2">\u00b7 {h.reason}</span></div>
              <a href={h.sourceUrl} target="_blank" rel="noopener" className="text-accent">source \u2197</a>
            </div>
          ))}

          {tab === "learned" && data.learned.map((l: any) => (
            <div key={l.key} className="rounded-xl border border-line p-3 text-[14px]">
              <strong>{l.weight > 0 ? "You like " : "You avoid "}{l.label}</strong>
              <span className="text-ink2"> \u00b7 from {l.evidenceCount} signals</span>
            </div>
          ))}

          {tab === "activity" && data.sources.map((s: any) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line p-3 text-[14px]">
              <div className="flex-1">
                <strong>{s.name}</strong> <span className="text-ink2">{s.domain}</span>
                <div className="text-ink2">
                  {s.kind} \u00b7 every {Math.round(s.cadence_minutes / 60)}h \u00b7 last run {s.last_run_at ?? "never"}
                </div>
              </div>
              <span className="text-ink2">{Math.round(s.reliability * 100)}%</span>
            </div>
          ))}

          {tab === "account" && (
            <button onClick={onRerun} className="min-h-11 rounded-[10px] border border-line px-4 text-left">
              Run preference setup again
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
