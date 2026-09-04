"use client";
import { useState } from "react";

const INTERESTS = ["music", "arts", "food", "market", "theatre", "nature", "festival", "daytrip", "family"];

/**
 * Three questions, skippable, shown once. After that it only appears when the
 * user chooses "Run preference setup again" from the profile menu.
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [home, setHome] = useState("");
  const [budget, setBudget] = useState(120);

  const finish = async () => {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interests, home, budget, onboardedAt: new Date().toISOString() })
    });
    onDone();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" />
      <div className="fixed left-1/2 top-1/2 z-50 w-[min(540px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-line bg-panel p-7">
        {step === 0 && (
          <>
            <h2 className="text-xl font-semibold">What are you into?</h2>
            <p className="mt-1 text-ink2">Pick a few. You can change these any time from your profile.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INTERESTS.map((c) => (
                <button key={c}
                  onClick={() => setInterests(interests.includes(c) ? interests.filter((x) => x !== c) : [...interests, c])}
                  className={`min-h-10 rounded-full border border-line px-4 ${interests.includes(c) ? "border-accent bg-accent text-white" : ""}`}>
                  {c}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-xl font-semibold">Where do you start from?</h2>
            <p className="mt-1 text-ink2">Used for travel times only. Nothing is filtered out for being far.</p>
            <input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Suburb"
              className="mt-4 min-h-11 w-full rounded-[10px] border border-line px-3" />
            <label className="mt-4 block text-[14px] text-ink2">Comfortable spend per person: ${budget}</label>
            <input type="range" min={0} max={400} step={10} value={budget}
              onChange={(e) => setBudget(Number(e.target.value))} className="w-full" />
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold">Where should Scout look?</h2>
            <p className="mt-1 text-ink2">
              Venue, festival and council feeds are already on. Connect the social channels where most of
              this actually gets posted.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/api/auth/instagram" className="min-h-11 rounded-full border border-line px-4 leading-[44px]">Connect Instagram</a>
              <a href="/api/auth/tiktok" className="min-h-11 rounded-full border border-line px-4 leading-[44px]">Connect TikTok</a>
            </div>
          </>
        )}
        <div className="mt-6 flex gap-2">
          <button onClick={onDone} className="min-h-11 rounded-[10px] border border-line px-4">Skip</button>
          <button onClick={() => (step === 2 ? finish() : setStep(step + 1))}
            className="min-h-11 rounded-[10px] bg-accent px-4 font-semibold text-white">
            {step === 2 ? "Show me what\u2019s on" : "Continue"}
          </button>
        </div>
      </div>
    </>
  );
}
