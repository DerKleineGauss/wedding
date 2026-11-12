import { useMemo, useState } from "react";
import { DAY, dm, isWeekend, longDate, monthShort, pd, persons, weekday } from "@/lib/dates";
import { bedTotals, colorIndex, headcount, nightsFor, presentOn, weddingRange } from "@/lib/plan";
import type { PlanMap, Stay, Unit, WeddingConfig } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { UNIT_BG } from "./unitColors";

type Props = {
  stays: Stay[];
  units: Unit[];
  map: PlanMap;
  config: WeddingConfig | undefined;
  mine?: Set<string>;
  loading?: boolean;
};

/**
 * Wer ist wann da: eine Zeile pro Eintrag, eine Spalte pro Nacht.
 * Antippen einer Nacht zeigt darunter, wer in dieser Nacht auf dem Hof ist.
 */
export function Timeline({ stays, units, map, config, mine, loading }: Props) {
  const wed = weddingRange(config);
  const nights = useMemo(() => nightsFor(stays, wed), [stays, wed?.from, wed?.to]);
  const [sel, setSel] = useState<number | null>(null);
  const tot = bedTotals(units);
  const inWed = (t: number) => !!wed && t >= wed.from && t <= wed.to;

  if (!stays.length) {
    return (
      <div className="rounded-2xl border bg-card px-5 py-10 text-center text-muted-foreground">
        {loading ? "Einträge werden geladen …" : "Noch keine Einträge. Sobald sich jemand einträgt, erscheint er hier."}
      </div>
    );
  }

  const n = nights.length;
  const min = nights[0];
  const selected = sel != null && nights.includes(sel) ? sel : null;
  const here = selected != null ? stays.filter((s) => presentOn(s, selected)) : [];
  const usedUnits = units.filter((u) => stays.some((s) => map[s.id] === u.id));

  const dayProps = (t: number) => ({
    "data-wed": inWed(t) || undefined,
    "data-we": (!inWed(t) && isWeekend(t)) || undefined,
    "data-sel": selected === t || undefined,
  });
  const pick = (t: number) => setSel((cur) => (cur === t ? null : t));

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <div className="tl" style={{ ["--n" as string]: n }} role="table" aria-label="Belegung pro Nacht">
          <div className="tl-row" role="row">
            <div className="tl-name" role="columnheader">
              <span className="font-semibold">Gast</span>
              <span className="text-xs text-muted-foreground">Nacht antippen für Details</span>
            </div>
            {nights.map((t, i) => {
              const d = new Date(t);
              const showMo = i === 0 || d.getUTCDate() === 1;
              return (
                <button
                  key={t}
                  type="button"
                  role="columnheader"
                  onClick={() => pick(t)}
                  aria-pressed={selected === t}
                  aria-label={`Nacht ${longDate(t)}`}
                  className={cn("tl-cell flex flex-col items-center py-1.5 text-xs leading-tight text-muted-foreground", inWed(t) && "shadow-[inset_0_3px_0_var(--sanddorn)]")}
                  style={{ gridColumn: i + 2 }}
                  {...dayProps(t)}
                >
                  <span className="h-3.5 text-[10px] tracking-wide uppercase">{showMo ? monthShort(t) : ""}</span>
                  <span>{weekday(t)}</span>
                  <b className={cn("tabular text-[15px] font-semibold text-foreground", inWed(t) && "text-sanddorn")}>{d.getUTCDate()}</b>
                </button>
              );
            })}
          </div>

          <div className="tl-row bg-secondary" role="row">
            <div className="tl-name !bg-secondary" role="rowheader">
              <span className="font-semibold">Personen</span>
              <span className="text-xs text-muted-foreground">{tot.beds ? `Betten: ${tot.beds} (bis ${tot.max})` : "pro Nacht"}</span>
            </div>
            {nights.map((t, i) => {
              const sum = headcount(stays, t);
              const lvl = tot.beds && sum > tot.max ? "bad" : tot.beds && sum > tot.beds ? "warn" : "";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => pick(t)}
                  className={cn("tl-cell tabular flex items-center justify-center text-[13px] font-semibold", lvl === "bad" && "!bg-bad-tint text-bad", lvl === "warn" && "!bg-warn-tint text-warn")}
                  style={{ gridColumn: i + 2 }}
                  title={`${sum} Personen in dieser Nacht`}
                  {...dayProps(t)}
                >
                  {sum || "–"}
                </button>
              );
            })}
          </div>

          {stays.map((s) => {
            const u = units.find((x) => x.id === map[s.id]);
            const me = mine?.has(s.id);
            const start = (pd(s.from) - min) / DAY;
            const len = (pd(s.to) - pd(s.from)) / DAY;
            return (
              <div key={s.id} className="tl-row" role="row" data-me={me || undefined}>
                <div className="tl-name" role="rowheader" title={s.note ? `${s.name} – ${s.note}` : s.name}>
                  <span className={cn("truncate font-semibold", me && "text-sanddorn")}>{s.name}{me ? " (du)" : ""}</span>
                  <span className="truncate text-xs text-muted-foreground">{persons(s.persons)}{u ? ` · ${u.name}` : ""}</span>
                </div>
                {nights.map((t, i) => (
                  <div key={t} className="tl-cell" style={{ gridColumn: i + 2 }} {...dayProps(t)} />
                ))}
                <div
                  className={cn("tl-bar", UNIT_BG[colorIndex(units, u?.id)])}
                  style={{ gridColumn: `${start + 2} / span ${len}` }}
                  title={`${s.name}: ${dm(s.from)} bis ${dm(s.to)}`}
                >
                  {dm(s.from)} – {dm(s.to)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected != null && (
        <div className="mt-3 rounded-xl border bg-card p-4 animate-in fade-in-0 slide-in-from-top-1">
          <p className="font-semibold">
            Nacht von {longDate(selected)} auf {dm(selected + DAY)}: {headcount(stays, selected)} Personen
          </p>
          {here.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {here.map((s) => {
                const u = units.find((x) => x.id === map[s.id]);
                return (
                  <li key={s.id} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm">
                    <i className={cn("size-2 rounded-full", UNIT_BG[colorIndex(units, u?.id)])} />
                    {s.name} <span className="text-muted-foreground">({s.persons})</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Niemand eingetragen.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-3 rounded bg-sanddorn" />
          {wed ? `Hochzeit ${dm(wed.from)}–${dm(wed.to)}` : "Hochzeit (Zeitraum offen)"}
        </span>
        {usedUnits.length ? (
          usedUnits.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1.5">
              <i className={cn("size-3 rounded", UNIT_BG[colorIndex(units, u.id)])} />
              {u.name}
            </span>
          ))
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded bg-u0" /> Unterkunft noch offen
          </span>
        )}
      </div>
    </div>
  );
}
