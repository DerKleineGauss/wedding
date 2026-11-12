/** Alle Daten sind Kalendertage (YYYY-MM-DD) und werden als UTC-Mitternacht gerechnet. */
export const DAY = 86_400_000;

export const pd = (s: string): number => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
export const fd = (t: number): string => new Date(t).toISOString().slice(0, 10);
export const okDate = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(pd(s));

const toT = (t: number | string) => (typeof t === "string" ? pd(t) : t);

/** 16.8. */
export const dm = (t: number | string): string => {
  const d = new Date(toT(t));
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
};

const fmtWd = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" });
const fmtMo = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });

export const weekday = (t: number | string) => fmtWd.format(toT(t));
export const monthShort = (t: number | string) => fmtMo.format(toT(t));
/** Mo., 16. August */
export const longDate = (t: number | string) => fmtLong.format(toT(t));

export const nightsBetween = (from: string, to: string) => Math.round((pd(to) - pd(from)) / DAY);
export const isWeekend = (t: number) => {
  const d = new Date(t).getUTCDay();
  return d === 0 || d === 6;
};

export const persons = (n: number) => `${n} ${n === 1 ? "Person" : "Personen"}`;
export const nightsLabel = (n: number) => `${n} ${n === 1 ? "Nacht" : "Nächte"}`;
