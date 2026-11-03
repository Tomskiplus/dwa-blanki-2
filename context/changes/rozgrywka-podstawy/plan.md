# Podstawy rozgrywki – plan implementacji

## Overview

Zamieniamy ekran tytułowy w grywalną wersję DWA BLANKI II na jednym komputerze (hot-seat):
menu Singleplayer → Edytor (2–8 graczy, rozmiar planszy) → plansza w kratkę, tury,
budowanie, rekrutacja, ruch oddziałów, walka i ekran zwycięzcy.
Zasady gry: `context/foundation/zasady-gry.md` (źródło prawdy).

## Current State Analysis

- `game.js` (248 linii) rysuje tylko ekran tytułowy: tło w kratkę (`drawPaper`), ozdobne kształty,
  tytuł i 2 przyciski. Kliknięcie przycisku ustawia `message = "... wkrótce!"` (`game.js:221-228`).
- Przyciski to obiekty `{label, x, y, w, h}` + `isInside()` + `drawButton()` (`game.js:21-24`, `164-184`).
  Ten wzorzec rozszerzamy na wszystkie menu.
- Pętla `gameLoop()` z `requestAnimationFrame` rysuje wszystko od nowa (`game.js:234-246`).
- `getMousePos()` przelicza pozycję myszki przy zmniejszonym canvasie (`game.js:202-208`) – używamy dalej.
- Canvas 800×600 (`index.html:12`). Brak testów, brak innych plików JS.
- Stack: czysty HTML/CSS/JS, bez npm. Node jest zainstalowany (do uruchamiania testów).

## Desired End State

1. Tytuł → **SINGLEPLAYER** → menu: „1 vs BOT” (wkrótce), „EDYTOR”, „WSTECZ”. **MULTIPLAYER** → „wkrótce”.
2. **EDYTOR** → ustawienia: liczba graczy 2–8, rozmiar planszy (Mała 20×15 / Średnia 28×21 / Duża 36×27), START.
3. Plansza: każdy gracz w swoim kolorze ma ratusz 2×2 i 2 chłopów.
4. Tura: 8 punktów budowy (+1 bonus tylko na koszary), budowanie obok chłopa, rekrutacja obok budynku
   (tylko jednostki z ery gracza – na razie era 1), obrót R, Esc anuluje.
5. Ruch: oddział (jednostki stykające się bokiem/rogiem) rusza się razem; pula = 5 + niewydane punkty budowy;
   krok po skosie = 1.
6. Walka: każda jednostka raz na turę, zasięg po skosie, bonus przeciw kawalerii, budynki mają 2 HP za kratkę.
7. Gracz bez jednostek odpada; ostatni gracz wygrywa → ekran zwycięzcy → powrót do menu.
8. `node tests/run-tests.js` – wszystkie testy zasad przechodzą.

### Key Discoveries:

- Wzorzec przycisku (`game.js:21-24`, `164-184`) – rozszerzamy o ekrany, zamiast pisać nowy system.
- Ekran tytułowy już ma tło-kartkę i ozdoby – zostają bez zmian, tylko trafiają do „ekranu tytułowego”.
- Koszary 3×3 = 9 kratek > 8 punktów → zasada „+1 na koszary” = bonus używalny tylko do koszar.

## What We're NOT Doing

- Przechodzenie do kolejnych er (dane jednostek mają pole `era`, ale gra na razie zawsze w erze 1).
- Ulepszenia (m.in. chłop 3/1/1), zamek i budowa w 2 turach, mury/wieże/bramy, budowle specjalne, woda.
- Bot, multiplayer przez internet, poczekalnia online.
- Prawdziwy edytor map (na razie „Edytor” = ustawienia + gra na jednym komputerze).
- Dzielenie oddziału (jednostka nie może odejść od oddziału, z którym się styka).
- Budowa drugiego ratusza.
- Zapisywanie gry, dźwięk, animacje ruchu.

## Implementation Approach

Trzy warstwy w osobnych plikach (jak osobne skrzynie w Minecrafcie):

- `data.js` – **dane**: typy budynków i jednostek (kształt, życie, atak, zasięg, era, kto produkuje),
  kolory graczy, rozmiary planszy. Tomek może tu sam zmieniać liczby.
