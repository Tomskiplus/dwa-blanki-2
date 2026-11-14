# Gra przez internet (WYSZUKAJ GRĘ, 1 na 1, ranking) – plan implementacji

## Overview
Tryb MULTIPLAYER: przycisk **WYSZUKAJ GRĘ** dobiera przeciwnika o podobnym rankingu i gracie 1 na 1
przez internet. Backend to Supabase (wybór TATY 2026-11-11): anonimowe logowanie, Postgres, Realtime.
Zasady gry (`rules.js`) zostają bez zmian – każdy komputer liczy ruchy tymi samymi funkcjami, a baza
przechowuje „zapis świata” i pilnuje kolejności, rankingu i walkowerów.

## Current State Analysis
- Przycisk MULTIPLAYER już jest, pokazuje „wkrótce!” (`game.js:277`). Ekrany przełącza `goToScreen`
  (`game.js:85`), przyciski ekranu zwraca `getButtons()` (`game.js:452`).
- Stan gry to zwykły obiekt JSON z `createGame(playerCount, sizeKey, countryIndexes)` (`rules.js:154`):
  `players`, `current`, `turn`, `objects`, `buildPoints`, `squads`, `winner` … – da się go wysłać w całości.
- W `rules.js` i `game.js` **nie ma `Math.random`** – ten sam ruch daje ten sam wynik na każdym komputerze.
- UI pamięta zaznaczenia po **id** (`selectedBuildingId`, `selectedUnitId`, `game.js:68-69`), więc podmiana
  obiektu `game` na nowy (z bazy) nie psuje zaznaczeń.
- Stan gry zmienia się w 6 miejscach `game.js`: `buyFromMenu` (ulepszenie/badanie, `game.js:409,416`),
  `attackTarget` (`game.js:643`, ustawia `game.winner` → ekran `victory` w `game.js:655`), `finishTurn`
  (`game.js:668`), `goToNextEra` (`game.js:677`), stawianie budynku/jednostki (`game.js:746-747`),
  `moveSquad` (`game.js:776`).
