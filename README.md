# Rugenhof Gästeplan: Einrichtung in etwa 30 Minuten

Die Seite besteht aus drei Teilen. Ihr braucht dafür zwei kostenlose Konten, aber keine Programmierkenntnisse.

| Teil | Was es macht | Wo |
|---|---|---|
| Ordner `website` | Die Seite selbst (`index.html`, `config.js`) | Netlify (Hosting) |
| Datei `setup.sql` | Legt Tabellen, Sicherheitsregeln und Startdaten an | Supabase (Datenbank) |
| Diese Anleitung | Schritte 1 bis 7 | |

Gäste öffnen später einen normalen Link, ohne Anmeldung. Nur ihr beide meldet euch mit E-Mail und Passwort an, um zuzuteilen.

## 0. Vorab ausprobieren (optional, 1 Minute)

Öffne `website/index.html` per Doppelklick im Browser. Die Seite läuft dann im **Vorschau-Modus** mit vier Beispiel-Einträgen. Alles bleibt nur in deinem Browser. Unten auf der Seite siehst du „Brautpaar-Login": Im Vorschau-Modus geht jede Eingabe, damit ihr die Zuteilung durchspielen könnt.

## 1. Supabase-Projekt anlegen

1. Geh auf **supabase.com** und wähle „Start your project". Melde dich mit E-Mail oder GitHub an.
2. Wähle „New project". Name zum Beispiel `rugenhof`, Region **Central EU (Frankfurt)**, Preisplan **Free**.
3. Vergib ein Datenbank-Passwort und notiere es dir. Du brauchst es später nicht, aber du kannst es nicht wieder anzeigen lassen.
4. Warte ein bis zwei Minuten, bis das Projekt bereit ist.

## 2. Datenbank einrichten

1. Öffne `setup.sql` in einem Texteditor.
2. Ersetze weit oben die beiden Platzhalter `DEINE-MAIL@BEISPIEL.DE` und `MAIL-DES-PARTNERS@BEISPIEL.DE` durch **eure echten E-Mail-Adressen**. Genau diese beiden dürfen später zuteilen.
3. Gehe in Supabase links auf **SQL Editor**, dann „New query".
4. Kopiere den kompletten Inhalt von `setup.sql` hinein und klicke auf **Run**.
5. Unten sollte „Success" stehen. Falls Supabase warnt, dass die Abfrage Daten ändert, bestätige das.

Ergebnis: Die sechs Einheiten vom Rugenhof sind eingetragen, außerdem der Hochzeitszeitraum 16. bis 18. August 2027.

## 3. Eure beiden Zugänge anlegen

1. Gehe in Supabase auf **Authentication**, dann **Users**.
2. Wähle „Add user" und „Create new user". Trag eine der beiden E-Mail-Adressen aus Schritt 2 ein, vergib ein Passwort und hake **„Auto Confirm User"** an.
3. Wiederhole das für die zweite Adresse.
4. **Wichtig:** Schalte danach das öffentliche Registrieren aus. Du findest es unter Authentication, im Bereich „Sign In / Providers" (je nach Version auch „Settings"). Der Schalter heißt **„Allow new users to sign up"**. Er muss **aus** sein. Zusätzlich schützt euch die Liste aus Schritt 2: Nur die dort eingetragenen Adressen dürfen zuteilen.

## 4. Verbindung herstellen

1. Gehe in Supabase auf **Project Settings**, dann **API** (je nach Version „Data API" oder „API Keys").
2. Kopiere die **Project URL**. Sie sieht aus wie `https://abcdefgh.supabase.co`.
3. Kopiere den öffentlichen Schlüssel. Er heißt **`anon` / `public`** (beginnt mit `eyJ…`) oder **`publishable`** (beginnt mit `sb_publishable_…`).
4. **Nimm niemals den Schlüssel `service_role` oder `secret`.** Der hebelt alle Sicherheitsregeln aus.
5. Öffne `website/config.js` im Texteditor und trage beides zwischen die Anführungszeichen ein:

```js
window.RUGENHOF_CONFIG = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseAnonKey: "eyJ..."
};
```

Der öffentliche Schlüssel darf in der Seite stehen. Die Sicherheit kommt aus den Regeln in `setup.sql`.

## 5. Seite ins Netz stellen (Netlify)

