import { useSyncExternalStore } from "react";

/**
 * Eigene Einträge dieses Geräts: id + Secret in localStorage.
 * Über einen Link `#<hashKey>=<uuid>.<secret>` kommt ein Eintrag auf ein weiteres Gerät.
 */
export type Key = { id: string; secret: string };

const HASH_RE = (k: string) => new RegExp(`^#${k}=([0-9a-f-]{36})\\.([0-9a-f]{16,64})$`, "i");

export function createKeyring(storageKey: string, hashKey: string) {
  let keys: Key[] = [];
  let loaded = false;
  const listeners = new Set<() => void>();

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      keys = Array.isArray(v) ? v.filter((e) => e?.id && e?.secret) : [];
    } catch {
      keys = [];
    }
    const m = HASH_RE(hashKey).exec(location.hash);
    if (m) {
      const id = m[1].toLowerCase();
      if (!keys.some((k) => k.id === id)) keys = [...keys, { id, secret: m[2] }];
      persist();
      history.replaceState(null, "", location.pathname + location.search);
    }
    loaded = true;
  }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(keys)); } catch { /* ignore */ }
  }
  function write() {
    persist();
    listeners.forEach((l) => l());
  }
  const ensure = () => { if (!loaded && typeof window !== "undefined") read(); };
  const EMPTY: Key[] = [];

  return {
    all(): Key[] { ensure(); return keys; },
    get(id: string | null | undefined) { ensure(); return id ? keys.find((k) => k.id === id) ?? null : null; },
    add(k: Key) { ensure(); if (!keys.some((x) => x.id === k.id)) { keys = [...keys, k]; write(); } },
    remove(id: string) { ensure(); keys = keys.filter((k) => k.id !== id); write(); },
    link(k: Key, path: string) { return `${location.origin}${path}#${hashKey}=${k.id}.${k.secret}`; },
    useKeys(): Key[] {
      return useSyncExternalStore(
        (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
        () => { ensure(); return keys; },
        () => EMPTY,
      );
    },
  };
}

/** Bestehender Schlüssel aus der alten Seite, damit alte Bearbeitungslinks und Einträge weiter gelten. */
export const stayKeys = createKeyring("rugenhof.entries.v1", "edit");
export const rideKeys = createKeyring("rugenhof.rides.v1", "fahrt");
export const seatKeys = createKeyring("rugenhof.seats.v1", "platz");
