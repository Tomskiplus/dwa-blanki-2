# Tryb 1 VS BOT – plan implementacji

## Overview

Ożywiamy przycisk **1 VS BOT** w menu SINGLEPLAYER: gracz gra przeciwko jednemu prostemu botowi.
Bot gra uczciwie – używa tylko funkcji z `rules.js` (tych samych, co gracz). Ma dwa tryby wybierane
przed grą: **ofensywny** (zbiera 4 wojaków i atakuje) i **defensywny** (broni bazy, walczy, gdy wróg
podejdzie). Turę bota widać krok po kroku (jedna akcja co 0,5 s).

## Current State Analysis

- Przycisk „1 VS BOT” istnieje, ale pokazuje tylko „Gra z botem - wkrótce!” (`game.js:291-292`).
- Wszystkie zasady są w `rules.js` i zwracają `{ ok, reason }` – bot może z nich korzystać bez zmian:
  `placeBuilding`, `placeUnit`, `canPlaceBuilding`, `canPlaceUnit`, `getSquadOfUnit`,
  `getReachableMoves`, `moveSquad`, `getAttackTargets`, `attack`, `endTurn`, `distance`.
- Tryb online ma już „turę przeciwnika”: `isMyTurn()` (`game.js:566`) blokuje przyciski
  (`game.js:350`), ramkę (`game.js:1740`) i kliknięcia planszy (`game.js:828` → `inspectObjectAt`),
  a panel pokazuje `drawOpponentTurnPanel` (`online.js:495`). Bot może użyć tych samych „haczyków”.
- Tajne kody (`useCheatCode`, `rules.js:373`) działają dla gracza, który **ma teraz turę**.
  Blokuje je tylko `online` (`chat.js:164`).
- Testy: `node tests/run-tests.js` wczytuje `data.js`, `rules.js`, `chat-filter.js` przez `vm` (261 sprawdzeń).
- W erze 1 da się budować: koszary (9 pól, z bonusem 8+1), dom, palisadę, bramę drewnianą.
  Koszary robią piechura (koszt 2, 3 życia) i włócznika (koszt 1, 2 życia).

## Desired End State

- SINGLEPLAYER → **1 VS BOT** otwiera ekran ustawień: kraj gracza, kraj bota, tryb bota
  (OFENSYWNY / DEFENSYWNY), rozmiar planszy, START, WSTECZ.
- Gracz jest zawsze graczem 0 (lewy górny róg) i zaczyna; bot jest graczem 1.
- W turze bota gracz tylko patrzy (może klikać obiekty, żeby zobaczyć statystyki, i wyjść przez MENU).
  Bot wykonuje jedną akcję co 0,5 s, a potem kończy turę; gracz widzi baner „TWOJA TURA”.
- Tajne kody jednostek nie działają w grze z botem.
- Koniec gry: „WYGRAŁEŚ!” albo „BOT WYGRAŁ”, przycisk NOWA GRA wraca do ustawień 1 VS BOT.
- Weryfikacja: testy w node (w tym mecze bot kontra bot) + ręczna gra w Live Preview.

### Key Discoveries:

- `getSquadOfUnit` + `getReachableMoves` liczą ruch pojedynczej jednostki, gdy nie ma oddziałów z ramki (`rules.js:542`, `rules.js:607`).
- `moveSquad` zabiera punkty budowy za kroki ponad darmowe (`rules.js:651`) – bot wybiera tylko ruchy z kosztem ≤ `minFree`.
- `findSpotNear` (`rules.js:398`) pokazuje wzór szukania wolnego miejsca po całej planszy.
- Gracz odpada, gdy nie ma żadnej jednostki (`rules.js:766`) – chłopi bota zostają w domu.
- `startGame` (`game.js:539`) i `getVictoryButtons` (`game.js:459`) są pisane pod EDYTOR.

## What We're NOT Doing

- Bot nie przechodzi do następnych er, nie kupuje ulepszeń ani badań, nie stawia murów, wież, domów.
- Bot nie robi oddziałów ramką – każda jednostka chodzi sama.
- Bot nie wydaje punktów budowy na ruch (tylko darmowe kroki).
- Bez poziomów trudności (poza dwoma trybami), bez kilku botów, bez losowania – bot jest przewidywalny (łatwo testować).
- Bez tajnych kodów jednostek w grze z botem (ani dla gracza, ani dla bota). Kody tła (designs.js) zostają – to tylko wygląd.
- Bez zapisywania gry z botem i bez trybu online z botem.

## Implementation Approach

