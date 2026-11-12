import { createClient } from "@supabase/supabase-js";
import type { Api, Passenger, Ride, Stay, Unit } from "./types";

type Row = Record<string, any>;

const mapStay = (r: Row): Stay => ({
  id: r.id, name: r.name, persons: r.persons, from: r.from_date, to: r.to_date, note: r.note ?? "", manual: !!r.manual,
});
const mapUnit = (r: Row): Unit => ({
  id: r.id, name: r.name, group: r.grp ?? "", beds: r.beds, max: r.max_beds, note: r.note ?? "",
  order: r.ord ?? 0, blocked: r.blocked ?? [], asOf: r.as_of ?? "",
});
const unitRow = (u: Unit) => ({
  id: u.id, name: u.name, grp: u.group, beds: u.beds, max_beds: u.max, note: u.note, ord: u.order, blocked: u.blocked, as_of: u.asOf,
});
const mapRide = (r: Row): Ride => ({
  id: r.id, kind: r.kind, name: r.name, origin: r.origin, direction: r.direction, dayOut: r.day_out, dayBack: r.day_back,
  timeNote: r.time_note ?? "", seats: r.seats, contact: r.contact ?? "", note: r.note ?? "", updatedAt: r.updated_at,
});
const mapPassenger = (r: Row): Passenger => ({
  id: r.id, rideId: r.ride_id, name: r.name, persons: r.persons, contact: r.contact ?? "", note: r.note ?? "",
});

/** PostgrestError ist kein Error; für Toasts und Logs vereinheitlichen. */
class DbError extends Error {
  code?: string;
  constructor(e: { message?: string; code?: string; details?: string }) {
    super(e.message || e.details || "DB-Fehler");
    this.code = e.code;
  }
}
function chk<T>(r: { data: T | null; error: any }): T {
  if (r.error) throw new DbError(r.error);
  return r.data as T;
}

export function makeSupabaseApi(rawUrl: string, key: string): Api {
  const url = rawUrl.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });

  return {
    demo: false,
    async hasSession() {
      const { data } = await sb.auth.getSession();
      return !!data.session;
    },
    async isAdmin() {
      const r = await sb.rpc("is_admin");
      return !r.error && !!r.data;
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new DbError(error);
    },
    async signOut() {
      await sb.auth.signOut();
    },

    async loadPublic() {
      const [u, s, c, rel] = await Promise.all([
        sb.from("units").select("*").order("ord"),
        sb.from("stays_public").select("*"),
        sb.from("config").select("*").eq("id", 1).maybeSingle(),
        sb.from("release").select("*").eq("id", 1).maybeSingle(),
      ]);
      const cfg = chk(c) ?? ({} as Row);
      const re = chk(rel) ?? ({} as Row);
      return {
        units: chk(u).map(mapUnit),
        stays: chk(s).map(mapStay),
        config: { weddingFrom: cfg.wedding_from ?? "", weddingTo: cfg.wedding_to ?? "" },
        release: { released: !!re.released, map: re.map ?? {} },
      };
    },
    async loadPlan() {
      const rows = chk(await sb.from("assignments").select("*"));
      return Object.fromEntries(rows.map((x: Row) => [x.stay_id, x.unit_id]));
    },
    async saveStay(e) {
      chk(await sb.rpc("save_stay", { p_id: e.id, p_secret: e.secret, p_name: e.name, p_persons: e.persons, p_from: e.from, p_to: e.to, p_note: e.note }));
    },
    async deleteStay(id, secret) {
      chk(await sb.rpc("delete_stay", { p_id: id, p_secret: secret }));
    },
    async adminSaveStay(e) {
      chk(await sb.from("stays").upsert({
        id: e.id, name: e.name, persons: e.persons, from_date: e.from, to_date: e.to, note: e.note, manual: e.manual, updated_at: new Date().toISOString(),
      }));
    },
    async adminDeleteStay(id) {
      chk(await sb.from("stays").delete().eq("id", id));
    },
    async setAssignment(stayId, unitId) {
      chk(unitId
        ? await sb.from("assignments").upsert({ stay_id: stayId, unit_id: unitId })
        : await sb.from("assignments").delete().eq("stay_id", stayId));
    },
    async setRelease(released, map) {
      chk(await sb.from("release").upsert({ id: 1, released, map, at: new Date().toISOString() }));
    },
    async saveConfig(c) {
      chk(await sb.from("config").upsert({ id: 1, wedding_from: c.weddingFrom || null, wedding_to: c.weddingTo || null }));
    },
    async saveUnit(u) {
      chk(await sb.from("units").upsert(unitRow(u)));
    },
    async deleteUnit(id) {
      chk(await sb.from("units").delete().eq("id", id));
    },

    async loadRides() {
      const [r, p] = await Promise.all([
        sb.from("rides_public").select("*"),
        sb.from("ride_passengers_public").select("*").order("created_at"),
      ]);
      return { rides: chk(r).map(mapRide), passengers: chk(p).map(mapPassenger) };
    },
    async saveRide(r) {
      chk(await sb.rpc("save_ride", {
        p_id: r.id, p_secret: r.secret, p_kind: r.kind, p_name: r.name, p_origin: r.origin, p_direction: r.direction,
        p_day_out: r.dayOut, p_day_back: r.dayBack, p_time_note: r.timeNote, p_seats: r.seats, p_contact: r.contact, p_note: r.note,
      }));
    },
    async deleteRide(id, secret) {
      chk(await sb.rpc("delete_ride", { p_id: id, p_secret: secret }));
    },
    async joinRide(p) {
      chk(await sb.rpc("join_ride", {
        p_id: p.id, p_secret: p.secret, p_ride: p.rideId, p_name: p.name, p_persons: p.persons, p_contact: p.contact, p_note: p.note,
      }));
    },
    async leaveRide(id, secret) {
      chk(await sb.rpc("leave_ride", { p_id: id, p_secret: secret }));
    },
    async adminDeleteRide(id) {
      chk(await sb.from("rides").delete().eq("id", id));
    },
    async adminDeletePassenger(id) {
      chk(await sb.from("ride_passengers").delete().eq("id", id));
    },
  };
}
