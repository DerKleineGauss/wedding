import { makeDemoApi } from "./demo";
import { makeSupabaseApi } from "./supabase";
import type { Api } from "./types";

export * from "./types";

let instance: Api | null = null;

/** Ein Client pro Seite, geteilt von allen Islands. Ohne Env-Variablen: Demo-Modus. */
export function getApi(): Api {
  if (instance) return instance;
  const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_SUPABASE_KEY as string | undefined;
  instance = url && key ? makeSupabaseApi(url, key) : makeDemoApi();
  return instance;
}

/** Fehlertexte für Gäste. Technische Details landen in der Konsole. */
export function errorText(e: unknown): string {
  const m = String((e as Error)?.message ?? e ?? "");
  console.error("[Rugenhof]", e);
  if (/forbidden/i.test(m)) return "Dieser Eintrag gehört zu einem anderen Gerät. Öffne dafür deinen persönlichen Bearbeitungslink.";
  if (/ride full/i.test(m)) return "In diesem Auto sind nicht mehr genug Plätze frei.";
  if (/seats below/i.test(m)) return "Es fahren schon mehr Leute mit, als Plätze übrig wären.";
  if (/ride not found/i.test(m)) return "Dieses Angebot gibt es nicht mehr.";
  if (/limit/i.test(m)) return "Es sind schon sehr viele Einträge vorhanden. Bitte meldet euch beim Brautpaar.";
  if (/row-level security|permission|jwt|401|403/i.test(m)) return "Dafür fehlt die Berechtigung.";
  return "Das hat nicht geklappt. Prüfe deine Verbindung und versuch es noch einmal.";
}
