import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAY, dm, fd, nightsBetween, nightsLabel, okDate, pd } from "@/lib/dates";
import type { Range } from "@/lib/plan";

export const staySchema = z
  .object({
    name: z.string().trim().min(1, "Bitte gib einen Namen an.").max(60, "Höchstens 60 Zeichen."),
    persons: z.number({ error: "Bitte gib die Personenzahl an." }).int().min(1, "Mindestens 1 Person.").max(40, "Höchstens 40 Personen."),
    from: z.string().refine(okDate, "Bitte wähle den Anreisetag."),
    to: z.string().refine(okDate, "Bitte wähle den Abreisetag."),
    note: z.string().trim().max(140, "Höchstens 140 Zeichen."),
  })
  .refine((v) => !okDate(v.from) || !okDate(v.to) || pd(v.to) > pd(v.from), {
    path: ["to"],
    message: "Die Abreise muss nach der Anreise liegen.",
  });
export type StayValues = z.infer<typeof staySchema>;

const EMPTY: StayValues = { name: "", persons: 1, from: "", to: "", note: "" };

type Props = {
  initial?: Partial<StayValues> | null;
  /** Wechselt der Schlüssel (anderer Eintrag), wird das Formular neu befüllt. */
  resetKey: string;
  wedding: Range | null;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (v: StayValues) => void;
  children?: ReactNode;
};

export function StayForm({ initial, resetKey, wedding, submitLabel, busy, onSubmit, children }: Props) {
  const form = useForm<StayValues>({ resolver: zodResolver(staySchema), defaultValues: { ...EMPTY, ...initial } });
  const { register, handleSubmit, formState, watch, setValue, reset } = form;

  useEffect(() => {
    reset({ ...EMPTY, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const from = watch("from");
  const to = watch("to");
  const n = okDate(from) && okDate(to) && pd(to) > pd(from) ? nightsBetween(from, to) : 0;
  const err = formState.errors;

  // Schnellwahl: genau die Hochzeit (Anreise am ersten Tag, Abreise am Morgen nach dem letzten Fest-Tag)
  const quick = wedding
    ? [
        { label: `Hochzeit (${dm(wedding.from)}–${dm(wedding.to)})`, from: fd(wedding.from), to: fd(wedding.to) },
        { label: "Ein Tag früher", from: fd(wedding.from - DAY), to: fd(wedding.to) },
        { label: "Verlängert bis Sonntag danach", from: fd(wedding.from), to: fd(nextSunday(wedding.to)) },
      ]
    : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Name" id="f-name" error={err.name?.message}>
          <Input id="f-name" autoComplete="name" placeholder="Vor- und Nachname" maxLength={60} aria-invalid={!!err.name} {...register("name")} />
        </Field>
        <Field label="Personen (inkl. dir)" id="f-persons" error={err.persons?.message}>
          <Input id="f-persons" type="number" inputMode="numeric" min={1} max={40} aria-invalid={!!err.persons} {...register("persons", { valueAsNumber: true })} />
        </Field>
      </div>

      {quick.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Schnellwahl:</span>
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              className="rounded-full border bg-background px-3 py-1 text-[13px] font-medium hover:border-sanddorn aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              aria-pressed={from === q.from && to === q.to}
              onClick={() => {
                setValue("from", q.from, { shouldDirty: true, shouldValidate: formState.isSubmitted });
                setValue("to", q.to, { shouldDirty: true, shouldValidate: formState.isSubmitted });
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Anreise" id="f-from" error={err.from?.message}>
          <Input id="f-from" type="date" aria-invalid={!!err.from} {...register("from")} />
        </Field>
        <Field label="Abreise" id="f-to" error={err.to?.message} hint={n ? nightsLabel(n) : "Der Tag, an dem du abreist."}>
          <Input id="f-to" type="date" min={okDate(from) ? fd(pd(from) + DAY) : undefined} aria-invalid={!!err.to} {...register("to")} />
        </Field>
      </div>

      <Field label="Hinweis (optional)" id="f-note" error={err.note?.message}>
        <Input id="f-note" maxLength={140} placeholder="z. B. mit Hund, Kinderbett nötig, späte Anreise" {...register("note")} />
      </Field>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Button type="submit" size="lg" disabled={busy}>{busy ? "Speichert …" : submitLabel}</Button>
        {children}
      </div>
    </form>
  );
}

function nextSunday(t: number) {
  let x = t + DAY;
  while (new Date(x).getUTCDay() !== 0) x += DAY;
  return x;
}

export function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-semibold">{label}</Label>
      {children}
      {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
