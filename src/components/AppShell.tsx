"use client";
import { useEffect, useState } from "react";
import ProfileMenu from "./ProfileMenu";
import SettingsDrawer from "./SettingsDrawer";
import Onboarding from "./Onboarding";

const NAV = [
  { key: "discover", label: "What\u2019s on" },
  { key: "saved", label: "Saved" },
  { key: "sources", label: "Sources" }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState("discover");
  const [settings, setSettings] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    // onboarding shows once, then only when the user asks for it again
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setNeedsOnboarding(!p?.onboardedAt))
      .catch(() => setNeedsOnboarding(false));
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-[238px] shrink-0 flex-col gap-6 border-r border-line bg-panel p-4">
        <div className="flex items-center gap-2.5 px-2 text-[19px] font-semibold tracking-tight">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-accent text-white">s</span>
          Scout
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              className={`min-h-11 rounded-[10px] px-2.5 text-left text-[15px] ${
                tab === n.key ? "bg-accent-soft font-semibold text-accent" : "hover:bg-canvas"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur md:px-7">
          <input
            className="min-h-10 w-full max-w-[460px] rounded-[10px] border border-line bg-panel px-3"
            placeholder="Search what\u2019s on\u2026"
          />
          {/* standard SaaS placement: everything personal lives top-right */}
          <ProfileMenu onOpen={(t) => setSettings(t)} />
        </header>
        <main className="w-full max-w-[1180px] px-4 pb-24 pt-6 md:px-7">{children}</main>
      </div>

      {settings && (
        <SettingsDrawer
          tab={settings}
          onTab={setSettings}
          onClose={() => setSettings(null)}
          onRerun={() => {
            setSettings(null);
            setNeedsOnboarding(true);
          }}
        />
      )}
      {needsOnboarding && <Onboarding onDone={() => setNeedsOnboarding(false)} />}
    </div>
  );
}
