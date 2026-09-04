"use client";

type Props = {
  d: {
    id: string; title: string; category: string; venueName: string | null;
    priceMin: number | null; priceMax: number | null;
    imageUrl: string | null; imageCredit: string | null;
    sourceUrl: string; source?: { domain?: string };
    score: number; why: string[]; distanceKm: number; whenLabel: string;
  };
  onFeedback: (type: string) => void;
};

export default function DiscoveryCard({ d, onFeedback }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel hover:border-accent">
      {/* Images are hot-linked from the source page. If the source published no
          image we render a typographic tile instead of inventing one. */}
      {d.imageUrl ? (
        <div className="relative aspect-video">
          <img src={d.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          {d.imageCredit && (
            <span className="absolute bottom-1.5 right-2 rounded bg-black/45 px-1.5 text-[11px] text-white">
              {d.imageCredit}
            </span>
          )}
        </div>
      ) : (
        <div className="relative grid aspect-video place-items-center bg-canvas px-4 text-center text-[19px] font-semibold text-ink2">
          {d.title}
          <span className="absolute bottom-2 left-2.5 text-[11px] font-normal">
            no image published by {d.source?.domain}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink2">{d.category}</span>
          <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
            {d.score}% match
          </span>
        </div>
        <h3 className="text-[17px] font-semibold leading-tight">{d.title}</h3>
        <div className="text-[14px] font-medium">{d.whenLabel}</div>
        <div className="text-[14px] text-ink2">
          {d.venueName} &middot; {d.distanceKm} km &middot; {d.priceMin ? `$${d.priceMin}` : "Free"}
        </div>
        {d.why.length > 0 && <p className="text-[14px] italic text-ink2">Because {d.why.join(", ")}.</p>}

        <div className="mt-auto flex items-center gap-2 border-t border-line pt-2.5">
          {/* the link always points at the page the facts came from */}
          <a href={d.sourceUrl} target="_blank" rel="noopener" className="text-[13px] text-ink2 hover:text-accent">
            {d.source?.domain} &#8599;
          </a>
          <div className="ml-auto flex gap-1">
            <button aria-label="Save" onClick={() => onFeedback("save")} className="h-9 w-9 rounded-[9px] border border-line">&#9734;</button>
            <button aria-label="Not for me" onClick={() => onFeedback("down")} className="h-9 w-9 rounded-[9px] border border-line">&#10005;</button>
          </div>
        </div>
      </div>
    </article>
  );
}