- Baza: `supabase/schema.sql` (uruchomiony przez TATĘ) – `rooms`, `room_players`, RLS, Realtime.
  Dane połączenia: `supabase-config.js` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`). Anonimowe logowanie
  włączone (sprawdzone przez `/auth/v1/settings`).
- Testy: `node tests/run-tests.js` (219 testów, wczytuje `data.js` i `rules.js` przez `vm`). Node v26 – ma `fetch`.

## Desired End State
Dwóch graczy na dwóch komputerach (albo w zwykłym + prywatnym oknie) klika MULTIPLAYER → widzi swój ranking
→ wybiera kraj → WYSZUKAJ GRĘ → po chwili obaj są w tej samej grze na planszy MAŁEJ. Ruchy przeciwnika widać
na żywo, klikać można tylko w swojej turze, tura ma 5:00. Po wygranej ranking zmienia się o +2 / −1 (nie
mniej niż 0). Zamknięcie strony = 2:00 na powrót, potem walkower. W grze zamiast MENU jest PODDAJ SIĘ.
Tryb EDYTOR (gra na jednym komputerze) działa jak dotąd.

### Key Discoveries:
- Brak losowości w zasadach → wystarczy synchronizować cały stan; obie strony liczą identycznie.
- Jedyne „losowe” rzeczy (kod pokoju) robi baza, nie `rules.js`.
- Supabase Free: funkcje Postgres (`security definer`) są darmowe – w nich robimy dobieranie, ranking,
  walkower i pilnowanie tury, bez Edge Functions.

## Ustalone zasady (od Tomka, 2026-11-11)
| Sprawa | Ustalenie |
|---|---|
| Szukanie | Przycisk WYSZUKAJ GRĘ, zawsze 1 na 1 (bez kodów pokoju na razie) |
| Ranking | Start 10, wygrana +2, przegrana −1, nigdy poniżej 0 |
| Dobieranie | Różnica rankingu ≤ 5; gdy ktoś z pary czeka ≥ 30 s – każdy (najbliższy ranking, potem kto dłużej czeka) |
| Kraj / plansza | Kraj wybierany przed szukaniem (◀ ▶); plansza zawsze MAŁA 20×15; ten sam kraj → numery jak w EDYTORZE |
| Kto zaczyna | Niższy ranking; przy remisie ten, kto dłużej czekał |
| Tura przeciwnika | Każdy ruch na żywo; można klikać, żeby czytać statystyki, ale nic nie zmienisz |
| Wyjście | 2:00 na powrót (ta sama przeglądarka); potem walkower (+2 / −1). MENU w grze → PODDAJ SIĘ (z potwierdzeniem) |
| Czas tury | 5:00; po czasie tura kończy się sama (to, co zrobione, zostaje) |

## What We're NOT Doing
- Pokoje z kodem dla znajomych, lista otwartych gier, gry 3–8 graczy przez internet.
- Czat, nicki, imiona – gracze widzą tylko kraj i ranking (prywatność).
- Prawdziwe konta (ranking na wielu komputerach) – anonimowy gracz = ta przeglądarka. Decyzja TATY na później.
- Pełna ochrona przed oszustwem (serwer liczący zasady w Edge Function) – na później; teraz baza pilnuje
  tury, wersji, walkowerów i rankingu, ale „podrobiony” stan gry wysłany przez gracza jest możliwy.
- Tabela najlepszych graczy (top 10).
- Obsługa tej samej gry otwartej w dwóch kartach jednej przeglądarki.
- Publikacja na GitHub Pages – osobno, `/opublikuj` z TATĄ po skończeniu.

## Implementation Approach
- **Baza decyduje, przeglądarka liczy.** Funkcje SQL robią wszystko, co musi być uczciwe i jednoczesne:
  dobieranie (z blokadą, żeby dwie osoby nie złapały tego samego przeciwnika), zapis stanu tylko przez
  gracza z turą i z właściwym `version`, ranking, walkower, poddanie. Klienci nie mają już prawa
  pisać do tabel bezpośrednio – tylko przez funkcje (RPC).
- **Przeglądarka:** `network.js` = jedyne miejsce z Supabase (wymienialne, jak obiecaliśmy TACIE);
  `online.js` = ekrany i logika trybu online (szukanie, czasomierze, rozłączenia), żeby nie puchł `game.js`
  (1617 linii). `game.js` dostaje tylko małe „haczyki”: blokadę akcji poza swoją turą i `afterAction()`
  po każdej z 6 zmian stanu.
- Biblioteka `@supabase/supabase-js` (UMD) z `cdn.jsdelivr.net`, w **dokładnej** wersji (zgoda TATY 2026-11-11).

## Critical Implementation Details
- **Dobieranie bez wyścigu:** `find_match` zaczyna od `pg_advisory_xact_lock(hashtext('matchmaking'))` –
  wszystkie dobierania idą po kolei. Przy tej skali to nic nie kosztuje, a dwa równoczesne wywołania nie
  stworzą dwóch pokoi z tym samym graczem.
- **Pierwszy stan gry:** baza nie umie uruchomić `createGame` (to JS). Pokój powstaje z `state = null`,
  `version = 0`, `settings = { sizeKey: "mala", countries: [kraj slotu 0, kraj slotu 1] }`. Gracz ze slotu 0
  tworzy stan `createGame(2, "mala", countries)` i wysyła go jako wersję 1; slot 1 czeka na Realtime
  (fallback: gdy po 5 s nadal pusto – sam tworzy; `version = 0` w warunku sprawia, że wygra tylko pierwszy,
  a wynik jest identyczny).
- **Realtime może nie przysłać dużego JSON-a** (limit wielkości wiadomości). Po każdym powiadomieniu
  o zmianie pokoju, w którym brakuje `state` albo `version` jest wyższa o więcej niż 1, klient pobiera
  wiersz zwykłym `select`.
- **Kolejność zapisów:** akcje jednego gracza wysyłamy po kolei (kolejka w `network.js`), każda z
  `expected_version`. Błąd `conflict` → pobierz stan z bazy i nadpisz lokalny (komunikat „Zsynchronizowano”).
- **Testy SQL zakładają anonimowych użytkowników** (śmieci w bazie TATY – akceptowalne, mało). Po włączeniu
  captchy (etap 5) skrypt nie zaloguje się bez tokenu – wtedy oznacza się go jako „tylko przed captchą”.

## Phase 1: Baza – mecze i ranking

### Overview
Nowy skrypt SQL dokładający ranking, kolejkę szukających i funkcje bazy. TATA uruchamia go w SQL Editor.
Agent sprawdza funkcje automatycznie skryptem Node, który udaje dwóch graczy.

### Changes Required:

#### 1. Skrypt bazy
**File**: `supabase/02-mecze-i-ranking.sql` (nowy; komentarze po polsku jak w `schema.sql`)
**Intent**: Wszystko, co musi być uczciwe, robi baza. Zabieramy klientom bezpośredni zapis do tabel.
**Contract**:
- `profiles(user_id uuid pk → auth.users on delete cascade, rating int not null default 10 check (rating >= 0),
  wins int default 0, losses int default 0, created_at)`; RLS: `select` dla `authenticated` (ranking
  przeciwnika), brak insert/update/delete.
- `match_queue(user_id uuid pk, rating int, country int check 0..16, joined_at timestamptz, last_poll timestamptz)`;
  RLS włączone, brak polityk (dostęp tylko przez funkcje).
- `rooms` + kolumny: `turn_started_at timestamptz`, `winner_slot int`, `end_reason text check in
  ('win','walkover','surrender')`. `room_players` + kolumny: `country int`, `rating_before int`,
  `last_seen timestamptz default now()`.
- Usunąć polityki `rooms_insert`, `rooms_update`, `rooms_delete`, `room_players_insert`,
  `room_players_delete` (zostają tylko `select`). Poprawić `schema.sql` tak samo, żeby był aktualnym
  „przepisem” (dla nowej bazy: `schema.sql` + `02-…`).
- Funkcje (`security definer`, `set search_path = public`, `revoke execute … from public, anon`,
  `grant execute … to authenticated`):
  - `get_my_profile() returns profiles` – tworzy profil (ranking 10), jeśli go nie ma.
  - `find_match(p_country int) returns text` – kod pokoju albo `null`. Kolejno: blokada (patrz wyżej);
    jeśli jestem w pokoju `playing` → zwróć jego kod (powrót do gry); usuń z kolejki wpisy z
    `last_poll` starszym niż 15 s; dopisz/odśwież mnie (zachowaj `joined_at`); wybierz przeciwnika:
    `abs(różnica) <= 5 OR now() - least(mój joined_at, jego joined_at) >= 30 s`, sortuj po
    `abs(różnica)`, potem `joined_at`. Gdy jest: usuń oboje z kolejki, utwórz pokój (kod `BLANK-` + 4 znaki
    bez mylących liter, powtórz przy kolizji), slot 0 = niższy ranking (remis → wcześniejszy `joined_at`),
    `status = 'playing'`, `room_players` z `country` i `rating_before`.
  - `cancel_search()` – usuwa mnie z kolejki.
  - `submit_state(p_code text, p_state jsonb, p_expected_version int) returns int` – nowa wersja. Warunki:
    pokój `playing`, jestem w nim, `version = p_expected_version` (inaczej `raise 'conflict'`); przy
    `version = 0` może każdy z graczy, potem tylko slot równy `(state->>'current')::int` **starego** stanu.
    Ustawia `version + 1`, `updated_at`, `turn_started_at` (gdy zmienił się `current` albo to wersja 1),
    mój `last_seen`. Gdy `p_state->>'winner'` nie jest null → `finish_room(…, 'win')`.
  - `claim_timeout(p_code, p_state, p_expected_version) returns int` – gracz BEZ tury może wysłać stan po
    `endTurn`, gdy `now() - turn_started_at > 5 min 15 s`, a nowy `current` to jego slot.
  - `heartbeat(p_code)` – mój `last_seen = now()`.
  - `claim_walkover(p_code) returns boolean` – gdy `last_seen` przeciwnika starszy niż 2 min →
    `finish_room(…, mój slot, 'walkover')`.
  - `surrender(p_code)` – `finish_room(…, slot przeciwnika, 'surrender')`.
  - `finish_room(p_code, p_winner_slot, p_reason)` (wewnętrzna, bez `grant`) – tylko gdy `status = 'playing'`:
    `status = 'finished'`, `winner_slot`, `end_reason`; zwycięzca `rating + 2`, `wins + 1`; przegrany
    `greatest(0, rating - 1)`, `losses + 1`.

#### 2. Automatyczny test bazy
**File**: `tests/online-sql-test.js` (nowy; uruchamiany ręcznie: `node tests/online-sql-test.js`)
**Intent**: Sprawdza funkcje bazy na prawdziwym Supabase, udając dwóch anonimowych graczy (REST: `POST
/auth/v1/signup` bez e-maila → token; `POST /rest/v1/rpc/<funkcja>`). Bez bibliotek – `fetch` z Node.
**Contract**: przypadki – (a) nowy profil ma ranking 10; (b) A i B szukają → ten sam kod pokoju, slot 0 =
niższy ranking; (c) B nie może `submit_state` w turze A; (d) zła `expected_version` → `conflict`;
(e) bezpośredni `insert`/`update` na `rooms` przez REST → odmowa; (f) `surrender` → zwycięzca 12, przegrany 9;
(g) przegrany z rankingiem 0 zostaje na 0 (ustawione przez wielokrotne poddania); (h) `claim_walkover` zaraz
po starcie → `false`.

#### 3. Zasady w „biblii”
**File**: `context/foundation/zasady-gry.md`
**Intent**: Dopisać sekcję „Multiplayer przez internet” z tabelą „Ustalone zasady” (wyżej), zmienić
„Multiplayer – poczekalnia 2–8” na stan faktyczny (na razie 1 na 1 z wyszukiwania).

### Success Criteria:

#### Automated Verification:
- Testy zasad dalej przechodzą: `node tests/run-tests.js`
- Test bazy przechodzi (po uruchomieniu SQL przez TATĘ): `node tests/online-sql-test.js`

#### Manual Verification:
- TATA uruchomił `supabase/02-mecze-i-ranking.sql` w SQL Editor bez błędów
- W Table Editor widać tabele `profiles` i `match_queue`

**Implementation Note**: Uruchomienie SQL wymaga logowania TATY – `/zawolaj-tate` z instrukcją. Po etapie
pauza na potwierdzenie.

---

## Phase 2: Połączenie i szukanie gry

### Overview
Biblioteka Supabase, `network.js`, ekrany MULTIPLAYER i SZUKANIE.

### Changes Required:

#### 1. Strona
**File**: `index.html`
**Intent**: Dołączyć `supabase-js` (UMD, dokładna wersja – sprawdzić `curl -I`, że plik istnieje),
`supabase-config.js`, `network.js`, `online.js` – przed `game.js`.

#### 2. Warstwa sieci
**File**: `network.js` (nowy)
**Intent**: Jedyny plik, który zna Supabase. Wszystkie funkcje `async`, zwracają `{ ok, data, error }`
z polskim `error` dla gracza („Brak połączenia z serwerem gry”).
**Contract**: `connect()` (anonimowe logowanie, jeśli nie ma sesji; sesję trzyma supabase-js w
localStorage), `getMyProfile()`, `findMatch(country)`, `cancelSearch()`, `loadRoom(code)` (pokój + gracze +
mój slot), `submitState(code, state, expectedVersion)` (kolejka po kolei), `claimTimeout(…)`,
`heartbeat(code)`, `claimWalkover(code)`, `surrender(code)`, `watchRoom(code, onRoom, onPlayers)` /
`unwatchRoom()` (Realtime `postgres_changes` z filtrem `code=eq.<kod>` / `room_code=eq.<kod>`).

#### 3. Ekrany online
**File**: `online.js` (nowy), `game.js`
**Intent**: Ekran `multiMenu`: „Twój ranking: 10 (wygrane / przegrane)”, wybór kraju ◀ ▶ (pamiętany
w localStorage), WYSZUKAJ GRĘ, WSTECZ. Ekran `searching`: „Szukam przeciwnika… 0:12”, podpis „±5” → po
30 s „każdy przeciwnik”, ANULUJ; `findMatch` co 2 s. Po znalezieniu – na razie komunikat z kodem pokoju
(gra w etapie 3). Błędy połączenia jako czerwony `message`. MULTIPLAYER w `getTitleButtons` prowadzi do
`multiMenu`; `getButtons`/rysowanie obsługują nowe ekrany.
**Contract**: `currentScreen` dostaje wartości `"multiMenu"`, `"searching"`.

### Success Criteria:

#### Automated Verification:
- Testy zasad przechodzą: `node tests/run-tests.js`
- Składnia nowych plików: `node --check network.js` i `node --check online.js`
- Plik biblioteki istnieje pod przypiętym adresem: `curl -sI <url> | head -1` → 200

#### Manual Verification:
- MULTIPLAYER pokazuje „Twój ranking: 10”
- Zwykłe okno + okno prywatne: obaj klikają WYSZUKAJ GRĘ → oba okna dostają ten sam kod pokoju
- ANULUJ przerywa szukanie; WSTECZ wraca do tytułu
- EDYTOR działa jak wcześniej

---

## Phase 3: Gra na żywo

### Overview
Prawdziwa gra 1 na 1: wspólny stan, ruchy na żywo, blokada cudzej tury, zegar 5:00, koniec gry z rankingiem.

### Changes Required:

#### 1. Start gry online
**File**: `online.js`
**Intent**: Po znalezieniu pokoju: `loadRoom`, `watchRoom`; slot 0 tworzy stan (patrz Critical Details);
`board` liczony jak w `startGame` (`game.js:519`) – wydzielić to liczenie do wspólnej funkcji.
**Contract**: obiekt `online = { code, mySlot, version, opponentSlot, … }` albo `null` (tryb EDYTOR).

#### 2. Haczyki w grze
**File**: `game.js`
**Intent**: (a) gdy `online` i `game.current !== online.mySlot` – kliknięcia tylko zaznaczają/pokazują
statystyki; przyciski zmieniające stan (budowle, menu budynku, NASTĘPNA ERA, KONIEC TURY) ukryte;
(b) po każdej z 6 zmian stanu wywołać `afterAction()` (online → `submitState`; EDYTOR → nic);
(c) przyjście nowego stanu z bazy podmienia `game`, zachowuje zaznaczenie, jeśli id dalej istnieje,
odświeża `refreshReachable`, pokazuje baner przy zmianie tury („TWOJA TURA” / „TURA: <kraj>”).
**Contract**: `afterAction()`, `applyRemoteState(state, version)`.

#### 3. Zegar tury i koniec gry
**File**: `online.js`, `game.js`
**Intent**: Zegar 5:00 liczony od `turn_started_at` (z bazy), widoczny w panelu. U gracza z turą przy 0:00
→ `finishTurn()`. U czekającego po 5:15 → `endTurn` na kopii stanu i `claimTimeout`. Pokój `finished` →
ekran zwycięstwa online: kto wygrał, powód (wygrana / walkower / poddanie), zmiana rankingu „+2” / „−1”,
przyciski SZUKAJ ZNOWU i MENU.

### Success Criteria:

#### Automated Verification:
- Testy zasad przechodzą: `node tests/run-tests.js`
- Test bazy przechodzi: `node tests/online-sql-test.js`
- Składnia: `node --check game.js online.js network.js`

#### Manual Verification:
- Dwa okna: ruch jednego gracza od razu widać u drugiego
- Gracz bez tury nie może nic zbudować ani ruszyć, ale widzi statystyki klikniętej jednostki
- Zaczyna gracz z niższym rankingiem (sprawdzić po jednej rozegranej grze)
- Zegar dochodzi do 0:00 → tura przechodzi sama
- Zniszczenie ratusza przeciwnika → obaj widzą ekran zwycięstwa, ranking +2 / −1

---

## Phase 4: Rozłączenia i poddanie się

### Overview
Bicie serca, odliczanie 2:00, walkower, PODDAJ SIĘ, powrót do gry po ponownym otwarciu strony.

### Changes Required:

#### 1. Bicie serca i walkower
**File**: `online.js`
**Intent**: `heartbeat` co 10 s. Gdy `last_seen` przeciwnika (z Realtime `room_players`) jest starszy niż
20 s → napis „Przeciwnik się rozłączył – czekamy 1:43” (liczone do 2:00 od jego `last_seen`); przy 0:00 →
`claimWalkover`. Po powrocie przeciwnika napis znika.

#### 2. PODDAJ SIĘ
**File**: `game.js`
**Intent**: W trybie online przycisk MENU w panelu to PODDAJ SIĘ; pierwsze kliknięcie zmienia go na
„NA PEWNO?”, drugie → `surrender`.

#### 3. Powrót do gry
**File**: `online.js`, `game.js`
**Intent**: Po otwarciu strony: jeśli jest zapisana sesja, cicho sprawdź (`findMatch` zwraca kod gry
`playing` bez dopisywania do kolejki – albo osobna lekka ścieżka w `loadRoom`) i wróć prosto do gry.
Brak sesji / brak gry → zwykły ekran tytułowy.

### Success Criteria:

#### Automated Verification:
- Testy zasad przechodzą: `node tests/run-tests.js`
- Test bazy przechodzi: `node tests/online-sql-test.js`

#### Manual Verification:
- Zamknięcie okna gracza B → u A odliczanie; po 2:00 A wygrywa walkowerem (+2 / −1)
- Zamknięcie i ponowne otwarcie okna B przed upływem 2:00 → B wraca do tej samej gry, odliczanie u A znika
- PODDAJ SIĘ → NA PEWNO? → przeciwnik wygrywa

---

## Phase 5: Ochrona przed botami (captcha) – z TATĄ

### Overview
Zalecenie Supabase przy grze z obcymi: Cloudflare Turnstile przy anonimowym logowaniu.

### Changes Required:

#### 1. Konfiguracja (TATA)
**Intent**: TATA zakłada widżet Turnstile na swoim koncie Cloudflare (domeny: `tomskiplus.github.io`,
`127.0.0.1`, `localhost`), wpisuje **Secret key** w Supabase → Authentication → Attack Protection
(sam, nie do czatu), a **Site key** (publiczny) podaje w czacie. Zgoda TATY na skrypt
`challenges.cloudflare.com`.

#### 2. Kod
**File**: `index.html`, `supabase-config.js`, `network.js`, `online.js`
**Intent**: `TURNSTILE_SITE_KEY` w configu; przy pierwszym logowaniu (brak sesji) ekran „Sprawdzam, czy
jesteś człowiekiem” z widżetem; token → `signInAnonymously({ options: { captchaToken } })`. Gracz z
zapisaną sesją nie widzi captchy.

### Success Criteria:

#### Automated Verification:
- Testy zasad przechodzą: `node tests/run-tests.js`
- Składnia: `node --check network.js online.js`

#### Manual Verification:
- Nowe okno prywatne → widżet captchy → po przejściu „Twój ranking: 10”
- Drugie wejście w tej samej przeglądarce → bez captchy
- Wyszukiwanie i gra dalej działają

**Implementation Note**: Captchę w Supabase włączyć dopiero, gdy kod etapu jest gotowy – inaczej
logowanie przestanie działać. Od tej chwili `tests/online-sql-test.js` nie zaloguje się (opisać w pliku).

---

## Testing Strategy

### Unit Tests:
- `tests/run-tests.js` – bez zmian; pilnuje, że zasady gry się nie zepsuły.

### Integration Tests:
- `tests/online-sql-test.js` – funkcje bazy na prawdziwym Supabase (dobieranie, tura, wersja, ranking,
  podłoga 0, brak bezpośredniego zapisu, walkower za wcześnie).

### Manual Testing Steps:
1. Zwykłe okno + okno prywatne (= dwóch różnych anonimowych graczy).
2. Obaj WYSZUKAJ GRĘ z różnymi krajami → ta sama gra, zaczyna niższy ranking.
3. Kilka ruchów każdego – widoczne na żywo; próba klikania w cudzej turze nic nie zmienia.
4. Zegar do 0:00 → zmiana tury.
5. Zamknięcie okna → odliczanie 2:00 → walkower; osobno: powrót przed czasem.
6. PODDAJ SIĘ; sprawdzić ranking w MULTIPLAYER (+2 / −1, nie poniżej 0).
7. EDYTOR – zwykła gra na jednym komputerze bez zmian.

## Performance Considerations
Stan MAŁEJ planszy to kilkadziesiąt KB JSON. Zapis po każdej akcji + bicie serca co 10 s na gracza – daleko
w limitach planu Free. Projekt usypia po ~7 dniach bez gry – wtedy „Brak połączenia z serwerem gry” i TATA
klika Restore.

## Migration Notes
`supabase/02-mecze-i-ranking.sql` uruchamia TATA raz (SQL Editor). Pisany tak, żeby powtórne uruchomienie nie
psuło bazy (`if not exists`, `create or replace`, `drop policy if exists`).

## References
- Zasady gry: `context/foundation/zasady-gry.md`
- Baza: `supabase/schema.sql`, dane połączenia: `supabase-config.js`
- Notatki: `context/foundation/do-zrobienia.md` (captcha przy grze z obcymi, uczciwy ranking później)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Baza – mecze i ranking

#### Automated

- [x] 1.1 Testy zasad dalej przechodzą: `node tests/run-tests.js` — 8b0d4f3
- [x] 1.2 Test bazy przechodzi (po uruchomieniu SQL przez TATĘ): `node tests/online-sql-test.js` — 8b0d4f3

#### Manual

- [x] 1.3 TATA uruchomił `supabase/02-mecze-i-ranking.sql` w SQL Editor bez błędów — 8b0d4f3
- [x] 1.4 W Table Editor widać tabele `profiles` i `match_queue` — 8b0d4f3

### Phase 2: Połączenie i szukanie gry

#### Automated

- [x] 2.1 Testy zasad przechodzą: `node tests/run-tests.js` — f61db41
- [x] 2.2 Składnia nowych plików: `node --check network.js` i `node --check online.js` — f61db41
- [x] 2.3 Plik biblioteki istnieje pod przypiętym adresem: `curl -sI <url> | head -1` → 200 — f61db41

#### Manual

- [x] 2.4 MULTIPLAYER pokazuje „Twój ranking: 10” — f61db41
- [x] 2.5 Zwykłe okno + okno prywatne: obaj klikają WYSZUKAJ GRĘ → oba okna dostają ten sam kod pokoju — f61db41
- [x] 2.6 ANULUJ przerywa szukanie; WSTECZ wraca do tytułu — f61db41
- [x] 2.7 EDYTOR działa jak wcześniej — f61db41

### Phase 3: Gra na żywo

#### Automated

- [x] 3.1 Testy zasad przechodzą: `node tests/run-tests.js` — 40af63b
- [x] 3.2 Test bazy przechodzi: `node tests/online-sql-test.js` — 40af63b
- [x] 3.3 Składnia: `node --check game.js online.js network.js` — 40af63b

#### Manual

- [x] 3.4 Dwa okna: ruch jednego gracza od razu widać u drugiego — 40af63b
- [x] 3.5 Gracz bez tury nie może nic zbudować ani ruszyć, ale widzi statystyki klikniętej jednostki — 40af63b
- [x] 3.6 Zaczyna gracz z niższym rankingiem (sprawdzić po jednej rozegranej grze) — 40af63b
- [x] 3.7 Zegar dochodzi do 0:00 → tura przechodzi sama — 40af63b
- [x] 3.8 Zniszczenie ratusza przeciwnika → obaj widzą ekran zwycięstwa, ranking +2 / −1 — 40af63b

### Phase 4: Rozłączenia i poddanie się

#### Automated

- [x] 4.1 Testy zasad przechodzą: `node tests/run-tests.js` — ce58591
- [x] 4.2 Test bazy przechodzi: `node tests/online-sql-test.js` — ce58591

#### Manual

- [x] 4.3 Zamknięcie okna gracza B → u A odliczanie; po 2:00 A wygrywa walkowerem (+2 / −1) — ce58591 (sprawdził robot: 2 przeglądarki, 21 ✅; ręcznie nie)
- [x] 4.4 Zamknięcie i ponowne otwarcie okna B przed upływem 2:00 → B wraca do tej samej gry, odliczanie u A znika — ce58591 (sprawdził robot: 2 przeglądarki, 21 ✅; ręcznie nie)
- [x] 4.5 PODDAJ SIĘ → NA PEWNO? → przeciwnik wygrywa — ce58591 (sprawdził robot: 2 przeglądarki, 21 ✅; ręcznie nie)

### Phase 5: Ochrona przed botami (captcha) – z TATĄ

#### Automated

- [x] 5.1 Testy zasad przechodzą: `node tests/run-tests.js` — 3038f35
- [x] 5.2 Składnia: `node --check network.js online.js` — 3038f35

#### Manual

- [x] 5.3 Nowe okno prywatne → widżet captchy → po przejściu „Twój ranking: 10” — 3038f35
- [x] 5.4 Drugie wejście w tej samej przeglądarce → bez captchy — 3038f35
- [x] 5.5 Wyszukiwanie i gra dalej działają — 3038f35
