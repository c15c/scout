"use client";
import { useState } from "react";

export const SETTINGS_TABS = [
  { key: "account", label: "Account" },
  { key: "prefs", label: "Preferences" },
  { key: "learned", label: "What Scout learned" },
  { key: "activity", label: "Agent activity" },
  { key: "held", label: "What I held back" }
];

export default function ProfileMenu({ onOpen }: { onOpen: (tab: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative ml-auto">
      <button
        aria-label="Your profile"
        onClick={() => setOpen(!open)}
        className="grid h-11 w-11 place-items-center rounded-full"
      >
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-accent text-[13px] font-semibold text-white">
          C
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-[52px] w-[262px] rounded-2xl border border-line bg-panel p-2 shadow-xl">
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setOpen(false); onOpen(t.key); }}
              className="block w-full rounded-[9px] p-2.5 text-left text-[15px] hover:bg-canvas"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
