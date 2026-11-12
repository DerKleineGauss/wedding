// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Auf Netlify ohne Supabase-Variablen bauen hieße: Produktivseite im Demo-Modus. Lieber laut scheitern.
const env = loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), "PUBLIC_");
if (process.env.NETLIFY === "true" && (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_KEY)) {
  throw new Error("PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_KEY fehlen in den Netlify-Umgebungsvariablen.");
}

export default defineConfig({
  integrations: [react()],
  trailingSlash: "never",
  build: { format: "file" },
  vite: { plugins: [tailwindcss()] },
});
