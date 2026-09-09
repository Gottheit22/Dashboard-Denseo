-- Wartungs-Dashboard Schema
-- Im Supabase SQL-Editor ausführen: https://app.supabase.com -> dein Projekt -> SQL Editor

create extension if not exists "pgcrypto";

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'Wartung',        -- Wartung | Installation | Allgemein
  status text not null default 'offen',        -- offen | arbeit | erledigt
  assignee text,
  due_date date,
  notes text,
  checklist jsonb not null default '[]',        -- [{ "text": "...", "done": false }]
  created_at timestamptz not null default now()
);

create table if not exists protocols (
  id uuid primary key default gen_random_uuid(),
  anlage text not null,
  datum date not null default current_date,
  techniker text,
  arbeiten text,
  befund text,
  ersatzteile text,
  naechste_wartung date,
  task_id uuid references tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Row Level Security aktivieren
alter table tasks enable row level security;
alter table protocols enable row level security;
alter table notes enable row level security;

-- Einfache offene Policies: jeder mit dem anon-Key (also die App) darf lesen/schreiben.
-- Reicht für ein internes 2-Personen-Tool hinter der Passwort-Sperre der App.
-- Für striktere Sicherheit später auf echte Supabase-Auth umstellen (siehe README).
create policy "tasks_all" on tasks for all using (true) with check (true);
create policy "protocols_all" on protocols for all using (true) with check (true);
create policy "notes_all" on notes for all using (true) with check (true);

-- Realtime aktivieren, damit beide Kollegen Änderungen live sehen
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table protocols;
alter publication supabase_realtime add table notes;