Mózg bota w osobnym pliku `bot.js` – tak jak `rules.js`: **nic nie rysuje**, tylko liczy. Dzięki temu
da się go testować w node. Bot działa „po kroczku”: `getBotStep` patrzy na stan gry i zwraca **jedną**
następną akcję, a `doBotStep` ją wykonuje przez funkcje z `rules.js`. `game.js` woła je co 0,5 s,
więc turę bota widać. Testy wołają je w pętli (bez czekania).

Kolejność akcji w turze bota (każda to osobny krok):
1. **Atak** – każda jednostka/budowla bota, która ma cel w zasięgu, bije **najsłabszy** cel
   (najmniej życia; remis → jednostka przed budynkiem, potem bliższy).
2. **Ruch** – jednostki wojska (nie chłopi, nie nowe) idą zgodnie z trybem (patrz niżej),
   wybierając pole najbliżej celu spośród ruchów za darmowe kroki. Po ruchu jednostka może jeszcze zaatakować (wraca krok 1).
3. **Budowa** – brak koszar → stawia koszary obok swojego chłopa.
4. **Rekrutacja** – w koszarach: piechur, gdy są ≥ 2 punkty; włócznik za ostatni 1 punkt.
5. **Koniec tury**.

Tryby ruchu:
- **Ofensywny**: gdy bot ma ≥ `BOT_ARMY_TO_ATTACK` (4) wojaków (nie-chłopów) – wszyscy idą do najbliższego
  obiektu wroga. Gdy mniej – stoją przy bazie (nie ruszają się). Zasada bez pamięci: jeśli armia spadnie
  poniżej 4, ocaleli przestają iść naprzód (czekają na posiłki).
- **Defensywny**: jednostka wroga bliżej niż `BOT_DEFEND_RADIUS` (6) od któregoś budynku bota = intruz.
  Wojsko idzie do najbliższego intruza. Brak intruzów → stoi.

## Critical Implementation Details

- **Bezpiecznik**: `game.js` (i testy) kończą turę bota na siłę po `BOT_MAX_STEPS` (60) krokach – gdyby
  bot „zapętlił się” (np. akcja ciągle się nie udaje), gra nie stanie w miejscu.
  `getBotStep` nie może zwrócić akcji, która się nie uda (każdą sprawdza `can...` przed zwróceniem).
- **Tajne kody w turze bota**: `useCheatCode` daje jednostkę graczowi, który ma turę – w turze bota
  dostałby ją bot. Blokujemy kody jednostek w całym trybie bota (w `chat.js`, obok blokady `online`).
- **Zegar kroków**: krok bota robimy tylko, gdy `currentScreen === "game"`, jest tryb bota, `game.current`
  to bot, nikt nie wygrał i nie widać banera. Wyjście do MENU w trakcie tury bota musi zatrzymać bota
  (zegar sprawdza warunki przy każdym kroku). Start EDYTORA zeruje tryb bota.

## Phase 1: Mózg bota (bot.js) + testy

### Overview

Cała logika bota w nowym pliku, sprawdzona testami w node – jeszcze bez ekranów.

### Changes Required:

#### 1. Nowy plik `bot.js`

**File**: `bot.js`

**Intent**: Mózg bota – wybiera następną akcję i ją wykonuje, korzystając tylko z `rules.js`. Krótkie funkcje z polskimi komentarzami.

**Contract**:
- Stałe (skrzynie do zmieniania): `BOT_ARMY_TO_ATTACK = 4`, `BOT_DEFEND_RADIUS = 6`, `BOT_MAX_STEPS = 60`.
- `getBotStep(game, mode)` → jedna akcja albo `{ type: "endTurn" }`. `mode` = `"offensive"` albo `"defensive"`. Bot to zawsze `game.current`. Rodzaje akcji:
  - `{ type: "attack", attackerId, targetId }`
  - `{ type: "move", unitId, dx, dy }`
  - `{ type: "build", key: "koszary", cells, rotation }`
  - `{ type: "recruit", key, buildingId, cells, rotation }`
  - `{ type: "endTurn" }`
- `doBotStep(game, step)` → wynik z `rules.js` (`{ ok, reason, ... }`); dla `endTurn` woła `endTurn(game)`.
- Pomocnicze (nazwy przykładowe): `pickWeakestTarget(game, attacker)`, `getBotArmy(game)`,
  `getMoveGoal(game, unit, mode)`, `findBestMove(game, unit, goalCells)`, `findBuildingSpot(game, key, towardCells)`,
  `findUnitSpot(game, unitKey, building, towardCells)`.
