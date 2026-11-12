-- =====================================================================
-- Fahrgemeinschaften: Angebote ("Ich fahre und habe Plätze frei") und
-- Gesuche ("Ich suche eine Mitfahrt"), dazu Mitfahrende pro Angebot.
-- Gleiches Muster wie stays: geheimes Secret pro Eintrag, Gäste lesen nur
-- die *_public-Views und schreiben nur über security-definer-RPCs.
-- Einmal im Supabase-SQL-Editor ausführen (idempotent).
-- =====================================================================

create table if not exists rides (
  id         uuid primary key,
  secret     text not null,
  kind       text not null check (kind in ('offer', 'request')),
  name       text not null check (char_length(name) between 1 and 60),
  origin     text not null check (char_length(origin) between 1 and 80),
  direction  text not null check (direction in ('hin', 'rueck', 'beide')),
  day_out    date,
  day_back   date,
  time_note  text not null default '' check (char_length(time_note) <= 40),
  seats      int  not null check (seats between 1 and 8),
  contact    text not null default '' check (char_length(contact) <= 80),
  note       text not null default '' check (char_length(note) <= 200),
  updated_at timestamptz not null default now(),
  check (direction = 'rueck' or day_out is not null),
  check (direction = 'hin' or day_back is not null),
  check (day_out is null or day_back is null or day_back >= day_out)
);

create table if not exists ride_passengers (
  id         uuid primary key,
  secret     text not null,
  ride_id    uuid not null references rides(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  persons    int  not null check (persons between 1 and 8),
  contact    text not null default '' check (char_length(contact) <= 80),
  note       text not null default '' check (char_length(note) <= 140),
  created_at timestamptz not null default now()
);
create index if not exists ride_passengers_ride_idx on ride_passengers(ride_id);

create or replace view rides_public as
  select id, kind, name, origin, direction, day_out, day_back, time_note, seats, contact, note, updated_at from rides;
create or replace view ride_passengers_public as
  select id, ride_id, name, persons, contact, note, created_at from ride_passengers;

alter table rides           enable row level security;
alter table ride_passengers enable row level security;
revoke all on rides, ride_passengers from anon;

drop policy if exists rides_admin on rides;
drop policy if exists ride_passengers_admin on ride_passengers;
create policy rides_admin           on rides           for all to authenticated using (is_admin()) with check (is_admin());
create policy ride_passengers_admin on ride_passengers for all to authenticated using (is_admin()) with check (is_admin());

grant select on rides_public, ride_passengers_public to anon, authenticated;
grant all on rides, ride_passengers to authenticated;

-- Angebot/Gesuch anlegen oder ändern ------------------------------------
create or replace function save_ride(
  p_id uuid, p_secret text, p_kind text, p_name text, p_origin text, p_direction text,
  p_day_out date, p_day_back date, p_time_note text, p_seats int, p_contact text, p_note text
) returns void language plpgsql security definer set search_path = public as $$
declare taken int;
begin
  if p_secret is null or char_length(p_secret) < 16 then raise exception 'invalid secret'; end if;
  if exists (select 1 from rides where id = p_id) then
    select coalesce(sum(persons), 0) into taken from ride_passengers where ride_id = p_id;
    if p_kind = 'offer' and p_seats < taken then raise exception 'seats below passengers'; end if;
    update rides set
      kind = p_kind, name = trim(p_name), origin = trim(p_origin), direction = p_direction,
      day_out = case when p_direction = 'rueck' then null else p_day_out end,
      day_back = case when p_direction = 'hin' then null else p_day_back end,
      time_note = coalesce(trim(p_time_note), ''), seats = p_seats,
      contact = coalesce(trim(p_contact), ''), note = coalesce(trim(p_note), ''), updated_at = now()
    where id = p_id and secret = p_secret;
    if not found then raise exception 'forbidden'; end if;
    if p_kind = 'request' then delete from ride_passengers where ride_id = p_id; end if;
  else
    if (select count(*) from rides) >= 300 then raise exception 'limit reached'; end if;
    insert into rides (id, secret, kind, name, origin, direction, day_out, day_back, time_note, seats, contact, note)
    values (p_id, p_secret, p_kind, trim(p_name), trim(p_origin), p_direction,
            case when p_direction = 'rueck' then null else p_day_out end,
            case when p_direction = 'hin' then null else p_day_back end,
            coalesce(trim(p_time_note), ''), p_seats, coalesce(trim(p_contact), ''), coalesce(trim(p_note), ''));
  end if;
end $$;

create or replace function delete_ride(p_id uuid, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from rides where id = p_id and secret = p_secret;
  if not found then raise exception 'forbidden'; end if;
end $$;

-- Bei einem Angebot mitfahren (oder Angaben ändern) ------------------------
create or replace function join_ride(
  p_id uuid, p_secret text, p_ride uuid, p_name text, p_persons int, p_contact text, p_note text
) returns void language plpgsql security definer set search_path = public as $$
declare r rides%rowtype; taken int;
begin
  if p_secret is null or char_length(p_secret) < 16 then raise exception 'invalid secret'; end if;
  select * into r from rides where id = p_ride for update;   -- serialisiert parallele Buchungen
  if not found or r.kind <> 'offer' then raise exception 'ride not found'; end if;
  select coalesce(sum(persons), 0) into taken from ride_passengers where ride_id = p_ride and id <> p_id;
  if taken + p_persons > r.seats then raise exception 'ride full'; end if;
  if exists (select 1 from ride_passengers where id = p_id) then
    update ride_passengers set name = trim(p_name), persons = p_persons,
           contact = coalesce(trim(p_contact), ''), note = coalesce(trim(p_note), '')
     where id = p_id and secret = p_secret and ride_id = p_ride;
    if not found then raise exception 'forbidden'; end if;
  else
    if (select count(*) from ride_passengers) >= 600 then raise exception 'limit reached'; end if;
    insert into ride_passengers (id, secret, ride_id, name, persons, contact, note)
    values (p_id, p_secret, p_ride, trim(p_name), p_persons, coalesce(trim(p_contact), ''), coalesce(trim(p_note), ''));
  end if;
end $$;

create or replace function leave_ride(p_id uuid, p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from ride_passengers where id = p_id and secret = p_secret;
  if not found then raise exception 'forbidden'; end if;
end $$;

grant execute on function save_ride(uuid, text, text, text, text, text, date, date, text, int, text, text) to anon, authenticated;
grant execute on function delete_ride(uuid, text) to anon, authenticated;
grant execute on function join_ride(uuid, text, uuid, text, int, text, text) to anon, authenticated;
grant execute on function leave_ride(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