- `rules.js` – **zasady**: czyste funkcje bez rysowania (sprawdzanie miejsca, oddziały, ruch, atak, tury).
  Dzięki temu da się je testować w Node.
- `game.js` – **ekrany, rysowanie i myszka**: zamienia kliknięcia na wywołania funkcji z `rules.js`.
- `tests/run-tests.js` – mini-tester w Node; ładuje `data.js` i `rules.js` przez `vm` i sprawdza zasady.

`index.html` ładuje zwykłe `<script>` w kolejności: `data.js`, `rules.js`, `game.js` (bez modułów, bez npm).

Każdy obiekt na planszy trzyma **bezwzględne kratki** (`cells: [{x, y}]`), więc obrót liczymy tylko
przy stawianiu, a reszta zasad (zajętość, zasięg, oddziały) działa na liście kratek.

## Critical Implementation Details

**Kolejność w turze:** faza `build` → (pierwszy ruch oddziału) → faza `move`. W chwili przejścia do `move`
liczymy oddziały gracza i dajemy każdemu pulę `5 + buildPoints`; potem budowanie jest zablokowane.
Atak jest dozwolony w obu fazach i nie zmienia fazy. Oddziały są „zamrożone” do końca tury –
łączenie oddziałów działa od następnej tury. Nowe jednostki (`isNew`) nie należą do żadnego oddziału
i nie atakują aż do następnej tury swojego właściciela.

**Ruch oddziału jako sztywny klocek:** osiągalne przesunięcia (dx, dy) liczymy BFS-em w 8 kierunkach;
krok jest dozwolony, gdy wszystkie kratki oddziału po przesunięciu są na planszy i są wolne
(lub należą do tego samego oddziału). Koszt = liczba kroków BFS.

**Odległość (zasięg i „dotykanie”):** odległość szachowego króla `max(|dx|, |dy|)` między
najbliższymi kratkami dwóch obiektów. „Styka się” = odległość 1.

## Phase 1: Menu, ustawienia i plansza startowa

### Overview
Ekrany i przechodzenie między nimi, plik z danymi, tworzenie gry i rysowanie planszy z ratuszami i chłopami.

### Changes Required:

#### 1. Ekrany
**File**: `game.js`
**Intent**: Dodać zmienną `currentScreen` (`"title" | "singleMenu" | "editorSetup" | "game" | "victory"`),
osobne funkcje rysujące i obsługujące kliknięcia dla każdego ekranu. Ekran tytułowy zostaje jak jest.
**Contract**: każdy ekran ma `drawXxx()` i `clickXxx(pos)`; `gameLoop` i listener `click` wybierają po `currentScreen`.
Przyciski dalej w formacie `{label, x, y, w, h}`.

#### 2. Menu Singleplayer i ustawienia Edytora
**File**: `game.js`
**Intent**: Menu z „1 vs BOT” (komunikat „wkrótce”), „EDYTOR”, „WSTECZ”. Ekran ustawień: liczba graczy
z przyciskami − / + (2–8), wybór rozmiaru planszy (3 przyciski, wybrany podświetlony), START, WSTECZ.
MULTIPLAYER na tytule nadal pokazuje „wkrótce”.

#### 3. Dane gry
**File**: `data.js` (nowy)
**Intent**: Wszystkie liczby gry w jednym miejscu, z polskimi komentarzami.
**Contract**:
- `BUILDING_TYPES[key] = { name, shape: [[x,y],...], producer: true/false }` dla `ratusz` (2×2),
  `koszary` (3×3), `strzelnica` (L, 5 kratek), `stajnia` (2×3). HP budynku = 2 × liczba kratek.
- `UNIT_TYPES[key] = { name, shape, hp, attack, range, era, building, cavalry, bonusVsCavalry, symbol }`
  dla chłopa (1/0/0, ratusz, era 1) i wszystkich 19 jednostek z `zasady-gry.md`.
  Ery (zgadnięte, do poprawy przez Tomka): era 1 – chłop, piechur, włócznik, łucznik, oszczepnik, kawaleria (1);
  era 2 – piechur ulepszony, pikinier, wojownik orłów, wyszkolony łucznik, elitarny oszczepnik, ciężka kawaleria;
  era 3 – halabardnik, elitarny wojownik orłów, słoń bojowy, kawaleria (2), paladyn;
  era 4 – elitarny wojownik orłów (ulepszony), ułan.
  Kształty przybliżone z zeszytu (piechur 1×2, łucznik 1×1, słoń T z 4 kratek, kawaleria L z 3 kratek itd.).
