# Poprawki tekstur – plan implementacji

## Overview
Rysunki jednostek zajmują pełne pola, kolor gracza jest tylko w środku rysunku (bez kolorowego tła kratek),
małe części (≤ 1/2 pola) zajmują pole, ale nie kosztują punktów, ułan to L z 3 pól z wystającą włócznią,
chłop to pusty kwadrat.

## Decyzje (z rozmowy z autorem gry)

| Jednostka | Pola (zajmuje) | Koszt | Darmowa część |
|---|---|---|---|
| włócznik, pikinier, halabardnik | 2 | 1 | daszek (górne pole) |
| wojownik orłów (3 rodzaje) | 4 | 3 | grot (ostatnie pole) |
| ułan | 3 (L) | 3 | – (włócznia tylko narysowana, wystaje w WOLNY róg) |
| reszta | bez zmian | = pola | – |

## What We're NOT Doing
- Zmiany statystyk, rysunków budynków, er.

## Phase 1: Tekstury i koszty

### Changes Required:

#### 1. Dane
**File**: `data.js`
**Contract**: pole `free: [[x, y], ...]` – kratki kształtu, które zajmują miejsce, ale nie kosztują.
Ułan: kształt `[[0,0],[0,1],[1,1]]`.

#### 2. Zasady
**File**: `rules.js`
**Contract**: `unitCost(unitKey) = shape.length - free.length`; używany w `canPlaceUnit` i `placeUnit`.

#### 3. Rysowanie
**File**: `drawings.js`, `game.js`
**Intent**: Rysunki na pełnych polach, wypełnione jasnym kolorem gracza (wypełnienie = ten sam kontur co linie).
`drawUnit` nie maluje już tła kratek. Przyciski rekrutacji pokazują nowy koszt.

#### 4. Testy
**File**: `tests/run-tests.js`
**Intent**: koszt włócznika 1 (zajmuje 2 pola), wojownika orłów 3 (4 pola), ułana 3 (3 pola);
postawienie włócznika zabiera 1 punkt.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzut ekranu (Edge headless) – galeria jednostek bez koloru poza rysunkiem

#### Manual Verification:
- Tekstury wyglądają tak, jak chce autor gry (kolor w środku, pełne pola, ułan z wystającą włócznią, chłop = kwadrat)
- Włócznik kosztuje 1 punkt, wojownik orłów 3

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Tekstury i koszty

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js`
- [x] 1.2 Zrzut ekranu (Edge headless) – galeria jednostek bez koloru poza rysunkiem

#### Manual

- [x] 1.3 Tekstury wyglądają tak, jak chce autor gry (kolor w środku, pełne pola, ułan z wystającą włócznią, chłop = kwadrat)
- [x] 1.4 Włócznik kosztuje 1 punkt, wojownik orłów 3
