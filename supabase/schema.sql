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

-- Gracze w pokojach: każdy może zobaczyć, kto gra.
create policy room_players_select on public.room_players
  for select to authenticated using (true);

-- UWAGA: zakładać pokoje, dosiadać się i zapisywać ruchy można TYLKO przez funkcje
-- bazy z pliku 02-mecze-i-ranking.sql (one pilnują tury, wersji i rankingu).
-- Dlatego tu nie ma zasad insert / update / delete.

-- ---------------------------------------------------------------------
-- NA ŻYWO (Realtime) – gdy ktoś zrobi ruch, inni od razu dostają powiadomienie.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.rooms, public.room_players;
