# Hochzeit Rugenhof: Projektkontext

Dieses Repo enthält die Website für unsere Hochzeit (16.–18. August 2027, Ferienanlage Rugenhof, Dreschvitz, Rügen). Sprache der Seite und der Doku: Deutsch. Der Besitzer ist Programmierer: knapp und technisch antworten, nicht Schritt für Schritt für Laien erklären.

## Vision
Diese Website soll unseren Hochzeitsgästen einen angenehmen Weg eröffnen, die nötigen Planungen und Vorbereitungen für die Hochzeit zu treffen, alle Informationen zu erhalten, zu interagieren (z.B. Vorschläge einreichen), und auch im Nachgang davon zu profitieren, zum Beispiel, indem man Fotos herunterladen kann und zumindest eine kleine Vorschau dieser bekommen kann.
Die Website soll sich dabei modern und nutzerfreundlich anfühlen und einige individuelle Gestaltungen einfließen lassen. So haben wir ein paar Fotos, um ein gewisses Flair zu vermitteln. Die Fotos sind leider nicht in besonders guter Qualität und brauchen wahrscheinlich etwas Aufhübschung. Außerdem erstelle ich gerne Handletterings, die wir vielleicht hier und da einfließen lassen können.

## Ziele
### Gästeplan (`/unterkunft`, umgesetzt)
Gäste tragen Name, Personenzahl, Anreise und Abreise ein (auch vor oder nach der Hochzeit) und sehen, wer wann da ist. Das Brautpaar teilt Gäste den Häusern zu (`/brautpaar`, Drag-and-drop-Board). Die Zuteilung sehen Gäste erst nach Freigabe.

### Fahrgemeinschaft (`/fahrgemeinschaft`, umgesetzt, Migration muss noch laufen)
Angebote („Ich biete Plätze“) und Gesuche („Ich suche eine Mitfahrt“) mit Startort, Richtung (hin/zurück/beide), Datum, Plätzen, Kontakt. Mitfahrende tragen sich bei einem Angebot ein (Kapazität serverseitig geprüft). Zu eigenen Einträgen werden passende Gegenstücke vorgeschlagen (Richtung + Datum ±1 Tag + grober Ortsabgleich, `lib/rides.ts`). Kontaktangaben sind für alle Gäste sichtbar (im UI so benannt).

### Geplant
Infoseiten (Ablauf, Anreise, FAQ), Zu-/Absage mit Essenswünschen und Allergien auf derselben DB, Ideen/Vorschläge einreichen, Fotos nach der Hochzeit (Vorschau + Download), Handletterings als SVG einbinden, Datenschutzerklärung, ggf. gemeinsames Passwort. Offene Fragen an den Besitzer: Gästezahl/Sprachen, vorhandene Texte/Einladungsdesign, Zugangsschutz, RSVP auf der Seite oder per Karte, Speicherort für Hochzeitsfotos.

## Architektur
- `web/`: Astro 7 (statisch) + React-19-Islands (`client:only="react"`) + Tailwind v4 + shadcn/ui (Radix, Preset Nova, Komponenten in `src/components/ui`, angepasst: größere Touch-Ziele). TanStack Query (Polling 20 s), react-hook-form + zod, dnd-kit, sonner.
  - Seiten: `src/pages/{index,unterkunft,fahrgemeinschaft,brautpaar}.astro`, Layout `src/layouts/Base.astro`.
  - Daten: `src/lib/api/` mit Interface `Api`, Implementierungen `supabase.ts` und `demo.ts` (localStorage `rugenhof.demo.v2`). `getApi()` wählt anhand der Env-Variablen.
  - Reine Logik: `src/lib/plan.ts`, `src/lib/rides.ts` (Vitest: `npm test`).
  - Eigene Einträge pro Gerät: `src/lib/keyring.ts` (localStorage + Hash-Link). Keys: `rugenhof.entries.v1`/`#edit=` (Aufenthalte, kompatibel zur alten Seite), `rugenhof.rides.v1`/`#fahrt=`, `rugenhof.seats.v1`/`#platz=`. Alte Links `/#edit=…` leitet die Startseite auf `/unterkunft` um.
  - Bilder: `src/assets/img` über `astro:assets` (`<Picture>`, AVIF/WebP). Rohfotos in `website/assets/` (gitignored, teils HEIC; sharp liest kein HEIC).
  - Fonts self-hosted über Fontsource (kein Google-Fonts-Request, DSGVO).
