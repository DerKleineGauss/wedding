import { DAY, pd } from "./dates";
import type { Passenger, Ride } from "./api/types";

export const taken = (rideId: string, passengers: Passenger[]) =>
  passengers.filter((p) => p.rideId === rideId).reduce((a, p) => a + p.persons, 0);

export const seatsLeft = (r: Ride, passengers: Passenger[]) => Math.max(0, r.seats - taken(r.id, passengers));

export const goesOut = (r: Ride) => r.direction !== "rueck";
export const goesBack = (r: Ride) => r.direction !== "hin";

/** Erster relevanter Tag fürs Sortieren. */
export const sortDay = (r: Ride) => r.dayOut ?? r.dayBack ?? "9999-12-31";

const near = (a: string | null, b: string | null, tolDays: number) =>
  !!a && !!b && Math.abs(pd(a) - pd(b)) <= tolDays * DAY;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9 ]/g, " ");

/** Gleicher Ort, grob: gemeinsames Wort mit mind. 4 Zeichen ("Berlin-Mitte" ~ "berlin hbf"). */
export function sameArea(a: string, b: string): boolean {
  const wa = new Set(norm(a).split(/\s+/).filter((w) => w.length >= 4));
  return norm(b).split(/\s+/).some((w) => w.length >= 4 && wa.has(w));
}

export type Match = { ride: Ride; score: number; reasons: string[] };

/**
 * Passende Gegenstücke: zu einem Gesuch die Angebote (mit genug freien Plätzen) und umgekehrt.
 * Richtung muss sich überschneiden, Datum ±1 Tag. Gleicher Ort erhöht den Score.
 */
export function matchesFor(r: Ride, all: Ride[], passengers: Passenger[]): Match[] {
  const other = all.filter((x) => x.kind !== r.kind && x.id !== r.id);
  const out: Match[] = [];
  for (const x of other) {
    const offer = r.kind === "offer" ? r : x;
    const req = r.kind === "offer" ? x : r;
    if (seatsLeft(offer, passengers) < req.seats) continue;
    const reasons: string[] = [];
    let score = 0;
    const outOk = goesOut(req) && goesOut(offer) && near(req.dayOut, offer.dayOut, 1);
    const backOk = goesBack(req) && goesBack(offer) && near(req.dayBack, offer.dayBack, 1);
    if (!outOk && !backOk) continue;
    if (outOk) { score += req.dayOut === offer.dayOut ? 2 : 1; reasons.push("Hinfahrt"); }
    if (backOk) { score += req.dayBack === offer.dayBack ? 2 : 1; reasons.push("Rückfahrt"); }
    if (sameArea(req.origin, offer.origin)) { score += 3; reasons.push("gleiche Gegend"); }
    out.push({ ride: x, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}
