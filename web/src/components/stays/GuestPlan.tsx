import { CalendarPlusIcon, HouseIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { CopyLink } from "@/components/common/CopyLink";
import { Providers } from "@/components/common/Providers";
import { dm, longDate, nightsBetween, nightsLabel } from "@/lib/dates";
import { downloadIcs, RUGENHOF_LOCATION } from "@/lib/ics";
import { newSecret, uuid } from "@/lib/ids";
import { stayKeys } from "@/lib/keyring";
import { cleanStays, weddingRange } from "@/lib/plan";
import { api, usePublic, useWrite } from "@/lib/queries";
import type { StayInput } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Houses } from "./Houses";
import { StayForm, type StayValues } from "./StayForm";
import { Timeline } from "./Timeline";

export default function GuestPlanIsland() {
  return (
    <Providers>
      <GuestPlan />
    </Providers>
  );
}

function GuestPlan() {
  const q = usePublic();
  const keys = stayKeys.useKeys();
  const data = q.data;
  const stays = useMemo(() => cleanStays(data?.stays ?? []), [data?.stays]);
  const wedding = weddingRange(data?.config);
  const released = !!data?.release.released;
  const map = released ? data!.release.map : {};

  const myStays = stays.filter((s) => keys.some((k) => k.id === s.id));
  const mineSet = useMemo(() => new Set(keys.map((k) => k.id)), [keys]);
  // null = neuer Eintrag; undefined = automatisch den ersten eigenen wählen
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const currentId = picked === undefined ? myStays[0]?.id ?? null : picked;
  const current = stays.find((s) => s.id === currentId) ?? null;
  const currentKey = stayKeys.get(currentId);

  const save = useWrite((e: StayInput) => api().saveStay(e), { ok: "Gespeichert. Du kannst alles später noch ändern." });
  const del = useWrite(({ id, secret }: { id: string; secret: string }) => api().deleteStay(id, secret), { ok: "Eintrag gelöscht." });

  const onSubmit = (v: StayValues) => {
    const key = currentKey ?? { id: uuid(), secret: newSecret() };
    save.mutate(
      { id: key.id, secret: key.secret, ...v },
      {
        onSuccess: () => {
          stayKeys.add(key);
          setPicked(key.id);
        },
      },
    );
  };

  const myAssigned = released ? myStays.map((s) => ({ s, u: data!.units.find((u) => u.id === map[s.id]) })).filter((x) => x.u) : [];

  return (
    <div className="grid gap-14">
      {q.isError && (
        <div className="rounded-xl bg-warn-tint px-4 py-3 font-medium text-warn">
          Die Daten lassen sich gerade nicht laden. Prüfe deine Verbindung und lade die Seite neu.
        </div>
      )}
      {api().demo && (
        <div className="rounded-xl bg-warn-tint px-4 py-3 text-sm font-medium text-warn">
          Vorschau-Modus: Eingaben bleiben nur in diesem Browser. Für den echten Betrieb fehlen PUBLIC_SUPABASE_URL und PUBLIC_SUPABASE_KEY.
        </div>
      )}

      {myAssigned.length > 0 && (
        <div className="grid gap-2">
          {myAssigned.map(({ s, u }) => (
            <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-ok-tint px-5 py-4 text-ok">
              <HouseIcon className="size-5" />
              <p className="text-base">
                {myStays.length > 1 && <>{s.name}: </>}Du wohnst im <b>{u!.name}</b> · {dm(s.from)} bis {dm(s.to)}
              </p>
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="mine-h" id="eintragen" className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="mine-h" className="text-[clamp(24px,3.6vw,30px)] font-bold">{current ? "Dein Aufenthalt" : myStays.length ? "Weiterer Eintrag" : "Wann bist du da?"}</h2>
          <p className="text-muted-foreground">
            {current ? "Du kannst deine Angaben jederzeit ändern." : "Auch vor oder nach der Hochzeit. Gezählt werden die Nächte."}
          </p>
        </div>

        <div className="grid gap-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
          {myStays.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted-foreground">Deine Einträge:</span>
              {myStays.map((s) => (
                <Pill key={s.id} active={currentId === s.id} onClick={() => setPicked(s.id)}>{s.name}</Pill>
              ))}
              <Pill active={currentId === null} onClick={() => setPicked(null)}>
                <PlusIcon className="size-3.5" /> Weiterer Eintrag
              </Pill>
            </div>
          )}

          <StayForm
            resetKey={`${currentId ?? "new"}:${current ? "1" : "0"}`}
            initial={current}
            wedding={wedding}
            busy={save.isPending}
            submitLabel={current ? "Änderungen speichern" : "Eintrag speichern"}
            onSubmit={onSubmit}
          >
            {current && currentKey && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    downloadIcs("rugenhof.ics", [{
                      uid: current.id,
                      title: map[current.id] ? `Rugenhof: ${data!.units.find((u) => u.id === map[current.id])?.name}` : "Hochzeit auf dem Rugenhof",
                      from: current.from, to: current.to, location: RUGENHOF_LOCATION,
                    }])
                  }
                >
                  <CalendarPlusIcon /> In den Kalender
                </Button>
                <ConfirmButton
                  size="lg"
                  variant="ghost"
                  armedLabel="Wirklich löschen?"
                  onConfirm={() =>
                    del.mutate(currentKey, {
                      onSuccess: () => {
                        stayKeys.remove(currentKey.id);
                        setPicked(undefined);
                      },
                    })
                  }
                >
                  Eintrag löschen
                </ConfirmButton>
              </>
            )}
          </StayForm>

          {current && currentKey && (
            <>
              <p className="text-sm text-muted-foreground">
                {longDate(current.from)} bis {longDate(current.to)} · {nightsLabel(nightsBetween(current.from, current.to))}
              </p>
              <CopyLink url={stayKeys.link(currentKey, "/unterkunft")} />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="tl-h">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="tl-h" className="text-[clamp(24px,3.6vw,30px)] font-bold">Wer ist wann da</h2>
          <p className="max-w-[62ch] text-muted-foreground">Eine Spalte ist eine Nacht. Oben steht, wie viele Personen in der Nacht auf dem Hof sind.</p>
        </div>
        <Timeline stays={stays} units={data?.units ?? []} map={map} config={data?.config} mine={mineSet} loading={q.isPending} />
      </section>

      <section aria-labelledby="un-h">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id="un-h" className="text-[clamp(24px,3.6vw,30px)] font-bold">Die Häuser</h2>
          <Badge variant={released ? "default" : "secondary"} className={cn("h-6 px-2.5", released && "bg-ok-tint text-ok")}>
            {released ? "Zuteilung freigegeben" : "Zuteilung folgt"}
          </Badge>
        </div>
        <Houses units={data?.units ?? []} stays={stays} map={map} released={released} />
        {!released && (
          <p className="mt-3 text-sm text-muted-foreground">Sobald alle Zeiten da sind, teilen wir euch den Häusern zu und schalten das hier frei.</p>
        )}
      </section>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"

      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-semibold",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-sanddorn",
      )}
    >
      {children}
    </button>
  );
}

