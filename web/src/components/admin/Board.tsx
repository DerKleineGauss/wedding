import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { GripVerticalIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UNIT_BG, UNIT_BORDER } from "@/components/stays/unitColors";
import { dm, longDate, nightsBetween, nightsLabel } from "@/lib/dates";
import { blockedFor, colorIndex, loadLevel, occupancy, peakFor } from "@/lib/plan";
import type { PlanMap, Stay, Unit } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const OPEN = "__open";

type Props = {
  stays: Stay[];
  units: Unit[];
  map: PlanMap;
  nights: number[];
  wedding: { from: number; to: number } | null;
  onAssign: (stayId: string, unitId: string | null) => void;
};

/**
 * Zuteilungs-Board: Gäste-Karten per Drag-and-drop (Maus, Touch, Tastatur) auf Häuser ziehen.
 * Jede Spalte zeigt die Belegung pro Nacht als Mini-Balken gegen Betten/Aufbettung.
 */
export function Board({ stays, units, map, nights, wedding, onAssign }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const draggedStay = stays.find((s) => s.id === dragging);

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const stayId = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    if (!target) return;
    const next = target === OPEN ? null : target;
    if ((map[stayId] ?? null) !== next) onAssign(stayId, next);
  };

  const open = stays.filter((s) => !map[s.id]);

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragging(String(e.active.id))} onDragCancel={() => setDragging(null)} onDragEnd={onDragEnd}>
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_3fr]">
        <Column id={OPEN} title="Noch offen" subtitle={`${open.length} ${open.length === 1 ? "Eintrag" : "Einträge"}`} sticky>
          {open.map((s) => (
            <StayCard key={s.id} stay={s} units={units} unitId={null} onAssign={onAssign} />
          ))}
          {!open.length && <p className="px-1 py-6 text-center text-sm text-muted-foreground">Alle sind zugeteilt.</p>}
        </Column>

        <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {units.map((u) => {
            const here = stays.filter((s) => map[s.id] === u.id);
            const peak = peakFor(u.id, map, stays);
            const lvl = loadLevel(peak, u);
            // Vorschau: wie sähe die Belegung aus, wenn die gezogene Karte hier landet?
            const preview = draggedStay && map[draggedStay.id] !== u.id ? { ...map, [draggedStay.id]: u.id } : null;
            const occ = occupancy(u.id, preview ?? map, stays, nights);
            const clash = draggedStay && preview ? blockedFor(u, draggedStay).length > 0 : false;
            return (
              <Column
                key={u.id}
                id={u.id}
                colorIdx={colorIndex(units, u.id)}
                title={u.name}
                subtitle={`${u.beds} Betten${u.max > u.beds ? ` · bis ${u.max}` : ""}`}
                badge={
                  here.length ? (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", lvl === "ok" && "bg-ok-tint text-ok", lvl === "tight" && "bg-warn-tint text-warn", lvl === "over" && "bg-bad-tint text-bad")}>
                      {lvl === "over" ? `Überbelegt ${peak}/${u.max}` : lvl === "tight" ? `Aufbettung ${peak}/${u.beds}` : `Spitze ${peak}/${u.beds}`}
                    </span>
                  ) : null
                }
                warn={clash ? "Fremdbuchung im Zeitraum" : undefined}
                chart={<Occupancy occ={occ} nights={nights} unit={u} wedding={wedding} />}
              >
                {here.map((s) => (
                  <StayCard key={s.id} stay={s} units={units} unitId={u.id} onAssign={onAssign} />
                ))}
                {!here.length && <p className="px-1 py-4 text-center text-[13px] text-muted-foreground">Hierher ziehen</p>}
              </Column>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {draggedStay ? <CardFace stay={draggedStay} units={units} unitId={map[draggedStay.id] ?? null} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ id, title, subtitle, badge, chart, warn, colorIdx, sticky, children }: {
  id: string; title: string; subtitle: string; badge?: React.ReactNode; chart?: React.ReactNode; warn?: string; colorIdx?: number; sticky?: boolean; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "grid content-start gap-2 rounded-2xl border-2 border-transparent bg-secondary/70 p-3 transition-colors",
        colorIdx != null && "border-t-4",
        colorIdx != null && UNIT_BORDER[colorIdx],
        isOver && "border-sanddorn bg-sanddorn-tint",
        sticky && "lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto",
      )}
      aria-label={title}
    >
      <header className="grid gap-1 px-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{title}</h3>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {warn && <p className="flex items-center gap-1 text-xs font-semibold text-bad"><TriangleAlertIcon className="size-3.5" /> {warn}</p>}
        {chart}
      </header>
      {children}
    </section>
  );
}

function Occupancy({ occ, nights, unit, wedding }: { occ: number[]; nights: number[]; unit: Unit; wedding: { from: number; to: number } | null }) {
  const cap = Math.max(unit.max, unit.beds, ...occ, 1);
  return (
    <div className="relative mt-1 flex h-12 items-end gap-px" aria-hidden>
      {/* Linie auf Höhe der regulären Betten */}
      <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted-foreground/50" style={{ bottom: `${(unit.beds / cap) * 100}%` }} />
      {occ.map((n, i) => {
        const lvl = loadLevel(n, unit);
        const wed = wedding && nights[i] >= wedding.from && nights[i] <= wedding.to;
        return (
          <Tooltip key={nights[i]}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "relative min-w-0 flex-1 rounded-sm",
                  n === 0 ? "bg-border/60" : lvl === "over" ? "bg-bad" : lvl === "tight" ? "bg-warn" : "bg-ok",
                  wed && "outline outline-1 outline-sanddorn",
                )}
                style={{ height: `${n ? Math.max(8, (n / cap) * 100) : 4}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>{longDate(nights[i])}: {n}/{unit.beds} Betten</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function StayCard({ stay, units, unitId, onAssign }: { stay: Stay; units: Unit[]; unitId: string | null; onAssign: Props["onAssign"] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: stay.id });
  return (
    <div ref={setNodeRef} className={cn(isDragging && "opacity-40")}>
      <CardFace stay={stay} units={units} unitId={unitId} onAssign={onAssign} handle={{ ...listeners, ...attributes }} />
    </div>
  );
}

function CardFace({ stay: s, units, unitId, onAssign, handle, lifted }: {
  stay: Stay; units: Unit[]; unitId: string | null; onAssign?: Props["onAssign"]; handle?: Record<string, unknown>; lifted?: boolean;
}) {
  const u = units.find((x) => x.id === unitId);
  const clash = u ? blockedFor(u, s) : [];
  return (
    <div
      className={cn(
        "relative flex items-stretch gap-1 rounded-xl border bg-card shadow-soft",
        lifted && "rotate-1 shadow-lg ring-2 ring-sanddorn",
        clash.length > 0 && "border-bad",
      )}
    >
      <button
        type="button"
        className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-muted-foreground hover:bg-secondary active:cursor-grabbing"
        aria-label={`${s.name} verschieben`}
        {...handle}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1 py-2 pr-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{s.name}</span>
          <span className={cn("shrink-0 rounded-md px-1.5 text-xs font-bold text-white tabular", UNIT_BG[colorIndex(units, unitId ?? undefined)])}>{s.persons}</span>
        </div>
        <p className="tabular text-xs text-muted-foreground">{dm(s.from)}–{dm(s.to)} · {nightsLabel(nightsBetween(s.from, s.to))}</p>
        {s.note && <p className="truncate text-xs text-muted-foreground" title={s.note}>{s.note}</p>}
        {clash.length > 0 && <p className="text-xs font-semibold text-bad">Belegt: {clash.map(([a, b]) => `${dm(a)}–${dm(b)}`).join(", ")}</p>}
        {/* Fallback ohne Ziehen, z. B. auf kleinen Bildschirmen */}
        {onAssign && <select
          className="mt-1 w-full rounded-md border bg-background px-1.5 py-1 text-xs lg:hidden"
          value={unitId ?? ""}
          aria-label={`Unterkunft für ${s.name}`}
          onChange={(e) => onAssign(s.id, e.target.value || null)}
        >
          <option value="">– offen –</option>
          {units.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>}
      </div>
    </div>
  );
}