- Env: `web/.env` (gitignored) mit `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_KEY` (publishable). Ohne Werte: Demo-Modus. Auf Netlify bricht der Build ab, wenn sie fehlen (`astro.config.mjs`).
- `supabase/migrations/`: `…_init.sql` (= `setup.sql`), `…_rides.sql`. Werden manuell im SQL-Editor ausgeführt (keine CLI-Verknüpfung).
- Hosting: Netlify, `netlify.toml` (base `web`, publish `dist`, Header `X-Robots-Tag: noindex`). DB/Auth: Supabase (Free, Frankfurt).
- `website/`: alte Vanilla-Seite, bleibt bis zur Umstellung auf Netlify als Referenz.
- Node: portabel ohne Admin unter `%LOCALAPPDATA%\Programs\node-v26.13.1-win-x64` (User-PATH).
- Unterkunftsdaten von https://rugenhof.de/preise-verfuegbarkeit/ (Stand 11.11.2026, `units.blocked`). Einheiten: Lütt Hecht, Groot Hecht (Haus Hecht), Flussbarsch, Boddenbarsch (Haus Barsch), Haus Plötz, FeWo Boddenkieker. Ungeklärt: ob Teile eines Hauses getrennt buchbar sind.

## Datenmodell und Sicherheit
- Tabellen: `admins(email)`, `units`, `stays`, `assignments`, `config`(id=1), `release`(id=1, `released`, `map` jsonb), `rides`, `ride_passengers`.
- Muster für alle Gast-Daten: geheimes `secret` pro Zeile, Gäste lesen nur `*_public`-Views ohne Secret und schreiben ausschließlich über security-definer-RPCs mit Secret-Prüfung: `save_stay`/`delete_stay` (Limit 300), `save_ride`/`delete_ride` (Limit 300), `join_ride`/`leave_ride` (Limit 600, `select … for update` gegen Überbuchung).
- `assignments` nur für Admins lesbar. Gäste sehen die Zuteilung nur über `release.map` (Kopie beim Freigeben). Das Board zeigt vor dem Veröffentlichen ein Diff.
- Admin = Supabase-Auth (E-Mail/Passwort) + Eintrag in `admins`, geprüft über `is_admin()`. Öffentliche Registrierung in Supabase aus.
- Mapping Spalten → UI: `from_date→from`, `to_date→to`, `grp→group`, `max_beds→max`, `ord→order`, `as_of→asOf`, `day_out→dayOut`, `day_back→dayBack`, `time_note→timeNote`, `ride_id→rideId`.

## Design
Bricolage Grotesque (Überschriften), Figtree (Text). Palette: Kreide/Bodden-Tinte mit Sanddorn-Akzent (#D9730D, dunkel #F0A03A) als shadcn-Tokens in `src/styles/global.css`, Dark Mode per `prefers-color-scheme`. Hausfarben `u0`–`u6` (literale Klassen in `components/stays/unitColors.ts`). Zeitleiste als CSS-Grid (`.tl*` in global.css). Native View Transitions zwischen Seiten.

## Stand (12.11.2026)
- Neue Seite in `web/` gebaut; `astro check`, 9 Vitest-Tests und ein Browser-Smoke-Test (Edge, Demo-Modus, Desktop + Mobil, 34 Checks) grün. Lesender Test gegen echte Supabase ok (supabase-js 2.119 mit `sb_publishable_…`).
- Offen: Migration `…_rides.sql` in Supabase ausführen; Netlify auf Git-Deploy (oder Drop von `web/dist`) umstellen und Env-Variablen setzen; `website/` danach entfernen.
- `dbpw.txt` war committet (jetzt aus dem Index genommen, aber in der Historie): DB-Passwort in Supabase ändern.

## Konventionen
- Keine Secrets committen (`.gitignore`: `dbpw.txt`, `.env*`). Der publishable Key ist öffentlich, gehört aber trotzdem in Env statt Code.
- `setup.sql`, `website/config.js` und `web/.env` enthalten echte Werte des Besitzers: nicht mit Vorlagen überschreiben.
- Neue DB-Änderungen als neue Datei in `supabase/migrations/`, idempotent.
- Datenschutz: Bei Zusage-Funktion (Allergien = besondere Kategorie) ist eine Datenschutzerklärung nötig. Entwurf ja, rechtliche Prüfung liegt beim Besitzer.
