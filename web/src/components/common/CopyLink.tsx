import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Persönlicher Bearbeitungslink mit Kopieren und (mobil) Teilen an sich selbst. */
export function CopyLink({ url, title = "Dein persönlicher Bearbeitungslink", hint }: { url: string; title?: string; hint?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [done, setDone] = useState(false);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
      toast.success("Link kopiert.");
    } catch {
      ref.current?.select();
      toast("Link markiert. Bitte mit Strg+C kopieren.");
    }
  };

  return (
    <div className="grid gap-2 rounded-xl bg-secondary p-4 text-sm">
      <strong>{title}</strong>
      <span className="text-muted-foreground">
        {hint ?? "Damit kannst du deinen Eintrag auch auf einem anderen Gerät ändern. Am besten an dich selbst schicken, aber nicht weitergeben."}
      </span>
      <div className="flex flex-wrap gap-2">
        <Input ref={ref} readOnly value={url} aria-label={title} className="min-w-0 flex-[1_1_220px] bg-background text-[13px]" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="outline" onClick={copy}>
          {done ? <CheckIcon /> : <CopyIcon />} Kopieren
        </Button>
        {canShare && (
          <Button type="button" variant="outline" onClick={() => navigator.share({ title: "Rugenhof", url }).catch(() => {})}>
            <Share2Icon /> Teilen
          </Button>
        )}
      </div>
    </div>
  );
}
