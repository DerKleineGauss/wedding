import { LogOutIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/common/ConfirmButton";
import { Providers } from "@/components/common/Providers";
import { Field, StayForm, type StayValues } from "@/components/stays/StayForm";
import { Timeline } from "@/components/stays/Timeline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dm, nightsBetween, okDate, pd } from "@/lib/dates";
import { uuid } from "@/lib/ids";
import { blockedFor, cleanPlan, cleanStays, diffRelease, diffSize, nightsFor, weddingRange } from "@/lib/plan";
import { api, qk, queryClient, useIsAdmin, usePlan, usePublic, useRides, useWrite } from "@/lib/queries";
import type { AdminStayInput, PlanMap, Stay, Unit } from "@/lib/api/types";
import { Board } from "./Board";

export default function AdminIsland() {
  return (
    <Providers>
      <Admin />
    </Providers>
  );
}

function Admin() {
  const adminQ = useIsAdmin();
  if (adminQ.isPending) return <p className="text-muted-foreground">Prüfe Anmeldung …</p>;
  if (!adminQ.data) return <Login />;
  return <Dashboard />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api().signIn(email.trim(), pw);
      const ok = await api().isAdmin();
      if (!ok) {
        await api().signOut();
        toast.error("Mit diesem Konto könnt ihr die Zuteilung nicht bearbeiten.");
      } else {
        setPw("");
        await queryClient.invalidateQueries({ queryKey: qk.admin });
        toast.success("Angemeldet.");
      }
    } catch {
      toast.error("Anmeldung fehlgeschlagen. Prüft E-Mail und Passwort.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid max-w-md gap-4 rounded-2xl border bg-card p-6 shadow-soft">
      <h2 className="text-xl font-bold">Anmeldung für das Brautpaar</h2>
      {api().demo && <p className="text-sm text-warn">Vorschau-Modus: Hier funktionieren beliebige Eingaben.</p>}
      <Field label="E-Mail" id="l-email"><Input id="l-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Passwort" id="l-pw"><Input id="l-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <Button type="submit" size="lg" disabled={busy || (!api().demo && (!email || !pw))}>{busy ? "Meldet an …" : "Anmelden"}</Button>
    </form>
  );
}

function Dashboard() {
  const pub = usePublic();
  const planQ = usePlan(true);
  const ridesQ = useRides();
  const data = pub.data;
  const units = data?.units ?? [];
  const stays = useMemo(() => cleanStays(data?.stays ?? []), [data?.stays]);
  const plan = useMemo(() => cleanPlan(planQ.data ?? {}, stays, units), [planQ.data, stays, units]);
  const wedding = weddingRange(data?.config);
  const nights = useMemo(() => nightsFor(stays, wedding), [stays, wedding?.from, wedding?.to]);
  const [editing, setEditing] = useState<Stay | "new" | null>(null);

  const assign = useWrite(({ stayId, unitId }: { stayId: string; unitId: string | null }) => api().setAssignment(stayId, unitId), { invalidate: [qk.plan] });
  const onAssign = (stayId: string, unitId: string | null) => {
    // Optimistisch: Board reagiert sofort, Server-Stand kommt per Invalidate nach.
    queryClient.setQueryData<PlanMap>(qk.plan, (m = {}) => {
      const next = { ...m };
      if (unitId) next[stayId] = unitId;
      else delete next[stayId];
      return next;
    });
    assign.mutate({ stayId, unitId });
  };

  const logout = async () => {
    await api().signOut();
    queryClient.setQueryData(qk.admin, false);
    queryClient.removeQueries({ queryKey: qk.plan });
  };

  if (pub.isPending || planQ.isPending) return <p className="text-muted-foreground">Wird geladen …</p>;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {stays.length} Einträge · {stays.reduce((a, s) => a + s.persons, 0)} Personen · {ridesQ.data?.rides.length ?? 0} Fahrten
        </p>
        <Button variant="ghost" onClick={logout}><LogOutIcon /> Abmelden</Button>
      </div>

      <ReleasePanel stays={stays} units={units} plan={plan} released={!!data?.release.released} published={data?.release.map ?? {}} />

      <Tabs defaultValue="board">
        <TabsList className="flex-wrap">
          <TabsTrigger value="board">Zuteilung</TabsTrigger>
          <TabsTrigger value="timeline">Zeitleiste</TabsTrigger>
          <TabsTrigger value="guests">Gäste</TabsTrigger>
          <TabsTrigger value="settings">Einstellungen</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="pt-4">
          <Board stays={stays} units={units} map={plan} nights={nights} wedding={wedding} onAssign={onAssign} />
        </TabsContent>
        <TabsContent value="timeline" className="pt-4">
          <Timeline stays={stays} units={units} map={plan} config={data?.config} />
        </TabsContent>
        <TabsContent value="guests" className="pt-4">
          <Guests stays={stays} units={units} plan={plan} onEdit={setEditing} onAssign={onAssign} />
        </TabsContent>
        <TabsContent value="settings" className="pt-4">
          <Settings units={units} config={data?.config} />
        </TabsContent>
      </Tabs>

      <EditStayDialog editing={editing} wedding={wedding} onClose={() => setEditing(null)} />
    </div>
  );
}

