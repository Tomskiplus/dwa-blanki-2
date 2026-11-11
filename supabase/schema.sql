-- =====================================================================
-- DWA BLANKI II – baza danych do gry przez internet (Supabase / Postgres)
-- Ten plik to "przepis na bazę". Wklej całość w Supabase:
-- SQL Editor -> New query -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabela POKOI – jeden wiersz = jedna gra przez internet.
-- ---------------------------------------------------------------------
create table public.rooms (
  -- kod pokoju, który gracze wpisują, np. "BLANK-4821"
  code        text primary key,
  -- kto założył pokój (anonimowy identyfikator gracza, bez danych osobowych)
  host_id     uuid not null default auth.uid() references auth.users on delete cascade,
  -- etap gry: poczekalnia, trwa, skończona
  status      text not null default 'lobby'
              check (status in ('lobby', 'playing', 'finished')),
  -- ustawienia z poczekalni (rozmiar planszy, liczba graczy itp.)
  settings    jsonb not null default '{}'::jsonb,
  -- cały "zapis świata" gry – ten sam obiekt, który tworzy createGame() w rules.js
  state       jsonb,
  -- numer zapisu: rośnie o 1 po każdym ruchu, żeby dwa zapisy się nie nadpisały
  version     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabela GRACZY W POKOJU – kto siedzi przy którym "miejscu" (kraju).
-- ---------------------------------------------------------------------
create table public.room_players (
  room_code  text not null references public.rooms (code) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  -- numer miejsca przy stole: 0, 1, 2 ... (gracz w grze)
  slot       integer not null check (slot >= 0 and slot < 8),
  joined_at  timestamptz not null default now(),
  primary key (room_code, user_id),
  -- jedno miejsce = jeden gracz
  unique (room_code, slot)
);

-- ---------------------------------------------------------------------
-- ZASADY DOSTĘPU (Row Level Security) – kto może co robić.
-- "authenticated" = gracz zalogowany anonimowo przez naszą grę.
-- ---------------------------------------------------------------------
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;

-- Pokoje: każdy gracz może je oglądać (przyda się też do listy gier – lobby).
create policy rooms_select on public.rooms
  for select to authenticated using (true);

-- Pokój możesz założyć tylko na siebie.
create policy rooms_insert on public.rooms
  for insert to authenticated with check (host_id = (select auth.uid()));

-- Zmieniać stan gry mogą tylko gracze, którzy siedzą w tym pokoju.
create policy rooms_update on public.rooms
  for update to authenticated
  using (exists (select 1 from public.room_players p
                 where p.room_code = rooms.code and p.user_id = (select auth.uid())))
  with check (exists (select 1 from public.room_players p
                      where p.room_code = rooms.code and p.user_id = (select auth.uid())));

-- Usunąć pokój może tylko jego założyciel.
create policy rooms_delete on public.rooms
  for delete to authenticated using (host_id = (select auth.uid()));

-- Gracze w pokojach: każdy może zobaczyć, kto gra.
create policy room_players_select on public.room_players
  for select to authenticated using (true);

-- Dosiąść się możesz tylko sam (za siebie) i tylko gdy pokój czeka w poczekalni.
create policy room_players_insert on public.room_players
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.rooms r
                          where r.code = room_code and r.status = 'lobby'));

-- Wyjść z pokoju możesz tylko sam.
create policy room_players_delete on public.room_players
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- NA ŻYWO (Realtime) – gdy ktoś zrobi ruch, inni od razu dostają powiadomienie.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.rooms, public.room_players;
