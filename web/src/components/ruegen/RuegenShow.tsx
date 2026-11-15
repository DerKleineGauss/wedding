import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShowSlide {
  id: string;
  cat: string;
  title: string;
  place?: string;
  tip: string;
  alt: string;
  pos: string;
  /** Motiv liegt unten im Bild: Text oben statt unten. */
  textTop: boolean;
  /** Seitenverhältnis Breite/Höhe des Originals. */
  ratio: number;
  avif: string;
  webp: string;
  src: string;
  thumb: string;
  blur: string;
}

const DURATION = 10000;
const SIZES = "(min-width: 1152px) 1088px, 100vw";
/** Ken-Burns-Richtungen, reihum pro Dia. */
const DRIFT = [
  ["-2.5%", "-1.5%"],
  ["2.5%", "1%"],
  ["1.5%", "-2%"],
  ["-2%", "2%"],
];

export default function RuegenShow({
  slides,
  categories,
}: {
  slides: ShowSlide[];
  categories: string[];
}) {
  const [cat, setCat] = useState<string | null>(null);
  const list = useMemo(
    () => (cat ? slides.filter((s) => s.cat === cat) : slides),
    [slides, cat],
  );
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [stageRatio, setStageRatio] = useState(16 / 9);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const lastSwipe = useRef(0);

  const paused = userPaused || hold || hidden;
  const cur = list[index] ?? list[0];

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => {
      setReduced(mq.matches);
      if (mq.matches) setUserPaused(true);
    };
    upd();
    mq.addEventListener("change", upd);
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", upd);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setStageRatio(e.contentRect.width / Math.max(1, e.contentRect.height)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = useCallback(
    (next: number) => {
      const n = (next + list.length) % list.length;
      if (n === index) return;
      setPrev(reduced ? null : index);
      setIndex(n);
    },
    [index, list.length, reduced],
  );

  // Aktives Vorschaubild in der Leiste sichtbar halten, ohne die Seite zu scrollen.
  useEffect(() => {
    const rail = railRef.current;
    const btn = rail?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    if (!rail || !btn) return;
    const left = btn.offsetLeft - rail.clientWidth / 2 + btn.clientWidth / 2;
    rail.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [index, cat, reduced]);

  const pick = (c: string | null) => {
    setCat(c);
    setPrev(null);
    setIndex(0);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === " " && e.target === e.currentTarget) {
      e.preventDefault();
      setUserPaused((p) => !p);
    }
  };
  const tap = (d: number) => {
    if (Date.now() - lastSwipe.current > 400) go(index + d);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
    if (e.pointerType !== "mouse") setHold(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setHold(false);
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      lastSwipe.current = Date.now();
      go(dx < 0 ? index + 1 : index - 1);
    }
  };

  if (!cur) return null;
  const visible = [prev, index].filter(
    (i): i is number => i !== null && i < list.length,
  );
  const nextIdx = (index + 1) % list.length;

  return (
    <div className="grid gap-4">
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="Diashow"
        aria-label="Ideen für Rügen"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setHold(false);
          swipe.current = null;
        }}
        className="relative isolate aspect-[4/5] max-h-[82vh] w-full touch-pan-y overflow-hidden rounded-3xl bg-[#09181D] text-white shadow-soft select-none sm:aspect-[3/2] lg:aspect-[16/9]"
      >
        <div className="absolute inset-0 isolate">
          {visible.map((i) => (
            <SlideImage
              key={`${list[i].id}-${cat ?? "alle"}`}
              slide={list[i]}
              drift={DRIFT[i % DRIFT.length]}
              stageRatio={stageRatio}
              active={i === index}
              reduced={reduced}
              onShown={() => i === index && setPrev(null)}
            />
          ))}
        </div>
        {/* Nächstes Bild vorladen */}
        {list.length > 1 && (
          <picture
            className="pointer-events-none absolute size-px opacity-0"
            aria-hidden="true"
          >
            <source
              type="image/avif"
              srcSet={list[nextIdx].avif}
              sizes={SIZES}
            />
            <source
              type="image/webp"
              srcSet={list[nextIdx].webp}
              sizes={SIZES}
            />
            <img src={list[nextIdx].src} alt="" />
          </picture>
        )}

        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-700",
            cur.textTop
              ? "bg-gradient-to-b from-[#09181D]/90 via-[#09181D]/30 via-45% to-transparent"
              : "bg-gradient-to-t from-[#09181D]/95 via-[#09181D]/35 via-45% to-[#09181D]/30 sm:via-[#09181D]/20",
          )}
        />

        {/* Fortschritt wie bei Stories */}
        <div
          className="absolute inset-x-4 top-4 flex gap-1 sm:inset-x-6 sm:top-5"
          aria-hidden="true"
        >
          {list.map((s, i) => (
            <span
              key={s.id}
              className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
            >
              {i < index && <span className="block h-full w-full bg-white" />}
              {i === index && (
                <span
                  key={`${s.id}-${cat ?? "alle"}-${index}`}
                  className="show-progress block h-full bg-white"
                  style={{
                    animationDuration: `${DURATION}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                  onAnimationEnd={() => go(index + 1)}
                />
              )}
            </span>
          ))}
        </div>

        {/* Text */}
        <div
          key={`${cur.id}-${cat ?? "alle"}`}
          aria-live={userPaused ? "polite" : "off"}
          className={cn(
            "absolute inset-x-0 grid gap-2 p-5 sm:max-w-[min(640px,70%)] sm:p-8",
            cur.textTop ? "top-0 pt-12 pr-16 sm:pt-14 sm:pr-8" : "bottom-0 pb-6 sm:pb-9",
          )}
        >
          <div
            className="show-rise flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.09em] uppercase"
            style={{ animationDelay: "120ms" }}
          >
            <span className="rounded-full bg-sanddorn px-2.5 py-1 text-[#1A0E02]">
              {cur.cat}
            </span>
            <span className="text-white/75 tabular-nums">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(list.length).padStart(2, "0")}
            </span>
          </div>
          <h3
            className="show-rise text-[clamp(30px,5.4vw,56px)] leading-[0.98] font-bold tracking-[-0.025em] [text-shadow:0_2px_24px_rgb(0_0_0/0.4)]"
            style={{ animationDelay: "200ms" }}
          >
            {cur.title}
          </h3>
          {cur.place && (
            <p
              className="show-rise flex items-center gap-1.5 text-sm font-semibold text-[#FFC37A]"
              style={{ animationDelay: "280ms" }}
            >
              <MapPin className="size-4" aria-hidden="true" />
              {cur.place}
            </p>
          )}
          <p
            className="show-rise max-w-[56ch] text-[15px] leading-relaxed text-white/90 sm:text-[17px]"
            style={{ animationDelay: "360ms" }}
          >
            {cur.tip}
          </p>
        </div>

        {/* Steuerung */}
        <div className={cn("absolute top-9 right-3 flex gap-2 sm:right-6", cur.textTop ? "sm:top-12" : "sm:top-auto sm:bottom-8")}>
          <RoundButton
            label="Vorheriger Tipp"
            className="hidden sm:inline-flex"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="size-5" />
          </RoundButton>
          <RoundButton
            label={userPaused ? "Abspielen" : "Pausieren"}
            onClick={() => setUserPaused((p) => !p)}
          >
            {userPaused ? (
              <Play className="size-4" />
            ) : (
              <Pause className="size-4" />
            )}
          </RoundButton>
          <RoundButton
            label="Nächster Tipp"
            className="hidden sm:inline-flex"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="size-5" />
          </RoundButton>
        </div>

        {/* Tippzonen fürs Handy: links zurück, rechts weiter */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-y-16 left-0 w-1/4 sm:hidden"
          onClick={() => tap(-1)}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-y-16 right-0 w-1/4 sm:hidden"
          onClick={() => tap(1)}
        />
      </div>

      {/* Kategorien */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Nach Thema filtern"
      >
        {[null, ...categories].map((c) => {
          const n = c
            ? slides.filter((s) => s.cat === c).length
            : slides.length;
          const on = cat === c;
          return (
            <button
              key={c ?? "alle"}
              type="button"
              aria-pressed={on}
              onClick={() => pick(c)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:border-sanddorn",
              )}
            >
              {c ?? "Alle"}
              <span
                className={cn(
                  "tabular-nums",
                  on ? "opacity-70" : "text-muted-foreground",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vorschaubilder */}
      <div
        ref={railRef}
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0"
      >
        {list.map((s, i) => (
          <button
            key={s.id}
            type="button"
            data-i={i}
            onClick={() => go(i)}
            aria-label={`${s.title} anzeigen`}
            aria-current={i === index ? "true" : undefined}
            className={cn(
              "relative h-16 w-24 shrink-0 snap-start overflow-hidden rounded-xl transition-all duration-300 sm:h-20 sm:w-28",
              i === index
                ? "ring-2 ring-sanddorn ring-offset-2 ring-offset-background"
                : "opacity-60 hover:opacity-100",
            )}
          >
            <img
              src={s.thumb}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
              style={{ objectPosition: s.pos }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SlideImage({
  slide,
  drift,
  stageRatio,
  active,
  reduced,
  onShown,
}: {
  slide: ShowSlide;
  drift: string[];
  stageRatio: number;
  active: boolean;
  reduced: boolean;
  onShown: () => void;
}) {
  // Stark abweichendes Format (Hochkant auf breiter Bühne): ganz zeigen, unscharfer Hintergrund füllt auf.
  const contain = Math.abs(Math.log(slide.ratio / stageRatio)) > Math.log(1.75);
  const kb = reduced
    ? undefined
    : ({
        "--kx": drift[0],
        "--ky": drift[1],
        animationDuration: `${DURATION + 1500}ms`,
      } as React.CSSProperties);
  return (
    <div
      className={cn(
        "absolute inset-0",
        active ? "z-[1]" : "z-0",
        active && !reduced && "show-fade",
      )}
      onAnimationEnd={(e) => e.target === e.currentTarget && onShown()}
    >
      {contain && (
        <img
          src={slide.blur}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full scale-110 object-cover blur-2xl brightness-75"
        />
      )}
      <picture>
        <source type="image/avif" srcSet={slide.avif} sizes={SIZES} />
        <source type="image/webp" srcSet={slide.webp} sizes={SIZES} />
        <img
          src={slide.src}
          alt={slide.alt}
          decoding="async"
          draggable={false}
          className={cn(
            "absolute inset-0 size-full",
            contain ? "object-contain" : "object-cover",
            !reduced && (contain ? "show-kb-soft" : "show-kb"),
          )}
          style={{
            objectPosition: slide.pos,
            transformOrigin: slide.pos,
            ...kb,
          }}
        />
      </picture>
    </div>
  );
}

function RoundButton({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/25",
        className,
      )}
    >
      {children}
    </button>
  );
}