function ReleasePanel({ stays, units, plan, released, published }: { stays: Stay[]; units: Unit[]; plan: PlanMap; released: boolean; published: PlanMap }) {
  const diff = diffRelease(plan, released ? published : {});
  const changes = diffSize(diff);
  const open = stays.filter((s) => !plan[s.id]).length;
  const clashes = stays.filter((s) => {
    const u = units.find((x) => x.id === plan[s.id]);
    return u && blockedFor(u, s).length;
  }).length;
  const name = (id: string) => stays.find((s) => s.id === id)?.name ?? "Gelöschter Eintrag";
  const inv = [qk.public] as const;
  const publish = useWrite(() => api().setRelease(true, plan), { ok: "Zuteilung ist für alle Gäste sichtbar.", invalidate: inv });
  const withdraw = useWrite(() => api().setRelease(false, {}), { ok: "Freigabe zurückgezogen.", invalidate: inv });

  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-xl font-bold">Sichtbarkeit für Gäste</h2>
          <p className="text-sm text-muted-foreground">
            {!released ? "Noch nicht freigegeben. Gäste sehen nur die Zeiten." : changes ? "Freigegeben, aber es gibt unveröffentlichte Änderungen." : "Freigegeben. Gäste sehen den aktuellen Stand."}
            {open ? ` ${open} ${open === 1 ? "Eintrag hat" : "Einträge haben"} noch keine Unterkunft.` : stays.length ? " Alle sind zugeteilt." : ""}
            {clashes ? ` ${clashes} kollidieren mit Fremdbuchungen.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(!released || changes > 0) && (
            <Button onClick={() => publish.mutate(undefined)} disabled={publish.isPending}>
              {released ? `${changes} ${changes === 1 ? "Änderung" : "Änderungen"} veröffentlichen` : "Zuteilung freigeben"}
            </Button>
          )}
          {released && <ConfirmButton onConfirm={() => withdraw.mutate(undefined)}>Freigabe zurückziehen</ConfirmButton>}
        </div>
      </div>
      {changes > 0 && (
        <ul className="grid gap-1 rounded-xl bg-secondary p-3 text-sm">
          {diff.added.map((id) => <li key={id}><b className="text-ok">+</b> {name(id)} → {units.find((u) => u.id === plan[id])?.name}</li>)}
          {diff.moved.map((id) => <li key={id}><b className="text-warn">↻</b> {name(id)}: {units.find((u) => u.id === published[id])?.name} → {units.find((u) => u.id === plan[id])?.name}</li>)}
          {diff.removed.map((id) => <li key={id}><b className="text-bad">−</b> {name(id)} (nicht mehr zugeteilt)</li>)}
        </ul>
      )}
    </section>
  );
}

function Guests({ stays, units, plan, onEdit, onAssign }: { stays: Stay[]; units: Unit[]; plan: PlanMap; onEdit: (s: Stay | "new") => void; onAssign: (s: string, u: string | null) => void }) {
  const del = useWrite((id: string) => api().adminDeleteStay(id), { ok: "Eintrag gelöscht.", invalidate: [qk.public, qk.plan] });
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr className="border-b"><th className="p-3">Gast</th><th className="p-3">Pers.</th><th className="p-3">Zeitraum</th><th className="p-3">Unterkunft</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {stays.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3"><b>{s.name}</b>{s.manual && <span className="ml-1.5 text-xs text-muted-foreground">(von euch)</span>}{s.note && <div className="text-xs text-muted-foreground">{s.note}</div>}</td>
                <td className="tabular p-3">{s.persons}</td>
                <td className="tabular p-3">{dm(s.from)} – {dm(s.to)}<div className="text-xs text-muted-foreground">{nightsBetween(s.from, s.to)} N.</div></td>
                <td className="p-3">
                  <select className="h-9 rounded-lg border bg-background px-2" value={plan[s.id] ?? ""} onChange={(e) => onAssign(s.id, e.target.value || null)} aria-label={`Unterkunft für ${s.name}`}>
                    <option value="">– offen –</option>
                    {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(s)}>Bearbeiten</Button>
                    <ConfirmButton size="sm" variant="ghost" onConfirm={() => del.mutate(s.id)}>Löschen</ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
            {!stays.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Noch keine Einträge.</td></tr>}
          </tbody>
        </table>
      </div>
      <Button variant="outline" className="justify-self-start" onClick={() => onEdit("new")}><PlusIcon /> Gast manuell hinzufügen</Button>
    </div>
  );
}

function EditStayDialog({ editing, wedding, onClose }: { editing: Stay | "new" | null; wedding: ReturnType<typeof weddingRange>; onClose: () => void }) {
  const save = useWrite((e: AdminStayInput) => api().adminSaveStay(e), { ok: "Eintrag gespeichert." });
  const s = editing === "new" ? null : editing;
  const submit = (v: StayValues) =>
    save.mutate({ id: s?.id ?? uuid(), manual: s ? s.manual : true, ...v }, { onSuccess: onClose });
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{s ? "Eintrag bearbeiten" : "Gast manuell hinzufügen"}</DialogTitle>
          <DialogDescription>Für Gäste, die sich nicht selbst eintragen.</DialogDescription>
        </DialogHeader>
        {editing && <StayForm resetKey={s?.id ?? "new"} initial={s} wedding={wedding} busy={save.isPending} submitLabel="Speichern" onSubmit={submit} />}
      </DialogContent>
    </Dialog>
  );
}

function Settings({ units, config }: { units: Unit[]; config: { weddingFrom: string; weddingTo: string } | undefined }) {
  const saveCfg = useWrite((c: { weddingFrom: string; weddingTo: string }) => api().saveConfig(c), { ok: "Hochzeitszeitraum gespeichert." });
  const saveUnit = useWrite((u: Unit) => api().saveUnit(u), { ok: (u) => `${u.name} gespeichert.` });
  const delUnit = useWrite((id: string) => api().deleteUnit(id), { ok: "Haus entfernt.", invalidate: [qk.public, qk.plan] });
  const [wf, setWf] = useState(config?.weddingFrom ?? "");
  const [wt, setWt] = useState(config?.weddingTo ?? "");

  const commitCfg = (f: string, t: string) => {
    const from = okDate(f) ? f : "";
    const to = okDate(t) && from && pd(t) >= pd(from) ? t : from;
    saveCfg.mutate({ weddingFrom: from, weddingTo: to });
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold">Hochzeit</h3>
        <div className="grid max-w-lg gap-4 sm:grid-cols-2">
          <Field label="Von" id="s-wf"><Input id="s-wf" type="date" value={wf} onChange={(e) => setWf(e.target.value)} onBlur={() => commitCfg(wf, wt)} /></Field>
          <Field label="Bis" id="s-wt" hint="Wird in der Zeitleiste markiert."><Input id="s-wt" type="date" value={wt} onChange={(e) => setWt(e.target.value)} onBlur={() => commitCfg(wf, wt)} /></Field>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-card p-5">
        <h3 className="text-lg font-semibold">Häuser</h3>
        <p className="text-sm text-muted-foreground">Namen, Betten und Fremdbuchungen stammen von rugenhof.de. Änderungen gelten beim Verlassen des Feldes.</p>
        {units.map((u, i) => <UnitRow key={u.id} unit={u} order={u.order ?? i} onSave={(x) => saveUnit.mutate(x)} onDelete={() => delUnit.mutate(u.id)} />)}
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => saveUnit.mutate({ id: `u${Date.now().toString(36)}`, name: "Neues Haus", group: "", beds: 8, max: 8, note: "", order: units.length, blocked: [], asOf: "" })}
        >
          <PlusIcon /> Haus hinzufügen
        </Button>
      </section>
    </div>
  );
}

function UnitRow({ unit: u, order, onSave, onDelete }: { unit: Unit; order: number; onSave: (u: Unit) => void; onDelete: () => void }) {
  const [v, setV] = useState({ name: u.name, beds: String(u.beds), max: String(u.max), note: u.note });
  const commit = () => {
    const beds = Math.max(1, Math.min(60, Math.round(+v.beds) || 1));
    const max = Math.max(beds, Math.min(80, Math.round(+v.max) || beds));
    const next = { ...u, name: v.name.trim() || "Haus", beds, max, note: v.note.trim(), order };
    if (next.name !== u.name || beds !== u.beds || max !== u.max || next.note !== u.note) onSave(next);
  };
  const id = `u-${u.id}`;
  return (
    <div className="grid items-end gap-3 border-t pt-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
      <Field label="Name" id={`${id}-n`}><Input id={`${id}-n`} maxLength={40} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} onBlur={commit} /></Field>
      <Field label="Betten" id={`${id}-b`}><Input id={`${id}-b`} type="number" min={1} max={60} value={v.beds} onChange={(e) => setV({ ...v, beds: e.target.value })} onBlur={commit} /></Field>
      <Field label="Max." id={`${id}-m`}><Input id={`${id}-m`} type="number" min={1} max={80} value={v.max} onChange={(e) => setV({ ...v, max: e.target.value })} onBlur={commit} /></Field>
      <Field label="Notiz" id={`${id}-t`}><Input id={`${id}-t`} maxLength={120} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} onBlur={commit} /></Field>
      <ConfirmButton variant="ghost" onConfirm={onDelete}>Entfernen</ConfirmButton>
      {u.blocked.length > 0 && (
        <p className="text-xs text-muted-foreground sm:col-span-5">
          Auf rugenhof.de belegt: {u.blocked.map((r) => r.split("/")).map(([a, b]) => `${dm(a)}–${dm(b)}`).join(", ")}{u.asOf ? ` (Stand ${u.asOf})` : ""}
        </p>
      )}
    </div>
  );
}

