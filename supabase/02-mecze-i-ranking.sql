-- =====================================================================
-- DWA BLANKI II – mecze 1 na 1 i ranking (Supabase / Postgres)
-- Drugi "przepis na bazę" – uruchamiamy go PO schema.sql.
-- Wklej całość w Supabase: SQL Editor -> New query -> Run.
-- Można go uruchomić drugi raz – nic się nie zepsuje.
--
-- Najważniejsza zasada: BAZA PILNUJE UCZCIWOŚCI.
-- Gracze nie piszą już do tabel sami – tylko przez funkcje poniżej
-- (jak na serwerze Minecrafta: to serwer decyduje, czy wolno postawić blok).
-- =====================================================================


-- ---------------------------------------------------------------------
-- RANKING GRACZY – jeden wiersz = jeden anonimowy gracz.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users on delete cascade,
  -- ranking: start 10, nigdy mniej niż 0
  rating      integer not null default 10 check (rating >= 0),
  wins        integer not null default 0,   -- wygrane
  losses      integer not null default 0,   -- przegrane
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Ranking każdego gracza można zobaczyć (np. ranking przeciwnika).
-- Zmieniać go może tylko baza (funkcja finish_room) – dlatego brak zasad insert/update.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);


-- ---------------------------------------------------------------------
-- KOLEJKA SZUKAJĄCYCH – kto teraz kliknął "WYSZUKAJ GRĘ".
-- ---------------------------------------------------------------------
create table if not exists public.match_queue (
  user_id    uuid primary key references auth.users on delete cascade,
  rating     integer not null,                 -- ranking w chwili szukania
  country    integer not null check (country >= 0 and country <= 16),  -- wybrany kraj (17 krajów)
  joined_at  timestamptz not null default now(), -- od kiedy czeka
  last_poll  timestamptz not null default now()  -- kiedy ostatnio zapytał "jest ktoś?"
);

-- Zasady włączone, ale ŻADNYCH reguł = nikt nie czyta ani nie pisze bezpośrednio.
-- Kolejkę obsługują tylko funkcje find_match i cancel_search.
alter table public.match_queue enable row level security;


-- ---------------------------------------------------------------------
-- NOWE KOLUMNY w tabelach z schema.sql
-- ---------------------------------------------------------------------
-- kiedy zaczęła się obecna tura (do zegara 5:00)
alter table public.rooms add column if not exists turn_started_at timestamptz;
-- kto wygrał (numer miejsca 0 albo 1) i dlaczego skończyła się gra
alter table public.rooms add column if not exists winner_slot integer;
alter table public.rooms add column if not exists end_reason text;
alter table public.rooms drop constraint if exists rooms_end_reason_check;
alter table public.rooms add constraint rooms_end_reason_check
  check (end_reason in ('win', 'walkover', 'surrender'));

-- kraj gracza, jego ranking przed meczem i "bicie serca" (kiedy ostatnio dał znak życia)
alter table public.room_players add column if not exists country integer;
alter table public.room_players add column if not exists rating_before integer;
alter table public.room_players add column if not exists last_seen timestamptz not null default now();


-- ---------------------------------------------------------------------
-- ZABIERAMY BEZPOŚREDNI ZAPIS – zostaje tylko oglądanie (select).
-- ---------------------------------------------------------------------
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists rooms_delete on public.rooms;
drop policy if exists room_players_insert on public.room_players;
drop policy if exists room_players_delete on public.room_players;


-- =====================================================================
-- FUNKCJE BAZY
-- "security definer" = funkcja działa z prawami bazy (może pisać do tabel),
-- ale sama sprawdza, czy gracz ma do tego prawo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Mój ranking. Nowy gracz dostaje profil z rankingiem 10.
-- ---------------------------------------------------------------------
create or replace function public.get_my_profile()
returns public.profiles
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  result public.profiles;
begin
  if me is null then raise exception 'not_logged_in'; end if;

  insert into profiles (user_id) values (me) on conflict (user_id) do nothing;
  select * into result from profiles where user_id = me;
  return result;
end;
$$;


-- ---------------------------------------------------------------------
-- WYSZUKAJ GRĘ. Gracz wywołuje to co ~2 sekundy, dopóki nie dostanie kodu pokoju.
-- Zwraca kod pokoju (np. "BLANK-K7P2") albo null (= jeszcze szukam).
-- ---------------------------------------------------------------------
create or replace function public.find_match(p_country integer)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_rating integer;
  my_joined timestamptz;
  active_code text;
  rival record;
  me_first boolean;
  new_code text;