- `PLAYER_COLORS` – 8 kolorów z polskimi nazwami. `BOARD_SIZES` – mała/średnia/duża.
- Stałe zasad: `BUILD_POINTS = 8`, `BARRACKS_BONUS = 1`, `MOVE_POINTS = 5`, `BUILDING_HP_PER_CELL = 2`.

#### 4. Tworzenie gry
**File**: `rules.js` (nowy)
**Intent**: `createGame(playerCount, sizeKey)` buduje stan gry: gracze, plansza, ratusz + 2 chłopi
dla każdego gracza w miejscach startowych (4 rogi, potem środki 4 krawędzi, z odstępem od brzegu),
chłopi stoją obok ratusza od strony środka planszy.
**Contract**: stan gry
`{ cols, rows, players: [{id, colorName, color, era, alive}], current, turn, objects: [{id, kind, type, owner, cells, hp, ...}], buildPoints, barracksBonus, phase, squads, winner }`.
Pomocnicze: `shapeCells(shape, x, y, rotation)`, `getObjectAt(game, x, y)`, `distance(cellsA, cellsB)`.

#### 5. Rysowanie planszy
**File**: `game.js`
**Intent**: Plansza w obszarze 600×600 po lewej (rozmiar kratki = `floor(min(600/cols, 600/rows))`),
panel 200 px po prawej z nazwą gracza w turze. Budynki: kratki w kolorze gracza, gruba ramka, nazwa skrótem.
Jednostki: jaśniejszy kolor gracza + symbol jednostki + mały pasek życia.

#### 6. Tester zasad
**File**: `tests/run-tests.js` (nowy), `index.html` (dodanie skryptów)
**Intent**: Prosty tester: `check(nazwa, warunek)`, wypisuje ✅/❌ i kończy się kodem 1 przy błędzie.
Pierwsze testy: liczba graczy, każdy gracz ma ratusz + 2 chłopów, nic nie nachodzi na siebie i nie wychodzi
poza planszę dla 2–8 graczy na każdym rozmiarze.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzut ekranu (Edge headless) pokazuje planszę bez błędów

#### Manual Verification:
- Tytuł → Singleplayer → Edytor → ustawienia → START pokazuje planszę z ratuszami i chłopami w kolorach
- WSTECZ działa na każdym ekranie, Multiplayer i 1 vs BOT pokazują „wkrótce”
- 8 graczy na małej planszy wygląda czytelnie

**Implementation Note**: Po etapie pauza na sprawdzenie przez Tomka w Live Preview.

---

## Phase 2: Tury, budowanie i rekrutacja

### Overview
Panel tury z punktami, stawianie budynków obok chłopa, robienie jednostek obok budynku, koniec tury.

### Changes Required:

#### 1. Zasady budowania
**File**: `rules.js`
**Intent**: Sprawdzanie i wykonywanie budowy/rekrutacji z czytelnym powodem odmowy (po polsku).
**Contract**:
- `canPlaceBuilding(game, typeKey, cells)` → `{ ok, reason }`: na planszy, wolne kratki, styka się
  z **chłopem** aktualnego gracza (nowy chłop też może być „budowniczym”),
  koszt = liczba kratek ≤ `buildPoints` (+ `barracksBonus` gdy `koszary`), faza `build`, nie ratusz.
- `placeBuilding(...)` – odejmuje koszt (najpierw zużywa bonus koszar), tworzy obiekt z HP = 2 × kratki.
- `getRecruitOptions(game, building)` – jednostki z `building === typ` i `era <= gracz.era`.
- `canPlaceUnit(game, unitKey, building, cells)` / `placeUnit(...)` – styka się z tym budynkiem,
  wolne kratki, koszt = liczba kratek ≤ `buildPoints`; nowa jednostka ma `isNew = true`.
