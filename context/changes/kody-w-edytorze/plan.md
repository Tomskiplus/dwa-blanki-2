# Tajne kody w edytorze – plan

## Overview

W EDYTORZE (gra na jednym komputerze) gracz wpisuje kod w okienko czatu (Enter), a obok jego ratusza pojawia się specjalna jednostka:
- `IAmNotTusk` → **Jeż**: 4 pola (2×2), 5 życia, 1 ataku, zasięg 1, **15 ataków na turę**,
- `AK-47_cat` → **Kot z AK-47**: 2 pola (1×2, pionowo), 20 życia, 10 ataku, **tylko w jednostki**, zasięg „nieskończony”.

Grafiki rysujemy w kodzie (`drawings.js`). Obrazki z internetu (memy) służą tylko jako inspiracja.

## Current State Analysis

- Jednostki to wpisy w `UNIT_TYPES` ([data.js:189](../../../data.js#L189)). Jednostka bez pola `building` nie pojawi się w menu żadnego budynku ([rules.js:309-313](../../../rules.js#L309-L313)).
- Liczbę ataków na turę daje `maxAttacks` ([rules.js:629](../../../rules.js#L629)): 1 albo 2 (Szarża).
- Cele ataku: `getAttackTargets` ([rules.js:609](../../../rules.js#L609)) i `canAttack` ([rules.js:650](../../../rules.js#L650)).
- Nowa jednostka: `addUnit` ([rules.js:95](../../../rules.js#L95)) plus `isNew = true` („rusza się od następnej tury”), tak jak w `placeUnit`.
- Rysunki: `UNIT_DRAWINGS` w [drawings.js:138](../../../drawings.js#L138), klucze takie jak w `UNIT_TYPES`.
- Okienko do pisania powstaje w zmianie `czat-w-grze` (etap 2). Plan czatu został poszerzony o EDYTOR.

## Desired End State

W EDYTORZE: Enter → `IAmNotTusk` → Enter → obok ratusza gracza, który ma turę, stoi Jeż w jego kolorze. Od następnej tury chodzi i może zaatakować 15 razy. `AK-47_cat` daje Kota, który w następnej turze strzela w dowolną wrogą jednostkę na planszy za 10, ale budynków nie atakuje. Drugi kod w tej samej turze → „Kod już użyty w tej turze”. W meczu przez internet kody nie działają.

### Key Discoveries:

- Zasięg „nieskończony” zapisujemy jako `999`, a nie `Infinity`, bo `Infinity` po zamianie na JSON (zapis gry) staje się `null`.
- Kod `AK-47_cat` ma cyfry, więc filtr czatu by go zablokował. Kody trzeba sprawdzać **przed** filtrem i nigdy ich nie wysyłać.

## What We're NOT Doing

- Kody w meczu przez internet (tam tylko komunikat „Kody działają tylko w edytorze”).
- Obrazki z internetu w grze.
- Jeż i kot w menu budynków, ulepszenia i badania dla nich.
- Lista kodów w grze (kody są tajne – autor gry je zna).

## Implementation Approach

Zasady w `data.js` + `rules.js` (testowalne w node), rysunki w `drawings.js`, podpięcie do okienka czatu w `chat.js`.

## Phase 1: Zasady – jeż, kot i kody

### Overview

Nowe jednostki, ich specjalne zasady i funkcja „użyj kodu” z testami.

### Changes Required:

#### 1. Jednostki i kody

**File**: `data.js`

**Intent**: Dwie nowe jednostki „tylko z kodu” i lista kodów.

**Contract**:
- `UNIT_TYPES.jez`: `{ name: "Jeż", shape: SHAPE_SQUARE4, hp: 5, attack: 1, range: 1, era: 1, cheatOnly: true, attacksPerTurn: 15 }`
- `UNIT_TYPES.kotAk`: `{ name: "Kot z AK-47", shape: SHAPE_1x2, hp: 20, attack: 10, range: 999, era: 1, cheatOnly: true, onlyVsUnits: true }`
- `CHEAT_CODES = { iamnottusk: "jez", "ak-47_cat": "kotAk" }` (klucze małymi literami).

#### 2. Zasady

**File**: `rules.js`

**Intent**: 15 ataków jeża, kot strzela tylko w jednostki, kod tworzy jednostkę obok ratusza.

**Contract**:
- `maxAttacks`: jeśli typ ma `attacksPerTurn`, zwraca tę liczbę.
- `getAttackTargets` / `canAttack`: przy `onlyVsUnits` budynki odpadają z celów, a `canAttack` zwraca „<nazwa> atakuje tylko jednostki.”
- `useCheatCode(game, text)` → `{ ok, reason, unit }`:
  - `text` po `trim()` i `toLowerCase()` szukamy w `CHEAT_CODES`. Brak → `{ ok: false, reason: "" }` (to nie kod).
  - Już użyty w tej turze (`game.codeUsedThisTurn`) → „Kod już użyty w tej turze.”
  - Brak ratusza → „Nie masz ratusza.”
  - Szukamy wolnego miejsca na kształt (kot: najpierw pionowo, potem poziomo) najbliżej ratusza obecnego gracza (najmniejszy `distance`, przy remisie pierwsze od lewej-góry). Brak miejsca → „Brak miejsca obok ratusza.”
  - `addUnit(...)`, `isNew = true`, `game.codeUsedThisTurn = true`. Bez kosztu punktów.
- `endTurn`: `game.codeUsedThisTurn = false`.

#### 3. Testy

**File**: `tests/run-tests.js`

**Contract**: sekcja „ZMIANA kody-w-edytorze”:
- kod tworzy jeża obok ratusza (dystans 1), `isNew`, 4 pola, 5 hp, kolor gracza,
- wielkość liter bez znaczenia, drugi kod w tej samej turze odrzucony, po `endTurn` znowu działa,
- jeż w następnej turze atakuje 15 razy, a 16. raz już nie,
- kot trafia jednostkę na drugim końcu planszy za 10, a budynku nie atakuje,
- zwykły tekst („hej”) → `ok: false` z pustym `reason`,
- jeż i kot nie pojawiają się w `getRecruitOptions` żadnego budynku.

### Success Criteria:

#### Automated Verification:

- `node tests/run-tests.js` – wszystko ✅

#### Manual Verification:

- (brak – UI w etapie 2)

---

## Phase 2: Rysunki i kody w okienku czatu

### Overview

Jeż i kot wyglądają jak z zeszytu, a kody działają po wpisaniu w okienko czatu w EDYTORZE.

**Wymaga**: `czat-w-grze` etap 2 (okienko czatu, także w EDYTORZE).

### Changes Required:

#### 1. Rysunki

**File**: `drawings.js`

**Intent**: `UNIT_DRAWINGS.jez` (okrągłe ciało w kolorze gracza, kolce, oczko i nosek, mała żółta tabliczka na patyku) i `UNIT_DRAWINGS.kotAk` (głowa z uszami w górnym polu, tułów w dolnym, czarny rysunkowy karabin w łapach).

#### 2. Kody w czacie

**File**: `chat.js`

**Intent**: Przed filtrem sprawdzamy, czy tekst to kod.

**Contract**:
- W EDYTORZE: `useCheatCode(game, text)`. Kod zadziałał → „Jeż przybył!” / „Kot z AK-47 przybył!” w `message`, pole się zamyka, tekst kodu nigdzie się nie pokazuje. Kod odrzucony → `reason` w `message`. To nie kod → zwykła wiadomość czatu.
- W meczu przez internet: tekst, który jest kodem → nie wysyłamy, `message` = „Kody działają tylko w edytorze.”

#### 3. Panel

**File**: `game.js`

**Intent**: Zasięg ≥ 999 wyświetla się jako „∞” w informacjach o jednostce.

### Success Criteria:

#### Automated Verification:

- `node tests/run-tests.js` – wszystko ✅

#### Manual Verification:

- W EDYTORZE `IAmNotTusk` → jeż obok ratusza, ładnie narysowany, w kolorze gracza
- `AK-47_cat` w następnej turze → komunikat „Kod już użyty…” w tej samej turze, kot pojawia się po zmianie tury
- Kot w następnej turze strzela przez całą planszę w jednostkę, a w budynek nie
- Jeż atakuje wiele razy w jednej turze
- Kod wpisany w meczu przez internet nie dochodzi do przeciwnika

## Testing Strategy

Zasady (etap 1) w node, wygląd i czat (etap 2) ręcznie w EDYTORZE.

## Phase 3: Żaba (dodatek z 2026-11-14)

### Overview

Trzeci kod dopisany przez autora gry: `ILLfroggy` → **Żaba**: 4 pola (2×2, widziana z góry), 21 życia, 5 ataku, zasięg 4, **ruch „bez końca”**.

### Changes Required:

- `data.js`: `UNIT_TYPES.zaba` z `unlimitedMove: true`, kod `"illfroggy": "zaba"`.
- `rules.js`: `freeStepsFor(game, owner, unitKey)` → `UNLIMITED_STEPS` (999) dla `unlimitedMove`, a dla reszty `movePointsFor`. Używane w `addUnit` i `endTurn`.
- `game.js`: „Ruch: ∞” w panelu, gdy punkty ≥ 999.
- `drawings.js`: `UNIT_DRAWINGS.zaba` (zielona, wyłupiaste oczy, pasek w kolorze gracza).
- `chat.js`: napis „<nazwa> wkracza do gry!” (pasuje też do żaby).
- Testy: kod, 999 kroków, daleki skok bez punktów budowy, zasięg 4.

### Success Criteria:

#### Automated Verification:

- `node tests/run-tests.js` – wszystko ✅

#### Manual Verification:

- `ILLfroggy` → żaba obok ratusza; w następnej turze skacze przez całą planszę

## References

- Okienko czatu: `context/changes/czat-w-grze/plan.md` (etap 2)
- `maxAttacks`: [rules.js:629](../../../rules.js#L629)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Zasady – jeż, kot i kody

#### Automated

- [x] 1.1 `node tests/run-tests.js` – wszystko ✅ — 1c2451e

### Phase 2: Rysunki i kody w okienku czatu

#### Automated

- [x] 2.1 `node tests/run-tests.js` – wszystko ✅ — 4b151ca

#### Manual

- [x] 2.2 `IAmNotTusk` → jeż obok ratusza, ładnie narysowany
- [x] 2.3 Drugi kod w tej samej turze odrzucony, po zmianie tury działa
- [x] 2.4 Kot strzela przez całą planszę w jednostkę, w budynek nie
- [x] 2.5 Jeż atakuje wiele razy w jednej turze
- [x] 2.6 Kod w meczu przez internet nie dochodzi do przeciwnika

### Phase 3: Żaba (dodatek z 2026-11-14)

#### Automated

- [x] 3.1 `node tests/run-tests.js` – wszystko ✅ — a8410e7

#### Manual

- [x] 3.2 `ILLfroggy` → żaba obok ratusza; w następnej turze skacze przez całą planszę

### Phase 4: Animacja języka żaby (dodatek z 2026-11-14)

Żaba przy ataku wyciąga różowy język do celu, wali go („PLASK!”) i chowa język (0,6 s).
Zniszczony cel jest rysowany jako „duch”, dopóki język go nie trafi.
`data.js`: `tongueAttack: true`; `game.js`: `startTongueAttack` / `drawTongueAttacks` (sama animacja – obrażenia liczy `attack()` od razu).

#### Manual

- [x] 4.1 Żaba atakuje: język leci do celu, „PLASK!”, cel znika w chwili trafienia

### Phase 5: Tła planszy z kodów (dodatek z 2026-11-14)

Kody `design:mountain` (góry), `design:meadow` (łąka), `design:space` (kosmos) i `design:off` (bez tła).
Tło rysowane w kodzie (`designs.js`), półprzezroczyste pod kratkami, malowane raz na ukrytym canvasie.
Tylko wygląd: bez limitu „raz na turę”, tylko w EDYTORZE, znika po wyjściu z gry.
Zamiast proponowanego „design:starwars” jest `design:space` (cudzy znak towarowy – tworzymy własne).

#### Manual

- [x] 5.1 Każdy z 3 kodów zmienia tło planszy, `design:off` je wyłącza
