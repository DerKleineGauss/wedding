import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** Zweistufiges Löschen: erster Klick schärft, zweiter innerhalb von 4 s führt aus. */
export function ConfirmButton({
  onConfirm,
  children,
  armedLabel = "Sicher?",
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & { onConfirm: () => void; armedLabel?: string }) {
  const [armed, setArmed] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <Button
      type="button"
      variant={armed ? "destructive" : props.variant ?? "outline"}
      {...props}
      onClick={() => {
        if (armed) {
          clearTimeout(t.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        t.current = setTimeout(() => setArmed(false), 4000);
      }}
    >
      {armed ? armedLabel : children}
    </Button>
  );
}
