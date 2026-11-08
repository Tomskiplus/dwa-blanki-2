# Jednostki obok jednostek, oddziały z ramki, budowanie po ruchu – plan implementacji

## Overview
Punkty 1, 2 i 6 z `context/foundation/do-zrobienia.md`. Zasady ustalone z autorem gry (2026-11-08) i zapisane
w `context/foundation/zasady-gry.md` → „Tura” i „Ruch – oddziały”. Ten plan mówi tylko, JAK to zbudować.

## Current State Analysis
- `game.phase` = `"build"` / `"move"`: pierwszy udany ruch (`moveSquad` → `startMovePhase`, `rules.js:421`)
  zamienia punkty budowy w pulę ruchu każdego oddziału i blokuje budowanie (`canPlaceBuilding`, `canPlaceUnit`,
  `canBuyUpgrade`, `canBuyResearch` sprawdzają `game.phase !== "build"`).
- Oddziały liczone automatycznie ze stykania się (`findSquads`, `rules.js:391`); pula `squad.points`.
- Nowa jednostka musi dotykać budynku (`canPlaceUnit`, `rules.js:317`).
- UI: `game.js` – `clickBoard` (wybór/ruch/atak), `getGameButtons` i `getBuildingMenu` ukrywają budowanie
  w fazie ruchu, `drawPanel` pisze „Faza ruchu”, `drawPanelInfo` ostrzega „pierwszy ruch kończy budowanie”.
- Testy oddziałów i fazy: `tests/run-tests.js:200-290`.

## Desired End State
- Brak faz: w każdej chwili tury można budować, robić jednostki, ulepszać, ruszać się i atakować.
- Każda jednostka ma własne darmowe kroki (5, z Pancerzem łuskowym 7); dalsze kroki zabierają wspólne punkty budowy.
- Każda jednostka chodzi sama; oddział robi się ramką myszki (do końca tury).
- Nowa jednostka może stanąć obok własnej jednostki, która dotyka budynku-producenta.

## What We're NOT Doing
- Łańcuszek jednostek przy stawianiu (tylko o jedną jednostkę dalej).
- Oddziały na kilka tur, przycisk ROZWIĄŻ, Shift+klik.
- Bonus +1 za koszary na ruch.
- Mgła wojny, populacja, jednostki specjalne zamku.

## Implementation Approach
Najpierw czyste zasady w `rules.js` (testowalne w Node), potem interfejs w `game.js`.

## Critical Implementation Details
- **Koszt ruchu oddziału:** `minFree` = najmniejsze `freeSteps` w oddziale; zasięg = `minFree + game.buildPoints`.
  Ruch o `d` kroków: `game.buildPoints -= max(0, d - minFree)`; każdej jednostce `freeSteps -= min(d, freeSteps)`.
  Za oddział płaci się raz (1 punkt na krok), niezależnie od liczby jednostek.
- **Kliknięcie po przeciągnięciu:** przeglądarka po `mouseup` wysyła też `click` – po ramce trzeba go zignorować.

## Phase 1: Zasady i testy

### Changes Required:

#### 1. Darmowe kroki i brak faz
**File**: `rules.js`
**Intent**: usunąć `game.phase` i `startMovePhase`; dać jednostkom własne darmowe kroki.
**Contract**: `unit.freeSteps` – ustawiane w `addUnit` i odnawiane w `endTurn` (jednostki gracza, który zaczyna)
na `movePointsFor(game, owner)`; `buyResearch(... "pancerzLuskowy")` dodaje +2 do `freeSteps` jednostek gracza.
Sprawdzenia `game.phase` w `canPlaceBuilding`, `canPlaceUnit`, `canBuyUpgrade`, `canBuyResearch` znikają.
`game.barracksBonus` nie zeruje się po ruchu.

#### 2. Oddziały tylko z zaznaczenia
**File**: `rules.js`
**Intent**: każda jednostka sama; oddziały tworzy funkcja wywoływana przez ramkę.
**Contract**:
- `game.squads` = lista `{ unitIds }` z tej tury (czyszczona w `endTurn`).
- `formSquads(game, unitIds)` – bierze tylko jednostki aktualnego gracza, nie nowe; usuwa je ze starych oddziałów;
  dzieli na grupy stykające się (bokiem/rogiem, jak `findSquads`); grupy ≥ 2 zapisuje w `game.squads`.
  Zwraca listę grup (też jednoosobowych).
