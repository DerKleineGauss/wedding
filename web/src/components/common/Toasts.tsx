import { Toaster } from "@/components/ui/sonner";

/** Eine Toaster-Instanz pro Seite; alle Islands rufen toast() aus sonner auf. */
export default function Toasts() {
  return <Toaster position="bottom-center" richColors closeButton />;
}
