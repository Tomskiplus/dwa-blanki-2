# Kraje (17 kolorów) i wybór kraju przed grą – plan implementacji

## Overview
Zasady: `context/foundation/zasady-gry.md` → „Kolory (kraje)” (wybór kraju ustalony 2026-11-11).
17 krajów zamiast 8 kolorów; na ekranie EDYTOR każdy gracz wybiera kraj strzałkami; ten sam kraj
może mieć kilku graczy – wtedy numer gracza na obiektach i w nazwie.

## Current State Analysis
- `PLAYER_COLORS` (8) w `data.js:259`; `createGame(playerCount, sizeKey)` (`rules.js:152`) daje graczowi `i`
  kolor `i`.
- Ekran EDYTOR (`game.js` `getEditorSetupButtons`, `drawEditorSetupScreen`): liczba graczy, kwadraciki,
  rozmiar planszy. Nazwa gracza (`player.colorName`) jest w panelu, banerze tury i ekranie zwycięstwa.

## What We're NOT Doing
- Jednostki specjalne, X-y, budowle specjalne (kawałki 2–4).

## Phase 1: Kraje i menu

### Changes Required:
#### 1. Dane
**File**: `data.js`
**Intent**: `PLAYER_COLORS` → `COUNTRIES` (17 × `{ key, name, color }`) w kolejności z zasad; odcienie
dobrane tak, żeby podobne kolory dało się odróżnić.

#### 2. Zasady
**File**: `rules.js`
**Intent**: `createGame(playerCount, sizeKey, countryIndexes)` – opcjonalna lista krajów (domyślnie po kolei).
**Contract**: gracz dostaje `country` (klucz), `color`, `colorName` (nazwa kraju + „ ” + numer gracza, gdy kraj
się powtarza) i `showNumber` (true, gdy kraj się powtarza).

#### 3. Interfejs
**File**: `game.js`
**Intent**: EDYTOR – wiersz „Gracz N: ◀ kraj ▶” dla każdego gracza (2 kolumny); `setup.countries`;
cyfra z numerem gracza na budynkach i jednostkach, gdy `showNumber`.

#### 4. Testy
**File**: `tests/run-tests.js`
**Intent**: 17 krajów; domyślnie po kolei; wybrane kraje trafiają do graczy; powtórzony kraj → „Czerwony 2”
i `showNumber`; bez powtórzeń – bez numerów.

### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzut ekranu: EDYTOR z wyborem krajów; plansza z dwoma graczami tego samego kraju
#### Manual Verification:
- Strzałki zmieniają kraje, gra zaczyna się z wybranymi krajami
- Kolory 17 krajów da się odróżnić; cyfry widać, gdy kraj się powtarza

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Kraje i menu

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js` — e1387c9
- [x] 1.2 Zrzut ekranu: EDYTOR z wyborem krajów; plansza z dwoma graczami tego samego kraju — e1387c9

#### Manual

- [x] 1.3 Strzałki zmieniają kraje, gra zaczyna się z wybranymi krajami — e1387c9
- [x] 1.4 Kolory 17 krajów da się odróżnić; cyfry widać, gdy kraj się powtarza
