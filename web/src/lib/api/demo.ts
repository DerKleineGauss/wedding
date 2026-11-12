import { newSecret, uuid } from "../ids";
import type { Api, Passenger, PlanMap, Release, Ride, Stay, Unit, WeddingConfig } from "./types";

/** Vorschau ohne Supabase: alles in localStorage dieses Browsers. Gleiche Regeln wie die RPCs. */
const KEY = "rugenhof.demo.v2";

type DemoDb = {
  units: Unit[];
  stays: (Stay & { secret: string })[];
  plan: PlanMap;
  config: WeddingConfig;
  release: Release;
  rides: (Ride & { secret: string })[];
  passengers: (Passenger & { secret: string })[];
};

const U = (id: string, name: string, group: string, beds: number, max: number, order: number, blocked: string[]): Unit =>
  ({ id, name, group, beds, max, note: "", order, blocked, asOf: "11.11.2026" });
const S = (name: string, persons: number, from: string, to: string, note = "") =>
  ({ id: uuid(), secret: newSecret(), name, persons, from, to, note, manual: true });

function seed(): DemoDb {
  const hecht = ["2027-07-29/2027-08-01", "2027-08-02/2027-08-06", "2027-08-20/2027-08-26"];
  const barsch = ["2027-07-29/2027-08-07", "2027-08-26/2027-08-29"];
  const offer: Ride & { secret: string } = {
    id: uuid(), secret: newSecret(), kind: "offer", name: "Beispiel: Jonas", origin: "Berlin-Friedrichshain", direction: "beide",
    dayOut: "2027-08-15", dayBack: "2027-08-18", timeNote: "ab 10 Uhr", seats: 3, contact: "0170 1234567", note: "Kombi, viel Platz für Gepäck",
    updatedAt: new Date().toISOString(),
  };
  return {
    units: [
      U("lutt-hecht", "Lütt Hecht", "Haus Hecht", 3, 5, 0, hecht),
      U("groot-hecht", "Groot Hecht", "Haus Hecht", 10, 14, 1, hecht),
      U("flussbarsch", "Flussbarsch", "Haus Barsch", 6, 8, 2, barsch),
      U("boddenbarsch", "Boddenbarsch", "Haus Barsch", 7, 9, 3, barsch),
      U("ploetz", "Haus Plötz", "Ganzes Haus", 10, 16, 4, ["2027-07-29/2027-08-07", "2027-08-19/2027-08-22", "2027-08-27/2027-08-29"]),
      U("boddenkieker", "FeWo Boddenkieker", "Ferienwohnung", 4, 6, 5, ["2027-07-29/2027-08-07"]),
    ],
    stays: [
      S("Beispiel: Familie Weber", 4, "2027-08-14", "2027-08-19", "Beispieleintrag"),
      S("Beispiel: Anna und Tom", 2, "2027-08-15", "2027-08-18"),
      S("Beispiel: Freundesgruppe", 6, "2027-08-16", "2027-08-18"),
      S("Beispiel: Oma Inge", 1, "2027-08-12", "2027-08-20", "Beispieleintrag"),
    ],
    plan: {},
    config: { weddingFrom: "2027-08-16", weddingTo: "2027-08-18" },
    release: { released: false, map: {} },
    rides: [
      offer,
      { id: uuid(), secret: newSecret(), kind: "request", name: "Beispiel: Lea", origin: "Hamburg Hbf", direction: "hin", dayOut: "2027-08-16", dayBack: null,
        timeNote: "vormittags", seats: 1, contact: "lea@example.org", note: "", updatedAt: new Date().toISOString() },
    ],
    passengers: [{ id: uuid(), secret: newSecret(), rideId: offer.id, name: "Beispiel: Mia", persons: 1, contact: "", note: "" }],
  };
}

const clone = <T,>(x: T): T => structuredClone(x);
const strip = <T extends { secret: string }>({ secret: _s, ...rest }: T) => rest;
const forbidden = () => Promise.reject(new Error("forbidden"));