- Szukanie miejsca: sprawdza kratki wokół chłopów/koszar we wszystkich 4 obrotach przez `canPlaceBuilding` / `canPlaceUnit`; wybiera miejsce najbliżej wroga (jego ratusza albo najbliższego obiektu). Brak miejsca → pomija tę akcję.
- Ruch: tylko pola z kosztem ≤ `minFree` (darmowe kroki), i tylko gdy zbliża do celu (mniejszy `distance`). Każda jednostka rusza się najwyżej raz na turę (żeby bot nie „tańczył”) – można to sprawdzić tak, że ruch musi realnie zmniejszyć odległość, a darmowe kroki się kończą.
- Jednostka, która już się ruszyła i nie ma celu w zasięgu, nie wraca do kolejki ruchu.

#### 2. Testy bota

**File**: `tests/run-tests.js`

**Intent**: Wczytać `bot.js` (po `rules.js`) i dodać sekcję „BOT” z testami.

**Contract**: Pomocnik w teście `playBotTurn(game, mode)` – woła `getBotStep`/`doBotStep` w pętli do `endTurn` (najwyżej `BOT_MAX_STEPS`), zapisuje, czy każdy krok miał `ok: true`. Testy:
- W 1. turze bot stawia koszary obok swojego chłopa i wszystkie jego kroki są `ok`.
- W 2. turze bot robi wojsko za 8 punktów (np. 4 piechurów; włócznik na ostatni 1 punkt).
- Najsłabszy cel: z dwóch wrogów w zasięgu wybiera ten z mniejszym życiem; przy równym życiu jednostkę zamiast budynku.
- Ofensywny z 3 wojakami stoi; z 4 – każdy wojak jest bliżej wroga niż przed turą.
- Defensywny: wróg daleko → wojsko stoi; wróg 3 pola od koszar bota → wojsko idzie do niego / atakuje.
- Bot nie wydaje punktów budowy na ruch (punkty po ruchu = punkty przed ruchem).
- Chłopi bota się nie ruszają.
- Mecz bot ofensywny kontra bot defensywny na małej planszy przez 150 tur: brak błędów, każdy krok `ok`, żadna tura nie dobija do `BOT_MAX_STEPS`.
- Bot ofensywny kontra gracz, który nic nie robi (tylko kończy turę): bot wygrywa w ≤ 40 turach.

### Success Criteria:

#### Automated Verification:

- Wszystkie testy przechodzą (stare i nowe): `node tests/run-tests.js`
- Mecz bot kontra bot (150 tur) kończy się bez błędu i bez przekroczenia `BOT_MAX_STEPS`

#### Manual Verification:

- Tomek czyta `bot.js` i rozumie główne kroki tury bota (komentarze po polsku)

**Implementation Note**: Po fazie i zielonych testach – pauza na ręczne sprawdzenie, commit `/zapisz-postep`.

---

## Phase 2: Ekran 1 VS BOT i tura bota w grze

### Overview

Podłączamy mózg bota do gry: ekran ustawień, start gry, tura bota krok po kroku, blokady w turze bota.

### Changes Required:

#### 1. Plik bota w stronie

**File**: `index.html`

**Intent**: Dodać `<script src="bot.js">` po `rules.js` (przed `game.js`).

**Contract**: kolejność skryptów: data → rules → bot → … → game.

#### 2. Ustawienia i ekran „botSetup”

**File**: `game.js`

**Intent**: Nowy ekran ustawień gry z botem; przycisk „1 VS BOT” na niego prowadzi.

**Contract**:
- Nowy stan `botSetup = { countries: [0, 8], mode: "offensive", sizeKey: "mala" }` (osobny od `setup` EDYTORA).
- Nowy ekran `"botSetup"`: tytuł „1 VS BOT”, wiersze „Ty” i „Bot” z ◀ kraj ▶ (wzór jak w EDYTORZE), przyciski OFENSYWNY / DEFENSYWNY (`selected`), 3 rozmiary planszy, START, WSTECZ (→ `singleMenu`). Dopisać do `getButtons()` i `gameLoop()`.
- Pod przyciskami trybu krótki opis: „Zbiera 4 wojaków i atakuje” / „Broni bazy, walczy, gdy podejdziesz”.

#### 3. Stan „gra z botem” i start

**File**: `game.js`

**Intent**: Zmienna `vsBot` (null w EDYTORZE/online), ustawiana przy starcie gry z botem.

