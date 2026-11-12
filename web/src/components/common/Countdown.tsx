import { useEffect, useState } from "react";

/** Tage/Stunden bis zur Hochzeit (lokale Zeit Rügen ≈ Europe/Berlin, Start 14 Uhr als grober Richtwert). */
export default function Countdown({ target }: { target: string }) {
  const end = new Date(target).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, end - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (ms === 0) return <p className="font-heading text-2xl font-bold">Heute ist es so weit.</p>;
  return (
    <div className="flex items-end gap-5" aria-label={`Noch ${days} Tage und ${hours} Stunden`}>
      <Unit n={days} label={days === 1 ? "Tag" : "Tage"} />
      <Unit n={hours} label={hours === 1 ? "Stunde" : "Stunden"} />
    </div>
  );
}

function Unit({ n, label }: { n: number; label: string }) {
  return (
    <div className="grid">
      <span className="font-heading text-[clamp(40px,7vw,64px)] leading-none font-bold tabular-nums">{n}</span>
      <span className="text-sm text-white/80">{label}</span>
    </div>
  );
}
