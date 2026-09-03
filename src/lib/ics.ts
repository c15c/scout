/** .ics calendar export. Generates RFC 5545 format. */

export interface ICSEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  url?: string;
}

export function generateICS(events: ICSEvent[]): string {
  const now = new Date();
  const dateTime = (d: Date): string => {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const date = String(d.getUTCDate()).padStart(2, "0");
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    const seconds = String(d.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${date}T${hours}${minutes}${seconds}Z`;
  };

  const escape = (s: string): string => s.replace(/[\n\r]/g, "\\n");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scout//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    `DTSTAMP:${dateTime(now)}`
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${Math.random().toString(36).substr(2, 9)}@scout`);
    lines.push(`DTSTAMP:${dateTime(now)}`);
    lines.push(`DTSTART:${dateTime(event.startDate)}`);
    if (event.endDate) lines.push(`DTEND:${dateTime(event.endDate)}`);
    lines.push(`SUMMARY:${escape(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
