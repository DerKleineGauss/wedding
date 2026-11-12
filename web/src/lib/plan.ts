import { DAY, okDate, pd } from "./dates";
import type { PlanMap, Stay, Unit, WeddingConfig } from "./api/types";

/** Gültige Einträge, sortiert nach Anreise, Abreise, Name. */
export function cleanStays(stays: Stay[]): Stay[] {
  return stays
    .map((s) => ({ ...s, name: String(s.name || "Gast"), persons: Math.max(1, Math.round(+s.persons || 1)), note: String(s.note || "") }))
    .filter((s) => okDate(s.from) && okDate(s.to) && pd(s.to) > pd(s.from))
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.name.localeCompare(b.name, "de"));
}

export type Range = { from: number; to: number };

export function weddingRange(c: WeddingConfig | undefined): Range | null {
  if (!c || !okDate(c.weddingFrom)) return null;
  const f = pd(c.weddingFrom);
  const t = okDate(c.weddingTo) && pd(c.weddingTo) >= f ? pd(c.weddingTo) : f;
  return { from: f, to: t };
}

/** Nächte (Start-Zeitstempel) von der ersten Anreise bis zur letzten Nacht, mindestens 7, inkl. Hochzeit. */
export function nightsFor(list: Stay[], wed: Range | null): number[] {
  let min = Infinity;
  let max = -Infinity;
  for (const s of list) {
    min = Math.min(min, pd(s.from));
    max = Math.max(max, pd(s.to) - DAY);
  }
  if (wed) {
    min = Math.min(min, wed.from);
    max = Math.max(max, wed.to);
  }
  if (!Number.isFinite(min)) return [];
  while ((max - min) / DAY < 6) max += DAY;
  const out: number[] = [];
  for (let t = min; t <= max; t += DAY) out.push(t);
  return out;
}

export const presentOn = (s: Stay, night: number) => pd(s.from) <= night && night < pd(s.to);
export const headcount = (list: Stay[], night: number) => list.reduce((a, s) => a + (presentOn(s, night) ? s.persons : 0), 0);

export function occupancy(unitId: string, map: PlanMap, list: Stay[], nights: number[]): number[] {
  const rel = list.filter((s) => map[s.id] === unitId);
  return nights.map((t) => headcount(rel, t));
}

export function peakFor(unitId: string, map: PlanMap, list: Stay[]): number {
  const rel = list.filter((s) => map[s.id] === unitId);
  if (!rel.length) return 0;
  const lo = Math.min(...rel.map((s) => pd(s.from)));
  const hi = Math.max(...rel.map((s) => pd(s.to)));
  let peak = 0;
  for (let t = lo; t < hi; t += DAY) peak = Math.max(peak, headcount(rel, t));
  return peak;
}

/** Fremdbuchungen der Einheit, die sich mit dem Aufenthalt überschneiden. */
export function blockedFor(u: Unit, s: Pick<Stay, "from" | "to">): [string, string][] {
  const out: [string, string][] = [];
  for (const r of u.blocked ?? []) {
    const [a, b] = String(r).split("/");
    if (okDate(a) && okDate(b) && pd(s.from) < pd(b) && pd(a) < pd(s.to)) out.push([a, b]);
  }
  return out;
}

export type Load = "ok" | "tight" | "over";
export function loadLevel(n: number, u: Pick<Unit, "beds" | "max">): Load {
  if (n > Math.max(u.max, u.beds)) return "over";
  if (n > u.beds) return "tight";
  return "ok";
}

export function bedTotals(units: Unit[]) {
  return units.reduce((a, u) => ({ beds: a.beds + (+u.beds || 0), max: a.max + Math.max(+u.max || 0, +u.beds || 0) }), { beds: 0, max: 0 });
}

/** Zuteilungen ohne Verweise auf gelöschte Gäste oder Häuser. */
export function cleanPlan(map: PlanMap, stays: Stay[], units: Unit[]): PlanMap {
  const sIds = new Set(stays.map((s) => s.id));
  const uIds = new Set(units.map((u) => u.id));
  return Object.fromEntries(Object.entries(map).filter(([s, u]) => sIds.has(s) && uIds.has(u)));
}

export type ReleaseDiff = { added: string[]; moved: string[]; removed: string[] };
/** Was Gäste nach "Veröffentlichen" anders sehen würden (stay ids). */
export function diffRelease(next: PlanMap, published: PlanMap): ReleaseDiff {
  const added: string[] = [];
  const moved: string[] = [];
  const removed: string[] = [];
  for (const [k, v] of Object.entries(next)) {
    if (!(k in published)) added.push(k);
    else if (published[k] !== v) moved.push(k);
  }
  for (const k of Object.keys(published)) if (!(k in next)) removed.push(k);
  return { added, moved, removed };
}
export const diffSize = (d: ReleaseDiff) => d.added.length + d.moved.length + d.removed.length;

/** Farbindex 1–6 je Einheit, 0 = noch offen. */
export const colorIndex = (units: Unit[], unitId: string | undefined) => {
  const i = unitId ? units.findIndex((u) => u.id === unitId) : -1;
  return i < 0 ? 0 : (i % 6) + 1;
};