export function makeDemoApi(): Api {
  let db: DemoDb;
  try {
    db = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    db = null as unknown as DemoDb;
  }
  if (!db?.units || !db.rides) db = seed();
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* privat/voll */ }
  };
  const done = async () => { persist(); };
  let admin = false;

  return {
    demo: true,
    hasSession: async () => admin,
    isAdmin: async () => admin,
    signIn: async () => { admin = true; },
    signOut: async () => { admin = false; },

    loadPublic: async () => clone({ units: db.units, stays: db.stays.map(strip), config: db.config, release: db.release }),
    loadPlan: async () => clone(db.plan),
    saveStay(e) {
      const ex = db.stays.find((s) => s.id === e.id);
      if (ex) {
        if (ex.secret !== e.secret) return forbidden();
        Object.assign(ex, { name: e.name, persons: e.persons, from: e.from, to: e.to, note: e.note });
      } else db.stays.push({ ...e, manual: false });
      return done();
    },
    deleteStay(id, secret) {
      const ex = db.stays.find((s) => s.id === id);
      if (!ex || ex.secret !== secret) return forbidden();
      db.stays = db.stays.filter((s) => s.id !== id);
      delete db.plan[id];
      return done();
    },
    adminSaveStay(e) {
      const ex = db.stays.find((s) => s.id === e.id);
      if (ex) Object.assign(ex, e);
      else db.stays.push({ ...e, secret: newSecret() });
      return done();
    },
    adminDeleteStay(id) {
      db.stays = db.stays.filter((s) => s.id !== id);
      delete db.plan[id];
      return done();
    },
    setAssignment(stayId, unitId) {
      if (unitId) db.plan[stayId] = unitId;
      else delete db.plan[stayId];
      return done();
    },
    setRelease(released, map) {
      db.release = { released, map: clone(map) };
      return done();
    },
    saveConfig(c) {
      db.config = clone(c);
      return done();
    },
    saveUnit(u) {
      const i = db.units.findIndex((x) => x.id === u.id);
      if (i >= 0) db.units[i] = clone(u);
      else db.units.push(clone(u));
      db.units.sort((a, b) => a.order - b.order);
      return done();
    },
    deleteUnit(id) {
      db.units = db.units.filter((u) => u.id !== id);
      for (const k of Object.keys(db.plan)) if (db.plan[k] === id) delete db.plan[k];
      return done();
    },

    loadRides: async () => clone({ rides: db.rides.map(strip), passengers: db.passengers.map(strip) }),
    saveRide(r) {
      const ex = db.rides.find((x) => x.id === r.id);
      const taken = db.passengers.filter((p) => p.rideId === r.id).reduce((a, p) => a + p.persons, 0);
      if (ex) {
        if (ex.secret !== r.secret) return forbidden();
        if (r.kind === "offer" && r.seats < taken) return Promise.reject(new Error("seats below passengers"));
        Object.assign(ex, r, { updatedAt: new Date().toISOString() });
        if (r.kind === "request") db.passengers = db.passengers.filter((p) => p.rideId !== r.id);
      } else db.rides.push({ ...r, updatedAt: new Date().toISOString() });
      return done();
    },
    deleteRide(id, secret) {
      const ex = db.rides.find((x) => x.id === id);
      if (!ex || ex.secret !== secret) return forbidden();
      db.rides = db.rides.filter((x) => x.id !== id);
      db.passengers = db.passengers.filter((p) => p.rideId !== id);
      return done();
    },
    joinRide(p) {
      const ride = db.rides.find((x) => x.id === p.rideId);
      if (!ride || ride.kind !== "offer") return Promise.reject(new Error("ride not found"));
      const taken = db.passengers.filter((x) => x.rideId === p.rideId && x.id !== p.id).reduce((a, x) => a + x.persons, 0);
      if (taken + p.persons > ride.seats) return Promise.reject(new Error("ride full"));
      const ex = db.passengers.find((x) => x.id === p.id);
      if (ex) {
        if (ex.secret !== p.secret) return forbidden();
        Object.assign(ex, p);
      } else db.passengers.push(clone(p));
      return done();
    },
    leaveRide(id, secret) {
      const ex = db.passengers.find((x) => x.id === id);
      if (!ex || ex.secret !== secret) return forbidden();
      db.passengers = db.passengers.filter((x) => x.id !== id);
      return done();
    },
    adminDeleteRide(id) {
      db.rides = db.rides.filter((x) => x.id !== id);
      db.passengers = db.passengers.filter((p) => p.rideId !== id);
      return done();
    },
    adminDeletePassenger(id) {
      db.passengers = db.passengers.filter((x) => x.id !== id);
      return done();
    },
  };
}
