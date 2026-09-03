/**
 * Calendar export. Scout writes a standards-compliant .ics file rather than
 * asking for access to anybody's calendar account - nothing is read back.
 */
export type IcsEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  url: string;
  start: Date;
  end: Date;
};

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function stamp(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    "00Z"
  );
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildIcs(events: IcsEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scout//SEQ//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + e.id + "@scout.app");
    lines.push("DTSTAMP:" + stamp(new Date()));
    lines.push("DTSTART:" + stamp(e.start));
    lines.push("DTEND:" + stamp(e.end));
    lines.push("SUMMARY:" + esc(e.title));
    lines.push("LOCATION:" + esc(e.location));
    lines.push("DESCRIPTION:" + esc(e.description + " Source: " + e.url));
    lines.push("URL:" + e.url);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, events: IcsEvent[]): void {
  const blob = new Blob([buildIcs(events)], {
    type: "text/calendar;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}