begin
  if me is null then raise exception 'not_logged_in'; end if;
  if p_country is null or p_country < 0 or p_country > 16 then raise exception 'bad_country'; end if;

  -- Kłódka: wszystkie dobierania idą po kolei, jedno po drugim.
  -- Dzięki temu dwie osoby nie "złapią" tego samego przeciwnika naraz.
  perform pg_advisory_xact_lock(hashtext('matchmaking'));

  -- Już gram w jakiejś grze? Wracam do niej (np. po zamknięciu strony).
  select r.code into active_code
    from rooms r join room_players p on p.room_code = r.code
   where p.user_id = me and r.status = 'playing'
   limit 1;
  if active_code is not null then
    delete from match_queue where user_id = me;
    return active_code;
  end if;

  -- Mój ranking (nowy gracz dostaje 10)
  insert into profiles (user_id) values (me) on conflict (user_id) do nothing;
  select rating into my_rating from profiles where user_id = me;

  -- Usuwamy z kolejki tych, którzy przestali pytać (zamknęli stronę)
  delete from match_queue where last_poll < now() - interval '15 seconds';

  -- Dopisuję się do kolejki albo odświeżam swój wpis (joined_at zostaje stary!)
  insert into match_queue (user_id, rating, country)
  values (me, my_rating, p_country)
  on conflict (user_id) do update
    set rating = excluded.rating, country = excluded.country, last_poll = now()
  returning joined_at into my_joined;

  -- Szukam przeciwnika: różnica rankingu najwyżej 5,
  -- ALBO ktoś z nas czeka już 30 sekund – wtedy każdy.
  -- Najpierw najbliższy ranking, potem ten, kto dłużej czeka.
  select q.* into rival
    from match_queue q
   where q.user_id <> me
     and (abs(q.rating - my_rating) <= 5
          or now() - least(q.joined_at, my_joined) >= interval '30 seconds')
   order by abs(q.rating - my_rating), q.joined_at
   limit 1;

  if not found then
    return null;   -- nikogo nie ma, pytaj znowu za chwilę
  end if;

  -- Mamy parę! Oboje wychodzą z kolejki.
  delete from match_queue where user_id in (me, rival.user_id);

  -- Kto zaczyna (miejsce 0): niższy ranking; przy remisie ten, kto dłużej czekał
  me_first := my_rating < rival.rating
              or (my_rating = rival.rating and my_joined <= rival.joined_at);

  -- Kod pokoju: BLANK- i 4 znaki (bez mylących O/0 i I/1)
  loop
    select 'BLANK-' || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                                         1 + floor(random() * 32)::int, 1), '')
      into new_code
      from generate_series(1, 4);
    exit when not exists (select 1 from rooms where code = new_code);
  end loop;

  -- Nowy pokój. Stan gry (state) jest pusty – stworzy go gracz z miejsca 0
  -- funkcją createGame z rules.js i wyśle jako wersję 1.
  insert into rooms (code, host_id, status, settings, version)
  values (
    new_code, me, 'playing',
    jsonb_build_object(
      'sizeKey', 'mala',
      'countries', case when me_first
                        then jsonb_build_array(p_country, rival.country)
                        else jsonb_build_array(rival.country, p_country) end
    ),
    0
  );

  insert into room_players (room_code, user_id, slot, country, rating_before, last_seen) values
    (new_code, me,             case when me_first then 0 else 1 end, p_country,     my_rating,    now()),
    (new_code, rival.user_id,  case when me_first then 1 else 0 end, rival.country, rival.rating, now());

  return new_code;
end;
$$;


-- ---------------------------------------------------------------------
-- ANULUJ szukanie – wychodzę z kolejki.
-- ---------------------------------------------------------------------
create or replace function public.cancel_search()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from match_queue where user_id = auth.uid();
end;
$$;


