import { dm, persons } from "@/lib/dates";
import { colorIndex } from "@/lib/plan";
import type { PlanMap, Stay, Unit } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { UNIT_BG } from "./unitColors";

/** Häuser-Karten für Gäste. Bewohner nur, wenn die Zuteilung freigegeben ist. */
export function Houses({ units, stays, map, released }: { units: Unit[]; stays: Stay[]; map: PlanMap; released: boolean }) {
  if (!units.length) return <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Die Häuser werden gerade eingetragen.</div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {units.map((u) => {
        const here = stays.filter((s) => map[s.id] === u.id);
        const max = Math.max(u.max, u.beds);
        return (
          <article key={u.id} className="flex min-w-0 flex-col gap-2.5 rounded-2xl border bg-card p-5 shadow-soft">
            {u.group && <p className="eyebrow">{u.group}</p>}
            <div className="flex items-center gap-2.5">
              <i className={cn("size-3 rounded", UNIT_BG[colorIndex(units, u.id)])} />
              <h3 className="text-lg font-semibold">{u.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {u.beds} Betten{max > u.beds ? ` · bis ${max} mit Aufbettung` : ""}
            </p>
            {u.note && <p className="text-[13px] text-muted-foreground">{u.note}</p>}
            {released &&
              (here.length ? (
                <ul className="grid gap-1.5">
                  {here.map((s) => (
                    <li key={s.id} className="flex justify-between gap-3 border-t pt-1.5 text-sm">
                      <span className="truncate">{s.name} ({s.persons})</span>
                      <span className="tabular shrink-0 text-muted-foreground">{dm(s.from)}–{dm(s.to)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted-foreground">Hier wohnt noch niemand.</p>
              ))}
            {released && here.length > 0 && (
              <p className="text-xs text-muted-foreground">{persons(here.reduce((a, s) => a + s.persons, 0))} insgesamt</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