**Contract**:
- `let vsBot = null;` → w grze z botem `{ humanSlot: 0, botSlot: 1, mode }`.
- `startBotGame()`: jak `startGame`, ale `createGame(2, botSetup.sizeKey, botSetup.countries)` i ustawia `vsBot`. `startGame()` (EDYTOR) ustawia `vsBot = null`.
- `isMyTurn()`: w trybie bota → `game.current === vsBot.humanSlot`.

#### 4. Tura bota krok po kroku

**File**: `game.js`

**Intent**: Co `BOT_STEP_MS` (500) wykonać jeden krok bota, gdy jest jego tura.

**Contract**:
- Stała `BOT_STEP_MS = 500` na górze `game.js`.
- Funkcja `runBotStep()` wołana z `gameLoop()` (sprawdza czas od ostatniego kroku przez `Date.now()`); warunki z „Critical Implementation Details”. Licznik kroków w turze; po `BOT_MAX_STEPS` – wymuszony koniec tury.
- Po ataku bota: `refreshReachable` niepotrzebne; gdy `game.winner !== null` → ekran końca.
- Po `endTurn` bota: `clearSelection()`, `showTurnBanner = true` (baner „TWOJA TURA”).
- Po KONIEC TURY gracza: **bez** banera (od razu widać, jak gra bot) – `finishTurn` ustawia `showTurnBanner = false` w trybie bota. `goToNextEra` – tak samo.

#### 5. Baner, panel, kody

**Files**: `game.js`, `online.js`, `chat.js`

**Intent**: Napisy dopasowane do gry z botem i blokada kodów.

**Contract**:
- `drawTurnBanner`: w trybie bota tytuł „TWOJA TURA (kraj)”.
- `drawOpponentTurnPanel`: w trybie bota nagłówek „Tura bota” zamiast „Tura przeciwnika”.
- Przycisk MENU działa w turze bota (wyjście zatrzymuje bota, bo `currentScreen` przestaje być `"game"`).
- `handleCheatCode` (`chat.js`): w trybie bota kody jednostek nie działają – komunikat „Kody działają tylko w edytorze.” (kody tła dalej działają).

### Success Criteria:

#### Automated Verification:

- Testy dalej przechodzą: `node tests/run-tests.js`
- Brak błędów w konsoli przeglądarki przy starcie gry z botem (sprawdzić w Live Preview / DevTools)

#### Manual Verification:

- SINGLEPLAYER → 1 VS BOT → ekran ustawień: zmiana krajów, trybu i planszy działa; WSTECZ wraca
- START: gracz zaczyna w lewym górnym rogu, widzi baner swojej tury
- Po KONIEC TURY bot co 0,5 s robi akcje (koszary w 1. turze), potem baner „TWOJA TURA”
- W turze bota przyciski budowy są ukryte, kliknięcie obiektu pokazuje statystyki, MENU wychodzi z gry
- Ofensywny bot po zebraniu 4 wojaków idzie w stronę gracza; defensywny stoi, dopóki gracz nie podejdzie
- Tajny kod (np. `ILLfroggy`) w grze z botem nie działa
- EDYTOR po grze z botem działa jak dawniej (brak bota)

**Implementation Note**: Pauza na ręczne sprawdzenie w Live Preview, commit `/zapisz-postep`.

---

## Phase 3: Szlif – widać, co robi bot, i ekran końca

### Overview

Żeby turę bota było łatwo śledzić, i żeby koniec gry mówił, kto wygrał: ty czy bot.

### Changes Required:

#### 1. Co bot właśnie zrobił

**File**: `game.js` (+ ewentualnie `bot.js` – opis akcji)

**Intent**: Po każdym kroku bota podświetlić obiekt, który działał, i pokazać krótki napis w panelu.

**Contract**:
- `botLastObjectId` – obiekt bota z ostatniego kroku (nowy budynek/jednostka, ruszona lub atakująca jednostka); rysowany z grubszą kolorową ramką w turze bota.
- Napis w panelu (`attackInfo` albo osobna zmienna), np. „Bot stawia: Koszary”, „Bot robi: Piechur”, „Bot: Piechur → Trafienie! Chłop zniszczony!”. Funkcja opisująca akcję może być w `bot.js` (`describeBotStep(game, step, result)`), żeby dało się ją przetestować.

#### 2. Ekran końca gry z botem

**File**: `game.js`

**Intent**: W trybie bota zamiast „Wygrywa gracz X”: „WYGRAŁEŚ!” albo „BOT WYGRAŁ” (okienko w kolorze zwycięzcy). NOWA GRA → ekran `botSetup`, MENU → tytuł.

**Contract**: `drawVictoryScreen` i `getVictoryButtons` sprawdzają `vsBot`.

#### 3. Dokumentacja