-- ---------------------------------------------------------------------
-- (wewnętrzna) KONIEC GRY: zapisuje zwycięzcę i zmienia ranking.
-- Działa tylko raz – drugi raz nic nie robi, bo gra już jest "finished".
-- ---------------------------------------------------------------------
create or replace function public.finish_room(p_code text, p_winner_slot integer, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  winner_id uuid;
  loser_id uuid;
begin
  select user_id into winner_id from room_players where room_code = p_code and slot = p_winner_slot;
  select user_id into loser_id  from room_players where room_code = p_code and slot <> p_winner_slot limit 1;
  if winner_id is null or loser_id is null then raise exception 'bad_winner'; end if;

  update rooms
     set status = 'finished', winner_slot = p_winner_slot, end_reason = p_reason, updated_at = now()
   where code = p_code and status = 'playing';
  if not found then return; end if;   -- gra już była skończona

  -- Wygrana +2, przegrana -1 (ale nie mniej niż 0)
  update profiles set rating = rating + 2, wins = wins + 1 where user_id = winner_id;
  update profiles set rating = greatest(0, rating - 1), losses = losses + 1 where user_id = loser_id;
end;
$$;


-- ---------------------------------------------------------------------
-- (wewnętrzna) Zapisuje nowy stan gry i podbija numer wersji.
-- Używają jej submit_state i claim_timeout (po swoich sprawdzeniach).
-- ---------------------------------------------------------------------
create or replace function public.save_state(p_code text, p_state jsonb, p_me uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  old_room rooms%rowtype;
  new_version integer;
begin
  select * into old_room from rooms where code = p_code;
  new_version := old_room.version + 1;

  update rooms
     set state = p_state,
         version = new_version,
         updated_at = now(),
         -- zegar tury startuje od nowa, gdy zmienił się gracz z turą (albo to pierwszy stan)
         turn_started_at = case
           when old_room.version = 0
             or (p_state->>'current') is distinct from (old_room.state->>'current')
           then now() else turn_started_at end
   where code = p_code;

  -- wysłanie ruchu to też znak życia
  update room_players set last_seen = now() where room_code = p_code and user_id = p_me;

  -- Ktoś wygrał? (w stanie gry pole "winner" to numer gracza albo null)
  if jsonb_typeof(p_state->'winner') = 'number' then
    perform finish_room(p_code, (p_state->>'winner')::int, 'win');
  end if;

  return new_version;
end;
$$;


-- ---------------------------------------------------------------------
-- (wewnętrzna) Wspólne sprawdzenia przed zapisem stanu. Zwraca mój numer miejsca.
-- ---------------------------------------------------------------------
create or replace function public.check_room_write(p_code text, p_state jsonb, p_expected_version integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  room_row rooms%rowtype;
  my_slot integer;
begin
  if me is null then raise exception 'not_logged_in'; end if;

  -- "for update" = blokujemy ten pokój, dopóki nie skończymy zapisu
  select * into room_row from rooms where code = p_code for update;
  if not found then raise exception 'no_room'; end if;

  select slot into my_slot from room_players where room_code = p_code and user_id = me;
  if my_slot is null then raise exception 'not_in_room'; end if;

  if room_row.status <> 'playing' then raise exception 'game_over'; end if;
  -- numer wersji się nie zgadza = ktoś zapisał coś w międzyczasie
  if room_row.version <> p_expected_version then raise exception 'conflict'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then raise exception 'bad_state'; end if;
  -- zabezpieczenie przed zaśmiecaniem bazy ogromnymi danymi
  if pg_column_size(p_state) > 500000 then raise exception 'state_too_big'; end if;

  return my_slot;
end;
$$;


-- ---------------------------------------------------------------------
-- ZAPISZ RUCH. Wolno tylko graczowi, który ma teraz turę,
-- i tylko gdy zna aktualny numer wersji (p_expected_version).
-- Pierwszy stan (wersja 0) może wysłać każdy z dwóch graczy.
-- Zwraca nowy numer wersji.
-- ---------------------------------------------------------------------
create or replace function public.submit_state(p_code text, p_state jsonb, p_expected_version integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  my_slot integer;
  room_row rooms%rowtype;
begin
  my_slot := check_room_write(p_code, p_state, p_expected_version);
  select * into room_row from rooms where code = p_code;

  if room_row.version > 0 and (room_row.state->>'current')::int <> my_slot then
    raise exception 'not_your_turn';
  end if;

  return save_state(p_code, p_state, auth.uid());
end;
$$;


-- ---------------------------------------------------------------------
-- CZAS MINĄŁ. Gracz BEZ tury może zakończyć cudzą turę, gdy minęło 5:00
-- (+15 s zapasu). Wysyła stan po endTurn – teraz tura ma należeć do niego.
-- ---------------------------------------------------------------------
create or replace function public.claim_timeout(p_code text, p_state jsonb, p_expected_version integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  my_slot integer;
  room_row rooms%rowtype;
begin
  my_slot := check_room_write(p_code, p_state, p_expected_version);
  select * into room_row from rooms where code = p_code;

  if room_row.version = 0 then raise exception 'not_started'; end if;
  if (room_row.state->>'current')::int = my_slot then raise exception 'your_turn'; end if;
  if room_row.turn_started_at > now() - interval '5 minutes 15 seconds' then
    raise exception 'too_early';
  end if;
  if (p_state->>'current')::int is distinct from my_slot then raise exception 'bad_state'; end if;

  return save_state(p_code, p_state, auth.uid());
end;
$$;


-- ---------------------------------------------------------------------
-- BICIE SERCA – "jestem w grze". Gra wywołuje to co ~10 sekund.
-- ---------------------------------------------------------------------
create or replace function public.heartbeat(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update room_players set last_seen = now()
   where room_code = p_code and user_id = auth.uid();
end;
$$;


-- ---------------------------------------------------------------------
-- WALKOWER. Wygrywam, jeśli przeciwnik nie dał znaku życia od 2 minut.
-- Zwraca true (wygrałem) albo false (jeszcze nie można).
-- ---------------------------------------------------------------------
create or replace function public.claim_walkover(p_code text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_slot integer;
  rival_seen timestamptz;
begin
  if me is null then raise exception 'not_logged_in'; end if;
  perform 1 from rooms where code = p_code and status = 'playing' for update;
  if not found then return false; end if;

  select slot into my_slot from room_players where room_code = p_code and user_id = me;
  if my_slot is null then raise exception 'not_in_room'; end if;

  -- ja jestem, więc odświeżam swoje bicie serca
  update room_players set last_seen = now() where room_code = p_code and user_id = me;

  select last_seen into rival_seen from room_players where room_code = p_code and user_id <> me;
  if rival_seen > now() - interval '2 minutes' then return false; end if;

  perform finish_room(p_code, my_slot, 'walkover');
  return true;
end;
$$;


-- ---------------------------------------------------------------------
-- PODDAJ SIĘ – przeciwnik wygrywa.
-- ---------------------------------------------------------------------
create or replace function public.surrender(p_code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  rival_slot integer;
begin
  if me is null then raise exception 'not_logged_in'; end if;
  if not exists (select 1 from room_players where room_code = p_code and user_id = me) then
    raise exception 'not_in_room';
  end if;
  select slot into rival_slot from room_players where room_code = p_code and user_id <> me;
  perform finish_room(p_code, rival_slot, 'surrender');
end;
$$;


-- ---------------------------------------------------------------------
-- KTO MOŻE WYWOŁAĆ KTÓRĄ FUNKCJĘ
-- Supabase domyślnie pozwala wszystkim – więc najpierw zabieramy, potem dajemy.
-- Funkcje wewnętrzne (finish_room, save_state, check_room_write) – nikt z zewnątrz.
-- ---------------------------------------------------------------------
revoke execute on function public.finish_room(text, integer, text)            from public, anon, authenticated;
revoke execute on function public.save_state(text, jsonb, uuid)               from public, anon, authenticated;
revoke execute on function public.check_room_write(text, jsonb, integer)      from public, anon, authenticated;

revoke execute on function public.get_my_profile()                            from public, anon;
revoke execute on function public.find_match(integer)                         from public, anon;
revoke execute on function public.cancel_search()                             from public, anon;
revoke execute on function public.submit_state(text, jsonb, integer)          from public, anon;
revoke execute on function public.claim_timeout(text, jsonb, integer)         from public, anon;
revoke execute on function public.heartbeat(text)                             from public, anon;
revoke execute on function public.claim_walkover(text)                        from public, anon;
revoke execute on function public.surrender(text)                             from public, anon;

grant execute on function public.get_my_profile()                             to authenticated;
grant execute on function public.find_match(integer)                          to authenticated;
grant execute on function public.cancel_search()                              to authenticated;
grant execute on function public.submit_state(text, jsonb, integer)           to authenticated;
grant execute on function public.claim_timeout(text, jsonb, integer)          to authenticated;
grant execute on function public.heartbeat(text)                              to authenticated;
grant execute on function public.claim_walkover(text)                         to authenticated;
grant execute on function public.surrender(text)                              to authenticated;