- `endTurn(game)` – następny żywy gracz, `buildPoints = 8`, `barracksBonus = 1`, `phase = "build"`,
  zdjęcie `isNew` i `hasAttacked` z jednostek gracza, który zaczyna turę.

#### 2. Interfejs budowania
**File**: `game.js`
**Intent**: Panel: kolor/nazwa gracza, punkty budowy (i bonus koszar), lista budynków do postawienia
z kosztem, przycisk KONIEC TURY. Klik budynku w panelu → „duch” kształtu za myszką (zielony = można,
czerwony = nie można + powód w panelu), R obraca, Esc anuluje, klik na planszy stawia.
Klik własnego budynku produkującego → lista jego jednostek (era gracza) z kosztem → ten sam tryb ducha.
Między turami baner „Tura gracza X – kliknij”.

#### 3. Testy
**File**: `tests/run-tests.js`
**Intent**: Koszary da się postawić za 8 + bonus; stajnia + koszary w jednej turze nie (za mało punktów);
budynek bez chłopa obok – odmowa; nachodzenie – odmowa; jednostka tylko obok swojego budynku;
tylko jednostki z ery 1; `endTurn` przywraca punkty i przechodzi do następnego gracza.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

#### Manual Verification:
- Postawienie koszar obok chłopa, potem piechura obok koszar; punkty maleją poprawnie
- Obrót R zmienia kształt strzelnicy, duch jest czerwony w złym miejscu i pokazuje powód
- Koniec tury przechodzi do następnego gracza i odnawia punkty

**Implementation Note**: Po etapie pauza na sprawdzenie przez Tomka.

---

## Phase 3: Ruch oddziałów

### Overview
Wybór jednostki → podświetlenie oddziału i pól, na które może dojść → klik = ruch.

### Changes Required:

#### 1. Zasady ruchu
**File**: `rules.js`
**Contract**:
- `findSquads(game, owner)` – grupy jednostek (bez `isNew`) stykających się bokiem lub rogiem.
- `startMovePhase(game)` – `phase = "move"`, zapis oddziałów i puli `5 + buildPoints` dla każdego,
  `buildPoints = 0`. Wołane automatycznie przy pierwszym ruchu w turze.
- `getReachableMoves(game, squad)` – mapa przesunięć `(dx, dy)` → koszt (BFS, 8 kierunków, krok = 1).
- `moveSquad(game, squad, dx, dy)` – przesuwa wszystkie kratki, odejmuje koszt z puli oddziału.

#### 2. Interfejs ruchu
**File**: `game.js`
**Intent**: Klik własnej jednostki → ramka wokół całego oddziału, w panelu pula ruchu oddziału;
pola osiągalne dla klikniętej jednostki podświetlone; klik pola → ruch. Panel ostrzega,
że pierwszy ruch kończy budowanie w tej turze.

#### 3. Testy
**Intent**: Dwie jednostki stykające się rogiem = 1 oddział; pula = 5 + reszta punktów;
krok po skosie kosztuje 1; ruch przez zajęte pole niemożliwy; po ruchu budowanie zablokowane;
nowa jednostka się nie rusza.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

#### Manual Verification:
- Oddział 2 chłopów rusza się razem, liczba punktów w panelu maleje
- Po zostawieniu 2 punktów budowy oddział ma 7 ruchu

**Implementation Note**: Po etapie pauza na sprawdzenie przez Tomka.

---

## Phase 4: Walka i wygrana

### Overview
Atak raz na turę, bonus przeciw kawalerii, niszczenie, odpadanie graczy i ekran zwycięzcy.

### Changes Required:

#### 1. Zasady walki
**File**: `rules.js`
**Contract**:
- `getAttackTargets(game, unit)` – wrogie jednostki i budynki w zasięgu (`distance ≤ range`);
  pusto, gdy `attack == 0`, `range == 0`, `hasAttacked` lub `isNew`.
- `attack(game, attacker, target)` – obrażenia = `attack` (+ `bonusVsCavalry` gdy cel ma `cavalry`),
  `hp ≤ 0` → obiekt usunięty, `hasAttacked = true`, potem `updateEliminations(game)`.
- `updateEliminations(game)` – gracz bez jednostek: `alive = false` (jego budynki zostają na planszy
  jako przeszkody, które można zniszczyć); jeden żywy gracz → `winner`.

