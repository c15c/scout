# scout-handover — frozen reference snapshot

This folder is **not** part of the application. Nothing in it is compiled, imported, built or
deployed, and it should not be edited.

It contains one thing worth keeping:

- `prototype/scout.html` — the single-file, zero-dependency prototype that was reviewed and
  accepted. Real data, the real scoring engine, the real UI, `localStorage` persistence. Open it
  in a browser. **This is the accepted UX specification.** Where the app and the prototype
  disagree, the prototype is right.

Everything else that used to live here — a full duplicate of `src/`, `supabase/`, the configs,
`AGENTS.md`, `HANDOVER.md`, `Initiative.md`, `LICENSE` and `docs/` — was a copy of the real tree
and has been removed. The live versions are at the repository root:

| Was | Now |
| --- | --- |
| `scout-handover/src/`, `supabase/`, configs | `src/`, `supabase/`, root configs |
| `scout-handover/AGENTS.md` | `AGENTS.md` |
| `scout-handover/HANDOVER.md` | `HANDOVER.md` |
| `scout-handover/Initiative.md` | `INITIATIVE.md` |
| `scout-handover/docs/` | `docs/` |

The duplicate was actively harmful: tooling kept resolving `supabase/schema.sql` and other paths
to the copy instead of the real file.
