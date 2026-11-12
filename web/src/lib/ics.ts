/** Minimaler iCalendar-Export für ganztägige Termine (DTEND exklusiv = Abreisetag). */
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const d = (iso: string) => iso.replaceAll("-", "");

export type IcsEvent = { uid: string; title: string; from: string; to: string; location?: string; description?: string };

export function icsFile(events: IcsEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rugenhof//Hochzeit//DE", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@rugenhof-hochzeit`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d(e.from)}`,
      `DTEND;VALUE=DATE:${d(e.to)}`,
      `SUMMARY:${esc(e.title)}`,
    );
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(name: string, events: IcsEvent[]) {
  const blob = new Blob([icsFile(events)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const RUGENHOF_LOCATION = "Ferienanlage Rugenhof, Dreschvitz, Rügen";