#### 2. Interfejs walki i zwycięstwa
**File**: `game.js`
**Intent**: Po wybraniu jednostki cele w zasięgu mają czerwoną ramkę, klik = atak, krótki napis z obrażeniami.
Paski życia na jednostkach i budynkach. Ekran zwycięstwa w kolorze zwycięzcy + przycisk MENU.

#### 3. Testy
**Intent**: Łucznik (zasięg 4) trafia wroga 4 pola po skosie, 5 pól już nie; włócznik zadaje 1 + 3
kawalerii; drugi atak w tej samej turze – odmowa; chłop nie atakuje; budynek koszar ma 18 HP;
zabicie ostatniej jednostki wroga → wygrana; przy 3 graczach odpadnięty gracz jest pomijany w turach.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

#### Manual Verification:
- Pełna gra 2 graczy do zwycięstwa na małej planszy
- Gra 3 graczy: odpadnięty gracz nie dostaje tury

**Implementation Note**: Po etapie pauza na sprawdzenie przez Tomka.

---

## Testing Strategy

### Unit Tests (`node tests/run-tests.js`):
- Tworzenie gry dla 2–8 graczy, wszystkie rozmiary.
- Budowanie: bonus koszar, brak punktów, brak chłopa obok, nachodzenie, poza planszą.
- Rekrutacja: obok własnego budynku, tylko era 1.
- Oddziały i ruch: róg = styk, pula, skos = 1, przeszkody, blokada budowy, nowe jednostki.
- Walka: zasięg po skosie (granica), bonus vs kawaleria, raz na turę, HP budynków, eliminacja, wygrana.

### Manual Testing Steps:
1. Live Preview → Singleplayer → Edytor → 2 graczy, mała → START.
2. Postaw koszary obok chłopa, zrób piechura, zakończ turę.
3. Drugi gracz: rusz oddział chłopów, sprawdź pulę ruchu.
4. Doprowadź do walki i zwycięstwa.

## Performance Considerations

BFS ruchu na planszy 36×27 to < 1000 pozycji – liczymy tylko po kliknięciu jednostki, nie co klatkę.

## References

- Zasady: `context/foundation/zasady-gry.md`
- Wzorzec przycisków: `game.js:21-24`, `game.js:164-184`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Menu, ustawienia i plansza startowa

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js` — e36884f
- [x] 1.2 Zrzut ekranu (Edge headless) pokazuje planszę bez błędów — e36884f

#### Manual

- [x] 1.3 Tytuł → Singleplayer → Edytor → ustawienia → START pokazuje planszę z ratuszami i chłopami w kolorach — e36884f
- [x] 1.4 WSTECZ działa na każdym ekranie, Multiplayer i 1 vs BOT pokazują „wkrótce” — e36884f
- [x] 1.5 8 graczy na małej planszy wygląda czytelnie — e36884f

### Phase 2: Tury, budowanie i rekrutacja

#### Automated

- [x] 2.1 Testy przechodzą: `node tests/run-tests.js` — fdf548e

#### Manual

- [x] 2.2 Postawienie koszar obok chłopa, potem piechura obok koszar; punkty maleją poprawnie — fdf548e
- [x] 2.3 Obrót R zmienia kształt strzelnicy, duch jest czerwony w złym miejscu i pokazuje powód — fdf548e
- [x] 2.4 Koniec tury przechodzi do następnego gracza i odnawia punkty — fdf548e

### Phase 3: Ruch oddziałów

#### Automated

- [x] 3.1 Testy przechodzą: `node tests/run-tests.js` — 5b11d0b

#### Manual

- [x] 3.2 Oddział 2 chłopów rusza się razem, liczba punktów w panelu maleje — 5b11d0b
- [x] 3.3 Po zostawieniu 2 punktów budowy oddział ma 7 ruchu — 5b11d0b

### Phase 4: Walka i wygrana

#### Automated

- [x] 4.1 Testy przechodzą: `node tests/run-tests.js` — eb0bdec

#### Manual

- [ ] 4.2 Pełna gra 2 graczy do zwycięstwa na małej planszy
- [ ] 4.3 Gra 3 graczy: odpadnięty gracz nie dostaje tury
