# Technik-Dashboard (Next.js + Supabase)

Web-Dashboard für Wartungskoordination, Wartungsprotokolle, To-Dos bei Neu-Installationen,
Kalender und Notizen. Mehrere Nutzer sehen Änderungen live (Supabase Realtime).

## 1. Supabase-Projekt anlegen

1. Auf https://supabase.com kostenlos registrieren, "New Project" anlegen.
2. Im Projekt: **SQL Editor** öffnen, den Inhalt von `supabase/schema.sql` einfügen und ausführen.
   Das legt die Tabellen `tasks`, `protocols`, `notes` an und aktiviert Realtime.
3. Unter **Project Settings -> API** die `Project URL` und den `anon public` Key kopieren.

## 2. Projekt lokal einrichten (optional, zum Testen)

```bash
npm install
cp .env.local.example .env.local
# .env.local mit deinen echten Supabase-Werten befüllen
npm run dev
```
Dann http://localhost:3000 öffnen.

## 3. Auf Vercel deployen

1. Dieses Projekt in ein GitHub-Repository pushen (leeres Repo erstellen, dann):
   ```bash
   git init
   git add .
   git commit -m "Technik-Dashboard"
   git branch -M main
   git remote add origin <DEIN_REPO_URL>
   git push -u origin main
   ```
2. Auf https://vercel.com mit GitHub anmelden -> "Add New Project" -> das Repo auswählen.
3. Bei den **Environment Variables** eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_PASSCODE` (frei wählbarer Code, den du und dein Kollege euch merkt)
4. "Deploy" klicken. Nach ~1 Minute ist die App unter einer `*.vercel.app`-URL live.
5. Link an deinen Kollegen schicken, Zugangscode mitteilen — fertig.

Jede spätere Änderung, die du in GitHub pusht, deployt Vercel automatisch neu.

## Hinweise zu Sicherheit

- Der Zugangscode (`NEXT_PUBLIC_APP_PASSCODE`) ist ein einfacher Schutz gegen zufällige Besucher,
  aber kein echtes Login-System — er liegt im Frontend und ist kein Ersatz für Authentifizierung.
- Die Datenbank-Policies erlauben aktuell jedem mit dem `anon`-Key Lesen/Schreiben (siehe `schema.sql`).
  Das reicht für ein internes 2-Personen-Tool. Für mehr Sicherheit später:
  Supabase Auth (z. B. Magic Link oder Passwort-Login) einrichten und die Policies
  auf `auth.uid()` statt `true` umstellen.

## Projektstruktur

```
app/page.js                Einstiegspunkt (Passwortschutz + Dashboard)
components/Dashboard.jsx   Gesamte UI-Logik (Kanban, Kalender, Protokolle, Notizen)
components/PasscodeGate.jsx  Einfacher Zugangsschutz
lib/supabaseClient.js      Supabase-Verbindung
supabase/schema.sql        Datenbankschema zum Ausführen im SQL-Editor
```
