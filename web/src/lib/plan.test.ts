import { describe, expect, it } from "vitest";
import { pd } from "./dates";
import { blockedFor, cleanPlan, cleanStays, diffRelease, headcount, loadLevel, nightsFor, occupancy, peakFor, weddingRange } from "./plan";
import { matchesFor, sameArea, seatsLeft } from "./rides";
import type { Passenger, Ride, Stay, Unit } from "./api/types";

const st = (id: string, persons: number, from: string, to: string): Stay => ({ id, name: id, persons, from, to, note: "", manual: false });
const unit = (id: string, beds: number, max: number, blocked: string[] = []): Unit => ({ id, name: id, group: "", beds, max, note: "", order: 0, blocked, asOf: "" });

describe("plan", () => {
  const a = st("a", 2, "2027-08-15", "2027-08-18");
  const b = st("b", 3, "2027-08-16", "2027-08-17");

  it("filters invalid and sorts", () => {
    const list = cleanStays([b, st("x", 1, "2027-08-18", "2027-08-18"), a]);
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("builds at least 7 nights incl. wedding", () => {
    const n = nightsFor([b], weddingRange({ weddingFrom: "2027-08-16", weddingTo: "2027-08-18" }));
    expect(n.length).toBe(7);
    expect(n[0]).toBe(pd("2027-08-16"));
  });

  it("counts nights with departure day exclusive", () => {
    expect(headcount([a, b], pd("2027-08-16"))).toBe(5);
    expect(headcount([a, b], pd("2027-08-17"))).toBe(2);
    expect(headcount([a, b], pd("2027-08-18"))).toBe(0);
  });

  it("peak and occupancy per unit", () => {
    const map = { a: "u", b: "u" };
    expect(peakFor("u", map, [a, b])).toBe(5);
    expect(occupancy("u", map, [a, b], [pd("2027-08-15"), pd("2027-08-16")])).toEqual([2, 5]);
    expect(loadLevel(5, { beds: 4, max: 6 })).toBe("tight");
    expect(loadLevel(7, { beds: 4, max: 6 })).toBe("over");
  });

  it("detects external bookings, departure exclusive", () => {
    const u = unit("u", 4, 6, ["2027-08-10/2027-08-15", "2027-08-17/2027-08-20"]);
    expect(blockedFor(u, a)).toEqual([["2027-08-17", "2027-08-20"]]);
  });

  it("cleans plan and diffs release", () => {
    const map = cleanPlan({ a: "u", b: "gone", zz: "u" }, [a, b], [unit("u", 1, 1)]);
    expect(map).toEqual({ a: "u" });
    expect(diffRelease({ a: "u", b: "v" }, { a: "w", c: "u" })).toEqual({ added: ["b"], moved: ["a"], removed: ["c"] });
  });
});

describe("rides", () => {
  const base = { contact: "", note: "", timeNote: "", updatedAt: "" };
  const offer: Ride = { ...base, id: "o", kind: "offer", name: "O", origin: "Berlin-Mitte", direction: "beide", dayOut: "2027-08-15", dayBack: "2027-08-18", seats: 3 };
  const req: Ride = { ...base, id: "r", kind: "request", name: "R", origin: "berlin hbf", direction: "hin", dayOut: "2027-08-16", dayBack: null, seats: 2 };
  const far: Ride = { ...req, id: "f", dayOut: "2027-08-10" };
  const pass: Passenger[] = [{ id: "p", rideId: "o", name: "P", persons: 1, contact: "", note: "" }];

  it("seats left", () => expect(seatsLeft(offer, pass)).toBe(2));
  it("fuzzy area", () => {
    expect(sameArea("Berlin-Mitte", "berlin hbf")).toBe(true);
    expect(sameArea("Köln", "Hamburg")).toBe(false);
  });
  it("matches by direction, date ±1 and capacity", () => {
    const m = matchesFor(req, [offer, req, far], pass);
    expect(m.map((x) => x.ride.id)).toEqual(["o"]);
    expect(m[0].reasons).toContain("gleiche Gegend");
    expect(matchesFor(req, [offer], [...pass, { ...pass[0], id: "q", persons: 1 }])).toEqual([]);
  });
});
