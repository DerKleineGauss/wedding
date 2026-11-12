import { ArrowLeftIcon, ArrowRightIcon, CarFrontIcon, HandIcon, MapPinIcon, PencilIcon, SparklesIcon, UserRoundIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { CopyLink } from "@/components/common/CopyLink";
import { Providers } from "@/components/common/Providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fd, longDate } from "@/lib/dates";
import { newSecret, uuid } from "@/lib/ids";
import { rideKeys, seatKeys } from "@/lib/keyring";
import { weddingRange } from "@/lib/plan";
import { api, qk, useIsAdmin, usePublic, useRides, useWrite } from "@/lib/queries";
import { goesBack, goesOut, matchesFor, seatsLeft, sortDay, type Match } from "@/lib/rides";
import type { Passenger, PassengerInput, Ride, RideInput, RideKind } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { JoinForm, RideForm, toValues, type JoinValues, type RideValues } from "./RideForm";

export default function RidesIsland() {
  return (
    <Providers>
      <Rides />
    </Providers>
  );
}

type Filter = "alle" | "hin" | "rueck";
type Editing = { ride: Ride | null; kind: RideKind } | null;
type Joining = { ride: Ride; passenger: Passenger | null } | null;

function Rides() {
  const q = useRides();
  const pub = usePublic();
  const admin = useIsAdmin().data === true;
  const myRideKeys = rideKeys.useKeys();
  const mySeatKeys = seatKeys.useKeys();
  const [filter, setFilter] = useState<Filter>("alle");
  const [editing, setEditing] = useState<Editing>(null);
  const [joining, setJoining] = useState<Joining>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const rides = q.data?.rides ?? [];
  const passengers = q.data?.passengers ?? [];
  const wed = weddingRange(pub.data?.config);
  const defaults = { dayOut: wed ? fd(wed.from) : "", dayBack: wed ? fd(wed.to) : "" };
  const inv = [qk.rides] as const;

  const saveRide = useWrite((r: RideInput) => api().saveRide(r), { ok: "Gespeichert.", invalidate: inv });
  const deleteRide = useWrite(({ id, secret }: { id: string; secret: string }) => api().deleteRide(id, secret), { ok: "Gelöscht.", invalidate: inv });
  const join = useWrite((p: PassengerInput) => api().joinRide(p), { ok: "Platz gesichert. Meldet euch am besten direkt beieinander.", invalidate: inv });
  const leave = useWrite(({ id, secret }: { id: string; secret: string }) => api().leaveRide(id, secret), { ok: "Du bist ausgetragen.", invalidate: inv });
  const adminDel = useWrite((id: string) => api().adminDeleteRide(id), { ok: "Gelöscht.", invalidate: inv });

  const isMine = (r: Ride) => myRideKeys.some((k) => k.id === r.id);
  const mySeat = (r: Ride) => passengers.find((p) => p.rideId === r.id && mySeatKeys.some((k) => k.id === p.id)) ?? null;

  const visible = useMemo(
    () =>
      rides
        .filter((r) => (filter === "hin" ? goesOut(r) : filter === "rueck" ? goesBack(r) : true))
        .sort((a, b) => sortDay(a).localeCompare(sortDay(b)) || a.origin.localeCompare(b.origin, "de")),
    [rides, filter],
  );
  const mine = visible.filter(isMine);
  const offers = visible.filter((r) => r.kind === "offer" && !isMine(r));
  const requests = visible.filter((r) => r.kind === "request" && !isMine(r));

  const submitRide = (v: RideValues) => {
    const key = (editing?.ride && rideKeys.get(editing.ride.id)) || { id: uuid(), secret: newSecret() };
    const r: RideInput = {
      id: key.id, secret: key.secret, kind: v.kind, name: v.name, origin: v.origin, direction: v.direction,
      dayOut: v.direction === "rueck" ? null : v.dayOut, dayBack: v.direction === "hin" ? null : v.dayBack,
      timeNote: v.timeNote, seats: v.seats, contact: v.contact, note: v.note,
    };
    saveRide.mutate(r, {
      onSuccess: () => {
        const isNew = !rideKeys.get(key.id);
        rideKeys.add(key);
        setEditing(null);
        if (isNew) setLastLink(rideKeys.link(key, "/fahrgemeinschaft"));
      },
    });
  };

  const submitJoin = (v: JoinValues) => {
    if (!joining) return;
    const key = (joining.passenger && seatKeys.get(joining.passenger.id)) || { id: uuid(), secret: newSecret() };
    join.mutate(
      { id: key.id, secret: key.secret, rideId: joining.ride.id, ...v },
      {
        onSuccess: () => {
          const isNew = !seatKeys.get(key.id);
          seatKeys.add(key);
          setJoining(null);
          if (isNew) setLastLink(seatKeys.link(key, "/fahrgemeinschaft"));
        },
      },
    );
  };

  if (q.isError) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
        Die Fahrgemeinschaften sind gerade nicht erreichbar. Falls das so bleibt: Das Brautpaar richtet sie vermutlich noch ein.
      </div>
    );
  }

  const card = (r: Ride) => (
    <RideCard
      key={r.id}
      ride={r}
      passengers={passengers.filter((p) => p.rideId === r.id)}
      left={seatsLeft(r, passengers)}
      mine={isMine(r)}
      mySeat={mySeat(r)}
      matches={isMine(r) ? matchesFor(r, rides, passengers) : []}
      admin={admin}
      onEdit={() => setEditing({ ride: r, kind: r.kind })}
      onDelete={() => {
        const k = rideKeys.get(r.id);
        if (k) deleteRide.mutate(k, { onSuccess: () => rideKeys.remove(r.id) });
      }}
      onAdminDelete={() => adminDel.mutate(r.id)}
      onJoin={() => setJoining({ ride: r, passenger: mySeat(r) })}
      onLeave={() => {
        const p = mySeat(r);
        const k = p && seatKeys.get(p.id);
        if (k) leave.mutate(k, { onSuccess: () => seatKeys.remove(k.id) });
      }}
    />
  );

  return (
    <div className="grid gap-10">
      <div className="grid gap-3 sm:grid-cols-2">
        <CtaCard icon={<CarFrontIcon className="size-6" />} title="Ich fahre mit dem Auto" text="Biete freie Plätze an. Andere können sich direkt eintragen." onClick={() => setEditing({ ride: null, kind: "offer" })} />
        <CtaCard icon={<HandIcon className="size-6" />} title="Ich suche eine Mitfahrt" text="Trag ein, von wo und wann. Passende Angebote zeigen wir dir an." onClick={() => setEditing({ ride: null, kind: "request" })} />
      </div>

      {lastLink && (
        <div className="grid gap-2">
          <CopyLink url={lastLink} title="Dein Link zum Ändern" />
          <Button variant="ghost" className="justify-self-start" onClick={() => setLastLink(null)}>Ausblenden</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Filter">
        {(["alle", "hin", "rueck"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className="inline-flex h-9 items-center rounded-full border bg-card px-4 text-sm font-semibold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {f === "alle" ? "Alle" : f === "hin" ? "Hinfahrt" : "Rückfahrt"}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {((n) => `${n} ${n === 1 ? "freier Platz" : "freie Plätze"} insgesamt`)(rides.filter((r) => r.kind === "offer").reduce((a, r) => a + seatsLeft(r, passengers), 0))}
        </span>
      </div>

      {mine.length > 0 && <Group title="Deine Einträge">{mine.map(card)}</Group>}
      <Group title="Angebote" empty={q.isPending ? "Wird geladen …" : "Noch niemand bietet Plätze an."}>{offers.map(card)}</Group>
      <Group title="Gesuche" empty={q.isPending ? "Wird geladen …" : "Gerade sucht niemand eine Mitfahrt."}>{requests.map(card)}</Group>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{editing?.ride ? "Eintrag ändern" : "Neuer Eintrag"}</DialogTitle>
            <DialogDescription>Ziel ist immer der Rugenhof in Dreschvitz.</DialogDescription>
          </DialogHeader>
          {editing && (
            <RideForm initial={toValues(editing.ride, editing.kind, defaults)} busy={saveRide.isPending} onSubmit={submitRide} onCancel={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!joining} onOpenChange={(o) => !o && setJoining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Bei {joining?.ride.name} mitfahren</DialogTitle>
            <DialogDescription>{joining && `Ab ${joining.ride.origin}. Du kannst dich jederzeit wieder austragen.`}</DialogDescription>
          </DialogHeader>
          {joining && (
            <JoinForm
              max={seatsLeft(joining.ride, passengers) + (joining.passenger?.persons ?? 0)}
              initial={joining.passenger ?? { name: "", persons: 1, contact: "", note: "" }}
              busy={join.isPending}
              onSubmit={submitJoin}
              onCancel={() => setJoining(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CtaCard({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-4 rounded-2xl border bg-card p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-sanddorn"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sanddorn-tint text-sanddorn">{icon}</span>
      <span className="grid gap-1">
        <span className="font-heading text-lg font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function Group({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-[clamp(22px,3vw,26px)] font-bold">
        {title} <span className="text-base font-medium text-muted-foreground">{children.length || ""}</span>
      </h2>
      {children.length ? <div className="grid gap-3 md:grid-cols-2">{children}</div> : <p className="text-muted-foreground">{empty}</p>}
    </section>
  );
}

type CardProps = {
  ride: Ride;
  passengers: Passenger[];
  left: number;
  mine: boolean;
  mySeat: Passenger | null;
  matches: Match[];
  admin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdminDelete: () => void;
  onJoin: () => void;
  onLeave: () => void;
};

function RideCard({ ride: r, passengers, left, mine, mySeat, matches, admin, onEdit, onDelete, onAdminDelete, onJoin, onLeave }: CardProps) {
  const offer = r.kind === "offer";
  return (
    <article className={cn("grid content-start gap-3 rounded-2xl border bg-card p-5 shadow-soft", (mine || mySeat) && "border-sanddorn")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{offer ? "Bietet Plätze" : "Sucht Mitfahrt"}</p>
          <h3 className="truncate text-lg font-semibold">{r.name}{mine ? " (du)" : ""}</h3>
        </div>
        {offer ? (
          <SeatDots total={r.seats} left={left} />
        ) : (
          <Badge variant="secondary" className="h-6 px-2.5">{r.seats} {r.seats === 1 ? "Platz" : "Plätze"} gesucht</Badge>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-sm"><MapPinIcon className="size-4 text-muted-foreground" /> {r.origin}</p>
      <ul className="grid gap-1 text-sm">
        {goesOut(r) && r.dayOut && (
          <li className="flex items-center gap-2"><ArrowRightIcon className="size-4 text-sanddorn" /> Hin: {longDate(r.dayOut)}{r.direction === "hin" && r.timeNote ? `, ${r.timeNote}` : ""}</li>
        )}
        {goesBack(r) && r.dayBack && (
          <li className="flex items-center gap-2"><ArrowLeftIcon className="size-4 text-sanddorn" /> Zurück: {longDate(r.dayBack)}{r.direction === "rueck" && r.timeNote ? `, ${r.timeNote}` : ""}</li>
        )}
        {r.direction === "beide" && r.timeNote && <li className="text-muted-foreground">{r.timeNote}</li>}
      </ul>
      {r.note && <p className="text-sm text-muted-foreground">{r.note}</p>}
      {r.contact && <p className="text-sm"><span className="text-muted-foreground">Kontakt:</span> {r.contact}</p>}

      {offer && passengers.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {passengers.map((p) => (
            <li key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[13px]" title={[p.contact, p.note].filter(Boolean).join(" · ")}>
              <UserRoundIcon className="size-3.5" /> {p.name}{p.persons > 1 ? ` +${p.persons - 1}` : ""}
              {mine && p.contact ? <span className="text-muted-foreground">· {p.contact}</span> : null}
            </li>
          ))}
        </ul>
      )}

      {mine && matches.length > 0 && (
        <div className="grid gap-1.5 rounded-xl bg-sanddorn-tint p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-accent-foreground"><SparklesIcon className="size-4" /> Passt vielleicht</p>
          {matches.slice(0, 3).map((m) => (
            <p key={m.ride.id}>
              <b>{m.ride.name}</b> ab {m.ride.origin} <span className="text-muted-foreground">({m.reasons.join(", ")})</span>
              {m.ride.contact ? <> · {m.ride.contact}</> : null}
            </p>
          ))}
        </div>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        {mine ? (
          <>
            <Button variant="outline" onClick={onEdit}><PencilIcon /> Ändern</Button>
            <ConfirmButton variant="ghost" onConfirm={onDelete} armedLabel="Wirklich löschen?">Löschen</ConfirmButton>
          </>
        ) : offer ? (
          mySeat ? (
            <>
              <Badge className="h-10 rounded-lg bg-ok-tint px-3 text-sm text-ok">Du fährst mit</Badge>
              <Button variant="outline" onClick={onJoin}>Ändern</Button>
              <ConfirmButton variant="ghost" onConfirm={onLeave} armedLabel="Wirklich austragen?">Austragen</ConfirmButton>
            </>
          ) : (
            <Button onClick={onJoin} disabled={left < 1}>{left < 1 ? "Voll" : "Mitfahren"}</Button>
          )
        ) : null}
        {admin && !mine && (
          <ConfirmButton variant="ghost" className="ml-auto text-muted-foreground" onConfirm={onAdminDelete}>Entfernen (Brautpaar)</ConfirmButton>
        )}
      </div>
    </article>
  );
}

function SeatDots({ total, left }: { total: number; left: number }) {
  return (
    <div className="grid justify-items-end gap-1" aria-label={`${left} von ${total} Plätzen frei`}>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("size-3 rounded-full border-2", i < total - left ? "border-u0 bg-u0" : "border-sanddorn")} />
        ))}
      </div>
      <span className="tabular text-xs text-muted-foreground">{left ? `${left} frei` : "voll"}</span>
    </div>
  );
}