1. Geh auf **app.netlify.com/drop** und melde dich bei Bedarf kostenlos an.
2. Ziehe den **Ordner `website`** (mit `index.html` und `config.js`) in das Feld.
3. Netlify zeigt dir eine Adresse wie `https://irgendwas-123.netlify.app`. Das ist der Link für eure Gäste.
4. Ohne Konto läuft eine per Drag-and-drop hochgeladene Seite nur kurz. Melde dich deshalb an, damit sie dauerhaft bleibt.
5. Unter „Site configuration" und „Change site name" könnt ihr die Adresse verschönern, zum Beispiel `rugenhof-gaesteplan.netlify.app`.

Wenn ihr später etwas an `config.js` oder `index.html` ändert, zieht ihr den Ordner erneut auf die Netlify-Seite eurer Site (Reiter „Deploys").

## 6. Testen

1. Öffne den Link in einem Browserfenster und trage einen Testeintrag ein. Danach erscheint er in der Übersicht, und unter dem Formular siehst du deinen **persönlichen Bearbeitungslink**.
2. In Supabase unter **Table Editor** und der Tabelle `stays` solltest du den Eintrag sehen. Lösche ihn danach dort oder über die Seite.
3. Scrolle auf der Seite ganz nach unten zu „Brautpaar-Login" und melde dich mit einem der Zugänge aus Schritt 3 an. Der Bereich „Zuteilung" erscheint.
4. Teile ein, drücke „Zuteilung freigeben" und prüfe die Ansicht der Gäste in einem privaten Browserfenster.

## 7. Gäste einladen

Schickt den Link per WhatsApp oder Mail. Gäste tragen Name, Personenzahl, Anreise und Abreise ein. Sie sehen, wer wann da ist, aber die Zuteilung erst, wenn ihr sie freigebt.

## Gut zu wissen

**Wie funktioniert die Bearbeitung ohne Anmeldung?** Jeder Eintrag bekommt ein geheimes Kennzeichen. Es steckt im persönlichen Bearbeitungslink und wird im Browser des Gastes gespeichert. Wer den Link nicht hat, kann den Eintrag nicht ändern. Wer den Link verliert, meldet sich bei euch. Ihr könnt jeden Eintrag unter „Bearbeiten" ändern.

**Wer sieht was?** Namen, Personenzahl und Zeiträume sehen alle, die den Link haben. Das ist so gewollt. Gebt den Link also nur an Gäste weiter. Es werden keine weiteren persönlichen Daten gespeichert. Der Server steht in der EU (Frankfurt).

**Schutz vor Missbrauch:** Es sind höchstens 300 Einträge möglich. Mehr braucht ihr nicht, und so kann niemand die Datenbank mit Unsinn füllen.

**Kostenloser Supabase-Plan:** Projekte ohne Aktivität werden nach etwa einer Woche pausiert. Dann lädt die Seite nicht mehr. Solange Gäste die Seite öffnen, passiert das nicht. Falls es doch passiert, drückt ihr im Supabase-Dashboard auf „Restore project", die Daten bleiben erhalten.

**Fremdbuchungen auf rugenhof.de:** Die Belegung der Häuser ist ein Schnappschuss vom 11.11.2026. Sie aktualisiert sich nicht von selbst. Ändern könnt ihr sie in Supabase im Table Editor unter `units`, Spalte `blocked`. Besser: Prüft die Verfügbarkeit vor der Buchung noch einmal auf rugenhof.de, und fragt den Vermieter, ob sich Teile eines Hauses (zum Beispiel Lütt Hecht und Groot Hecht) getrennt buchen lassen.

**Daten sichern:** Im Table Editor könnt ihr jede Tabelle als CSV exportieren (Schaltfläche „Export").

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| Die Seite zeigt „Vorschau-Modus" | `config.js` ist noch leer, oder die neue Version wurde noch nicht hochgeladen. |
| „Die Daten lassen sich gerade nicht laden" | Prüfe URL und Schlüssel in `config.js` auf Tippfehler. Prüfe, ob `setup.sql` ohne Fehler durchlief. In den Supabase-Einstellungen unter „Data API" muss das Schema `public` freigegeben sein. |
| Anmeldung schlägt fehl | E-Mail und Passwort aus Schritt 3 prüfen. Das Konto muss bestätigt sein („Auto Confirm User"). |
| Anmeldung klappt, aber „Zuteilung" fehlt | Die E-Mail muss in `setup.sql` unter `admins` stehen, genau so geschrieben wie das Konto. Nachtragen geht im Table Editor in der Tabelle `admins`. |
| Ein Gast kann seinen Eintrag nicht ändern | Er benutzt ein anderes Gerät oder einen anderen Browser. Er soll seinen persönlichen Bearbeitungslink öffnen, oder ihr ändert den Eintrag unter „Bearbeiten". |
