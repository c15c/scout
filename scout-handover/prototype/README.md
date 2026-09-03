# Prototype

Open `scout.html` in any browser. No build, no install, no network needed.

This single file is the accepted specification for Scout: the real 38-record
dataset, the real ranking engine, and the real interface. State persists in
localStorage under the key `scout.v1`; clear it to see onboarding again.

Three concatenated scripts:

- data  : EV.ITEMS (38 verified listings), EV.SOURCES (24 tiered sources), EV.RUN
- engine: EV.E — dates, occurrences, travel, learning, scoring, diversify
- ui    : views, modals, .ics export, event handling

The clock is pinned to 2 September 2026 (E.TODAY) so screenshots stay
reproducible. Production code should use the real clock.