- `getSquadOfUnit(game, unit)` → `{ unitIds, points }`: oddział z `game.squads` (żywi członkowie, którzy się
  dalej stykają z jednostką) albo sama jednostka; `points = minFree + game.buildPoints`.
- `moveSquad` – liczy koszt jak w „Critical Implementation Details”.
- `findSquads` zostaje jako pomocnik do dzielenia na grupy (z listy jednostek).

#### 3. Jednostka obok jednostki
**File**: `rules.js`
**Intent**: `canPlaceUnit` przyjmuje też miejsce obok własnej jednostki, która dotyka budynku.
**Contract**: OK, gdy `distance(building.cells, cells) === 1` albo istnieje jednostka aktualnego gracza `U`
(także nowa) z `distance(building.cells, U.cells) === 1` i `distance(U.cells, cells) === 1`.
Nowy komunikat: „Jednostka musi stać obok budynku albo obok twojej jednostki przy budynku.”

#### 4. Testy
**File**: `tests/run-tests.js`
**Intent**: przepisać testy oddziałów/fazy na nowe zasady i dodać nowe.
**Contract** – testy m.in.:
- stykające się jednostki bez ramki chodzą osobno; `formSquads` łączy stykające się, dzieli dalekie;
- przykład z zasad: 8 punktów, piechur idzie 7 → zostaje 6, inny piechur ma zasięg 5 + 6;
- po ruchu da się postawić budynek i jednostkę;
- oddział z różnymi krokami (7 i 4 darmowe… ) idzie tyle, ile najsłabszy; płaci 1 punkt na krok za cały oddział;
- bonus koszar zostaje po ruchu i nie wlicza się do ruchu;
- jednostka obok jednostki przy budynku – wolno; o dwie jednostki dalej – nie wolno; rogiem – wolno; obok nowej – wolno;
- w nowej turze oddział z ramki znika, darmowe kroki wracają do 5.

### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

## Phase 2: Interfejs – ramka i panel

### Changes Required:

#### 1. Ramka myszki
**File**: `game.js`
**Intent**: przeciągnięcie myszką po planszy (bez stawiania) rysuje prostokąt; puszczenie tworzy oddziały.
**Contract**: `mousedown`/`mousemove`/`mouseup` na canvasie; ramka zaczyna się dopiero po przesunięciu o kilka
pikseli (żeby zwykłe kliknięcie działało jak dotąd). Zaznaczone = własne jednostki z kratką w prostokącie →
`formSquads`; potem wybór pierwszej grupy (jak kliknięcie jej jednostki). `click` po ramce jest ignorowany.
Ramka rysowana przerywaną linią.

#### 2. Panel bez faz
**File**: `game.js`
**Intent**: budowanie zawsze dostępne; jasne napisy.
**Contract**: usunąć warunki `game.phase` (zakładki, `getBuildingMenu`, `drawPanel`, `drawPanelInfo`);
zawsze „Punkty budowy: X”; w informacji o jednostce „Sam” / „Oddział: N jedn.” + „Ruch: P”;
podpowiedź: „Kliknij pole, żeby ruszyć. Przeciągnij ramkę = oddział.”

### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzut ekranu: panel z punktami budowy po ruchu, jednostka obok jednostki przy koszarach
#### Manual Verification:
- Stykające się jednostki chodzą osobno; ramka robi oddział, który rusza się razem
- Po ruchu da się budować; ruch dalej niż 5 zabiera punkty budowy
- Nową jednostkę da się postawić obok swojej jednostki przy budynku

## Testing Strategy
Zasady w Node (`tests/run-tests.js`), interfejs zrzutami ekranu (headless Edge) i ręcznie w Live Preview.

## References
- Zasady: `context/foundation/zasady-gry.md`
- Lista MVP: `context/foundation/do-zrobienia.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Zasady i testy

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js` — 2e201ea

### Phase 2: Interfejs – ramka i panel

#### Automated

- [x] 2.1 Testy przechodzą: `node tests/run-tests.js`
- [x] 2.2 Zrzut ekranu: panel z punktami budowy po ruchu, jednostka obok jednostki przy koszarach

#### Manual

- [x] 2.3 Stykające się jednostki chodzą osobno; ramka robi oddział, który rusza się razem
- [x] 2.4 Po ruchu da się budować; ruch dalej niż 5 zabiera punkty budowy
- [x] 2.5 Nową jednostkę da się postawić obok swojej jednostki przy budynku
