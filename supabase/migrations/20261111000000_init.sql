-- =====================================================================
-- Rugenhof Gästeplan: Einrichtung der Datenbank in Supabase
--
-- So geht's: In Supabase links "SQL Editor" öffnen, "New query" wählen,
-- diesen ganzen Text einfügen und auf "Run" klicken.
--
-- WICHTIG VORHER: Ersetze unten bei "admins" die beiden Platzhalter durch
-- eure echten E-Mail-Adressen. Nur diese beiden dürfen später die
-- Zuteilung sehen und ändern.
-- =====================================================================

-- 1) Wer darf zuteilen? ------------------------------------------------
create table if not exists admins (email text primary key);

insert into admins (email) values
  ('matthiasjaeger16@gmail.com'),
  ('quass.stefanie@gmail.com')
on conflict do nothing;

alter table admins enable row level security;   -- keine Regel: nur is_admin() darf die Liste lesen

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function is_admin() to anon, authenticated;

-- 2) Tabellen -----------------------------------------------------------
create table if not exists units (
  id       text primary key,
  name     text not null,
  grp      text not null default '',
  beds     int  not null check (beds between 1 and 60),
  max_beds int  not null check (max_beds >= beds),
  note     text not null default '',
  ord      int  not null default 0,
  blocked  text[] not null default '{}',
  as_of    text not null default ''
);

create table if not exists stays (
  id         uuid primary key,
  secret     text not null default replace(gen_random_uuid()::text, '-', ''),
  name       text not null check (char_length(name) between 1 and 60),
  persons    int  not null check (persons between 1 and 40),
  from_date  date not null,
  to_date    date not null,
  note       text not null default '' check (char_length(note) <= 140),
  manual     boolean not null default false,
  updated_at timestamptz not null default now(),
  check (to_date > from_date)
);

create table if not exists assignments (
  stay_id uuid primary key references stays(id) on delete cascade,
  unit_id text not null references units(id) on delete cascade
);

create table if not exists config (
  id int primary key check (id = 1),
  wedding_from date,
  wedding_to   date
);

create table if not exists release (
  id       int primary key check (id = 1),
  released boolean not null default false,
  map      jsonb not null default '{}'::jsonb,
  at       timestamptz not null default now()
);

-- Öffentliche Sicht auf die Einträge: ohne das geheime Bearbeitungs-Token
create or replace view stays_public as
  select id, name, persons, from_date, to_date, note, manual, updated_at from stays;

-- 3) Sicherheitsregeln --------------------------------------------------
alter table units       enable row level security;
alter table stays       enable row level security;
alter table assignments enable row level security;
alter table config      enable row level security;
alter table release     enable row level security;

revoke all on stays, assignments from anon;

drop policy if exists units_read   on units;
drop policy if exists units_admin  on units;
drop policy if exists stays_admin  on stays;
drop policy if exists assign_admin on assignments;
drop policy if exists config_read  on config;
drop policy if exists config_admin on config;
drop policy if exists release_read on release;
drop policy if exists release_admin on release;

create policy units_read    on units for select using (true);
create policy units_admin   on units for all to authenticated using (is_admin()) with check (is_admin());
create policy stays_admin   on stays for all to authenticated using (is_admin()) with check (is_admin());
create policy assign_admin  on assignments for all to authenticated using (is_admin()) with check (is_admin());
create policy config_read   on config for select using (true);
create policy config_admin  on config for all to authenticated using (is_admin()) with check (is_admin());
create policy release_read  on release for select using (true);
create policy release_admin on release for all to authenticated using (is_admin()) with check (is_admin());

grant select on units, config, release, stays_public to anon, authenticated;
grant all on units, stays, assignments, config, release to authenticated;

-- 4) Eintragen und Löschen für Gäste ----------------------------------
-- Gäste dürfen nur über diese beiden Funktionen schreiben. Ein Eintrag
-- lässt sich nur ändern, wenn das geheime Token aus dem persönlichen
-- Bearbeitungslink stimmt.
create or replace function save_stay(
  p_id uuid, p_secret text, p_name text, p_persons int, p_from date, p_to date, p_note text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or char_length(p_secret) < 16 then
    raise exception 'invalid secret';
  end if;
  if exists (select 1 from stays where id = p_id) then
    update stays
       set name = trim(p_name), persons = p_persons, from_date = p_from, to_date = p_to,
           note = coalesce(trim(p_note), ''), updated_at = now()
     where id = p_id and secret = p_secret;
    if not found then raise exception 'forbidden'; end if;
  else
    if (select count(*) from stays) >= 300 then raise exception 'limit reached'; end if;
    insert into stays (id, secret, name, persons, from_date, to_date, note)
    values (p_id, p_secret, trim(p_name), p_persons, p_from, p_to, coalesce(trim(p_note), ''));
  end if;
end $$;

create or replace function delete_stay(p_id uuid, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from stays where id = p_id and secret = p_secret;
  if not found then raise exception 'forbidden'; end if;
end $$;

grant execute on function save_stay(uuid, text, text, int, date, date, text) to anon, authenticated;
grant execute on function delete_stay(uuid, text) to anon, authenticated;

-- 5) Startdaten: die sechs Einheiten vom Rugenhof (Stand 11.11.2026) ------
-- "blocked" sind Fremdbuchungen laut rugenhof.de: von/bis (Abreisetag).
insert into units (id, name, grp, beds, max_beds, ord, blocked, as_of) values
  ('lutt-hecht',   'Lütt Hecht',        'Haus Hecht',    3,  5, 0, '{2027-07-29/2027-08-01,2027-08-02/2027-08-06,2027-08-20/2027-08-26}', '11.11.2026'),
  ('groot-hecht',  'Groot Hecht',       'Haus Hecht',   10, 14, 1, '{2027-07-29/2027-08-01,2027-08-02/2027-08-06,2027-08-20/2027-08-26}', '11.11.2026'),
  ('flussbarsch',  'Flussbarsch',       'Haus Barsch',   6,  8, 2, '{2027-07-29/2027-08-07,2027-08-26/2027-08-29}', '11.11.2026'),
  ('boddenbarsch', 'Boddenbarsch',      'Haus Barsch',   7,  9, 3, '{2027-07-29/2027-08-07,2027-08-26/2027-08-29}', '11.11.2026'),
  ('ploetz',       'Haus Plötz',        'Ganzes Haus',  10, 16, 4, '{2027-07-29/2027-08-07,2027-08-19/2027-08-22,2027-08-27/2027-08-29}', '11.11.2026'),
  ('boddenkieker', 'FeWo Boddenkieker', 'Ferienwohnung', 4,  6, 5, '{2027-07-29/2027-08-07}', '11.11.2026')
on conflict (id) do nothing;

insert into config (id, wedding_from, wedding_to) values (1, '2027-08-16', '2027-08-18') on conflict (id) do nothing;
insert into release (id) values (1) on conflict (id) do nothing;

notify pgrst, 'reload schema';
