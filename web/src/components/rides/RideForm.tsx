import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/stays/StayForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { okDate, pd } from "@/lib/dates";
import type { Direction, Ride, RideKind } from "@/lib/api/types";

export const rideSchema = z
  .object({
    kind: z.enum(["offer", "request"]),
    name: z.string().trim().min(1, "Bitte gib einen Namen an.").max(60),
    origin: z.string().trim().min(2, "Von wo aus?").max(80),
    direction: z.enum(["hin", "rueck", "beide"]),
    dayOut: z.string(),
    dayBack: z.string(),
    timeNote: z.string().trim().max(40, "Höchstens 40 Zeichen."),
    seats: z.number({ error: "Bitte gib eine Zahl an." }).int().min(1, "Mindestens 1.").max(8, "Höchstens 8."),
    contact: z.string().trim().max(80, "Höchstens 80 Zeichen."),
    note: z.string().trim().max(200, "Höchstens 200 Zeichen."),
  })
  .superRefine((v, ctx) => {
    if (v.direction !== "rueck" && !okDate(v.dayOut)) ctx.addIssue({ code: "custom", path: ["dayOut"], message: "Wann fährst du hin?" });
    if (v.direction !== "hin" && !okDate(v.dayBack)) ctx.addIssue({ code: "custom", path: ["dayBack"], message: "Wann fährst du zurück?" });
    if (v.direction === "beide" && okDate(v.dayOut) && okDate(v.dayBack) && pd(v.dayBack) < pd(v.dayOut))
      ctx.addIssue({ code: "custom", path: ["dayBack"], message: "Die Rückfahrt liegt vor der Hinfahrt." });
  });
export type RideValues = z.infer<typeof rideSchema>;

export const toValues = (r: Ride | null, kind: RideKind, defaults: { dayOut: string; dayBack: string }): RideValues =>
  r
    ? { kind: r.kind, name: r.name, origin: r.origin, direction: r.direction, dayOut: r.dayOut ?? "", dayBack: r.dayBack ?? "", timeNote: r.timeNote, seats: r.seats, contact: r.contact, note: r.note }
    : { kind, name: "", origin: "", direction: "beide", dayOut: defaults.dayOut, dayBack: defaults.dayBack, timeNote: "", seats: kind === "offer" ? 3 : 1, contact: "", note: "" };

const DIRS: { v: Direction; label: string }[] = [
  { v: "beide", label: "Hin und zurück" },
  { v: "hin", label: "Nur hin" },
  { v: "rueck", label: "Nur zurück" },
];

export function RideForm({ initial, busy, onSubmit, onCancel }: { initial: RideValues; busy?: boolean; onSubmit: (v: RideValues) => void; onCancel: () => void }) {
  const { register, handleSubmit, control, watch, formState } = useForm<RideValues>({ resolver: zodResolver(rideSchema), defaultValues: initial });
  const kind = watch("kind");
  const dir = watch("direction");
  const err = formState.errors;
  const offer = kind === "offer";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            {(["offer", "request"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={field.value === k}
                onClick={() => field.onChange(k)}
                className="h-10 rounded-lg text-sm font-semibold text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-soft"
              >
                {k === "offer" ? "Ich biete Plätze" : "Ich suche eine Mitfahrt"}
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id="r-name" error={err.name?.message}>
          <Input id="r-name" autoComplete="name" maxLength={60} aria-invalid={!!err.name} {...register("name")} />
        </Field>
        <Field label="Start (Ort, Stadtteil)" id="r-origin" error={err.origin?.message}>
          <Input id="r-origin" maxLength={80} placeholder="z. B. Berlin-Pankow" aria-invalid={!!err.origin} {...register("origin")} />
        </Field>
      </div>

      <Controller
        control={control}
        name="direction"
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Label className="text-[13px] font-semibold">Strecke</Label>
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-wrap gap-x-5 gap-y-2">
              {DIRS.map((d) => (
                <label key={d.v} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <RadioGroupItem value={d.v} /> {d.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {dir !== "rueck" && (
          <Field label="Hinfahrt am" id="r-out" error={err.dayOut?.message}>
            <Input id="r-out" type="date" aria-invalid={!!err.dayOut} {...register("dayOut")} />
          </Field>
        )}
        {dir !== "hin" && (
          <Field label="Rückfahrt am" id="r-back" error={err.dayBack?.message}>
            <Input id="r-back" type="date" aria-invalid={!!err.dayBack} {...register("dayBack")} />
          </Field>
        )}
        <Field label="Uhrzeit (optional)" id="r-time" error={err.timeNote?.message}>
          <Input id="r-time" maxLength={40} placeholder="z. B. ab 9 Uhr" {...register("timeNote")} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Field label={offer ? "Freie Plätze" : "Wie viele Personen?"} id="r-seats" error={err.seats?.message}>
          <Input id="r-seats" type="number" inputMode="numeric" min={1} max={8} aria-invalid={!!err.seats} {...register("seats", { valueAsNumber: true })} />
        </Field>
        <Field label="Kontakt (optional)" id="r-contact" error={err.contact?.message} hint="Telefon, E-Mail oder Signal. Für alle Gäste sichtbar.">
          <Input id="r-contact" maxLength={80} {...register("contact")} />
        </Field>
      </div>

      <Field label="Hinweis (optional)" id="r-note" error={err.note?.message}>
        <Textarea id="r-note" maxLength={200} rows={2} placeholder={offer ? "z. B. Route über Stralsund, Platz für Gepäck, kein Hund" : "z. B. Abholung vom Bahnhof wäre super"} {...register("note")} />
      </Field>

      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Speichert …" : "Speichern"}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>Abbrechen</Button>
      </div>
    </form>
  );
}

const joinSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Namen an.").max(60),
  persons: z.number({ error: "Bitte gib eine Zahl an." }).int().min(1, "Mindestens 1.").max(8),
  contact: z.string().trim().max(80),
  note: z.string().trim().max(140),
});
export type JoinValues = z.infer<typeof joinSchema>;

export function JoinForm({ max, initial, busy, onSubmit, onCancel }: { max: number; initial: JoinValues; busy?: boolean; onSubmit: (v: JoinValues) => void; onCancel: () => void }) {
  const schema = joinSchema.refine((v) => v.persons <= max, { path: ["persons"], message: `Es sind nur ${max} Plätze frei.` });
  const { register, handleSubmit, formState } = useForm<JoinValues>({ resolver: zodResolver(schema), defaultValues: initial });
  const err = formState.errors;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Name" id="j-name" error={err.name?.message}>
          <Input id="j-name" autoComplete="name" maxLength={60} {...register("name")} />
        </Field>
        <Field label="Personen" id="j-persons" error={err.persons?.message}>
          <Input id="j-persons" type="number" inputMode="numeric" min={1} max={max} {...register("persons", { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label="Kontakt (optional)" id="j-contact" hint="Damit dich die Fahrerin oder der Fahrer erreicht. Für alle Gäste sichtbar.">
        <Input id="j-contact" maxLength={80} {...register("contact")} />
      </Field>
      <Field label="Hinweis (optional)" id="j-note">
        <Input id="j-note" maxLength={140} placeholder="z. B. Abholung am Bahnhof möglich?" {...register("note")} />
      </Field>
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Speichert …" : "Platz sichern"}</Button>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>Abbrechen</Button>
      </div>
    </form>
  );
}
