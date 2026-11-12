# Hochzeit Rugenhof: Projektkontext

Dieses Repo enthält die Website für unsere Hochzeit (16.–18. August 2027, Ferienanlage Rugenhof, Dreschvitz, Rügen). Sprache der Seite und der Doku: Deutsch. Der Besitzer ist Programmierer: knapp und technisch antworten, nicht Schritt für Schritt für Laien erklären.

## Ziel
Aktuell: **Gästeplan** für die Unterkünfte. Gäste tragen Name, Personenzahl, Anreise und Abreise ein (auch vor oder nach der Hochzeit möglich) und sehen, wer wann da ist. Das Brautpaar teilt Gäste den Häusern zu. Die Zuteilung sehen Gäste erst, wenn das Paar sie freigibt.
Geplant (noch nicht begonnen): Ausbau zur vollen Hochzeits-Website (Design, Infoseiten wie Ablauf/Anreise/FAQ, Zu-/Absage mit Essenswünschen und Allergien auf derselben DB, Datenschutzerklärung, noindex, ggf. gemeinsames Passwort). Offene Fragen dazu an den Besitzer: Gästezahl/Sprachen, Stilrichtung, vorhandene Texte/Fotos/Einladungsdesign, Zugangsschutz, RSVP auf der Seite oder per Karte.

## Architektur
- `website/index.html`: einzelne statische Seite, Vanilla-JS ohne Build-Schritt, supabase-js per CDN (jsDelivr, gepinnt, UMD).
- `website/config.js`: setzt `window.RUGENHOF_CONFIG = { supabaseUrl, supabaseAnonKey }`. Nur der öffentliche Publishable/anon-Key, **nie** service_role/secret. Ist die Config leer, läuft ein Demo-Modus mit localStorage (`rugenhof.demo.v1`).
- `setup.sql`: Schema, RLS, Funktionen, Seed. Im Supabase-SQL-Editor ausführen.
- Hosting: Netlify (Drag-and-drop des Ordners `website`). DB/Auth: Supabase (Free, Frankfurt).
- Unterkunftsdaten stammen von https://rugenhof.de/preise-verfuegbarkeit/ (Schnappschuss 11.11.2026, Spalte `units.blocked`). Einheiten: Lütt Hecht, Groot Hecht (Haus Hecht), Flussbarsch, Boddenbarsch (Haus Barsch), Haus Plötz, FeWo Boddenkieker. Ungeklärt: ob Teile eines Hauses getrennt buchbar sind.

## Datenmodell und Sicherheit
- Tabellen: `admins(email)`, `units`, `stays`, `assignments`, `config`(id=1), `release`(id=1, `released`, `map` jsonb).
- `stays` hat ein geheimes `secret` pro Eintrag. Gäste lesen nur die View `stays_public` (ohne Secret) und schreiben ausschließlich über die security-definer-RPCs `save_stay` / `delete_stay` (Secret-Prüfung, Limit 300 Einträge).
- Der Gast bekommt einen persönlichen Bearbeitungslink `#edit=<uuid>.<secret>`; Einträge liegen zusätzlich in localStorage (`rugenhof.entries.v1`).
- `assignments` ist nur für Admins lesbar. Gäste sehen die Zuteilung nur über `release.map`, das beim Freigeben kopiert wird.
- Admin = Supabase-Auth (E-Mail/Passwort) und Eintrag in `admins`; geprüft über `is_admin()`. Öffentliche Registrierung muss in Supabase ausgeschaltet sein.
- Mapping Spalten → UI: `from_date→from`, `to_date→to`, `grp→group`, `max_beds→max`, `ord→order`, `as_of→asOf`.

## Design
Bricolage Grotesque (Überschriften), Figtree (Text). Palette: Kreide/Bodden-Tinte mit Sanddorn-Akzent (#D9730D, dunkel #F0A03A), Light/Dark über Tokens. Zeitleiste als CSS-Grid.

## Stand (12.11.2026)
- Supabase und Netlify sind eingerichtet, aber die Verbindung Website → Datenbank funktionierte zunächst nicht. Verwendet wird der neue `sb_publishable_…`-Key, während `supabase-js@2.45.4` gepinnt ist (älter als das neue Key-Format). Verdacht: Client/Key-Inkompatibilität (401/Invalid JWT), alternativ unvollständiges `setup.sql`, nicht exposed Schema `public` oder falsche URL.
- `refresh()` loggt Fehler jetzt per `console.error("[Gästeplan] …")` und zeigt Code/Message in der Fehlermeldung an. Nächster Schritt: Fehlertext aus der Konsole/dem Network-Tab (Request an `/rest/v1/units`) auslesen, dann beheben. Ein Versions-Update von supabase-js ist der wahrscheinlichste Fix.

## Tests (Claude-Sandbox, nicht im Repo)
jsdom-Smoke-Tests für Demo-Modus (25 Checks) und einen Fake-Supabase-Client (15 Checks). Echte Supabase-/Netlify-Ausführung wurde nie von Claude getestet.

## Konventionen
- Keine Secrets committen. `dbpw.txt` enthält ein Passwort und gehört in `.gitignore` bzw. aus dem Repo.
- `config.js` und `setup.sql` enthalten die echten Werte des Besitzers (Key, Admin-Mails): nicht mit Vorlagen überschreiben.
- Datenschutz: Bei einer späteren Zusage-Funktion (Allergien = besondere Kategorie) ist eine Datenschutzerklärung nötig. Entwurf ja, rechtliche Prüfung liegt beim Besitzer.