**Files**: `README.md`, `context/foundation/do-zrobienia.md`

**Intent**: README – sekcja „Gra z botem” (tryby, kto zaczyna, kody wyłączone). `do-zrobienia.md` – „Gra z botem (1 vs bot)” oznaczona jako zrobiona + pomysły na później (era/ulepszenia dla bota, poziomy trudności).

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `node tests/run-tests.js` (w tym test opisu akcji bota, jeśli `describeBotStep` jest w `bot.js`)

#### Manual Verification:

- W turze bota widać podświetlenie jednostki/budynku, który właśnie działał, i napis w panelu
- Wygrana gracza → „WYGRAŁEŚ!”, wygrana bota → „BOT WYGRAŁ”; NOWA GRA wraca do ustawień 1 VS BOT
- README opisuje grę z botem

**Implementation Note**: Pauza na ręczne sprawdzenie, commit `/zapisz-postep`.

---

## Testing Strategy

### Unit Tests:

- Wybór celu (najsłabszy, remis → jednostka), szukanie miejsca na koszary i jednostki, rekrutacja za 8 punktów.
- Tryby: ofensywny (próg 4 wojaków), defensywny (promień 6).
- Uczciwość: każdy krok `ok`, brak wydawania punktów na ruch, chłopi stoją.

### Integration Tests:

- Mecz bot kontra bot (150 tur) bez błędów i bez bezpiecznika.
- Bot ofensywny wygrywa z graczem, który nic nie robi, w ≤ 40 turach.

### Manual Testing Steps:

1. 1 VS BOT, mała plansza, tryb ofensywny – zagrać ~6 tur, zobaczyć atak 4 wojaków.
2. Tryb defensywny – podejść piechurem do bazy bota, zobaczyć obronę.
3. W turze bota kliknąć MENU – bot przestaje grać, menu działa.
4. Wpisać tajny kod w grze z botem – nie działa.
5. Wygrać i przegrać – sprawdzić napisy końca gry.

## Performance Considerations

`getReachableMoves` i szukanie miejsc sprawdzają sporo kratek, ale bot robi to raz na krok (co 0,5 s) dla
kilku jednostek – na dużej planszy (36×27) to wciąż ułamek sekundy. Nie liczymy niczego co klatkę.

## References

- Zasady: `rules.js` (budowa 230–353, ruch 542–662, walka 684–776)
- Haczyki trybu online do ponownego użycia: `game.js:566` (`isMyTurn`), `online.js:489-513`
- Blokada kodów: `chat.js:159-185`
- Lista pomysłów: `context/foundation/do-zrobienia.md` („Gra z botem (1 vs bot)”)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Mózg bota (bot.js) + testy

#### Automated

- [x] 1.1 Wszystkie testy przechodzą (stare i nowe): `node tests/run-tests.js`
- [x] 1.2 Mecz bot kontra bot (150 tur) kończy się bez błędu i bez przekroczenia `BOT_MAX_STEPS`

#### Manual

- [x] 1.3 Tomek czyta `bot.js` i rozumie główne kroki tury bota (komentarze po polsku)

### Phase 2: Ekran 1 VS BOT i tura bota w grze

#### Automated

- [ ] 2.1 Testy dalej przechodzą: `node tests/run-tests.js`
- [ ] 2.2 Brak błędów w konsoli przeglądarki przy starcie gry z botem

#### Manual

- [ ] 2.3 Ekran ustawień 1 VS BOT: kraje, tryb, plansza, WSTECZ działają
- [ ] 2.4 START: gracz zaczyna w lewym górnym rogu, widzi baner swojej tury
- [ ] 2.5 Bot co 0,5 s robi akcje (koszary w 1. turze), potem baner „TWOJA TURA”
- [ ] 2.6 W turze bota: brak przycisków budowy, statystyki po kliknięciu, MENU wychodzi
- [ ] 2.7 Ofensywny atakuje po 4 wojakach; defensywny czeka, aż gracz podejdzie
- [ ] 2.8 Tajny kod w grze z botem nie działa
- [ ] 2.9 EDYTOR po grze z botem działa jak dawniej

### Phase 3: Szlif – widać, co robi bot, i ekran końca

#### Automated

- [ ] 3.1 Testy przechodzą: `node tests/run-tests.js`

#### Manual

- [ ] 3.2 W turze bota widać podświetlenie i napis o ostatniej akcji
- [ ] 3.3 „WYGRAŁEŚ!” / „BOT WYGRAŁ”; NOWA GRA wraca do ustawień 1 VS BOT
- [ ] 3.4 README opisuje grę z botem
