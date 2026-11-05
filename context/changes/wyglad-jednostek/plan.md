# Wygląd jednostek jak w zeszycie – plan implementacji

## Overview

Jednostki przestają być kolorowymi kratkami z literami. Każda dostaje rysunek „długopisem”
jak w zeszycie, na jasnym tle w kolorze gracza. Przy okazji kształty kilku jednostek
zgadzają się z rysunkami (kawaleria, ułan, słoń), a wojownik orłów, słoń i ułan dają się
robić już teraz, jeszcze przed erami.

## Current State Analysis

- `UNIT_TYPES` w `data.js` ma 20 jednostek: kształt (`shape`), statystyki, `era`, `building` i `symbol` (litery).
- `drawUnit` w `game.js` rysuje jednostkę jako `fillCells(..., 0.45)` + `drawShapeOutline` + `drawText(symbol)`.
- Obiekt jednostki (`addUnit` w `rules.js`) pamięta tylko `cells`, a nie obrót, więc nie wiadomo,
  jak obrócić rysunek.
- `getRecruitOptions` / `canPlaceUnit` wpuszczają tylko jednostki z `era <= era gracza`. Gra zawsze
  jest w erze 1, więc wojownik orłów (era 2), słoń (era 3) i ułan (era 4) są niedostępne.
- `shapeCells(shape, x, y, rotation)` obraca kształt przez `(x, y) -> (-y, x)` i przesuwa go do (0, 0).
  Dokładnie tak samo obraca `ctx.rotate(Math.PI / 2)` na canvasie, więc rysunek da się obrócić
  tą samą transformacją.

## Desired End State

- Każda z 20 jednostek ma własny rysunek, bez liter. Wygląd wg rysunków z zeszytu:
  - **włócznik** – kwadrat z grotem,
  - **łucznik** – kółko,
  - **oszczepnik** – kwadrat z kropką,
  - **wojownik orłów** – „ołówek”,
  - **kawaleria** – Γ,
  - **ułan** – kwadrat 2×2 ze skośną strzałką,
  - **słoń** – kwadrat na podstawie 3×2,
  - reszta wg starszych zdjęć; chłop to ludzik.
- Rysunek obraca się razem z jednostką (R przy stawianiu), a duch pokazuje rysunek.
- Kształty: kawaleria (1) = Γ (3 kratki), ułan = 2×2 (4), słoń = 1 + 3×2 (7). Reszta bez zmian.
- Wojownik orłów, słoń i ułan dają się robić od początku gry (tymczasowo, do czasu er).
- `node tests/run-tests.js` przechodzi.

### Key Discoveries:

- `shapeCells` i `ctx.rotate(+90°)` używają tego samego obrotu `(x, y) -> (-y, x)`.
  Po obrocie trzeba przesunąć rysunek o szerokość/wysokość, tak samo jak `shapeCells` przesuwa kratki do (0, 0).
- Przyciski rekrutacji układają się w pionie co 46 px od y = 185. 3 jednostki + ZAMKNIJ mieszczą się nad podpowiedzią (y ≈ 385).

## What We're NOT Doing

- Ery (nazwy: mroku, feudalna, zamków, imperiów), przechodzenie er, ulepszenia.
- Zamek, uniwersytet, proch, bombardy – następna zmiana (zapisane w `do-zrobienia.md`).
- Nowe rysunki budynków (koszary, strzelnica, stajnia już wyglądają jak w zeszycie).
- Zmiany statystyk jednostek (życie, atak, zasięg).

## Implementation Approach

1. **Dane i zasady** (`data.js`, `rules.js`) – nowe kształty, znacznik `availableNow: true`
   (tymczasowe odblokowanie bez zmiany prawdziwej ery), zapamiętanie obrotu w jednostce.
2. **Rysunki** (`game.js`) – jedna funkcja rysująca na jednostkę, wszystkie rysują w „kratkach kształtu”
   przed obrotem (np. łucznik: kółko w kratce 0,0). Wspólna funkcja ustawia przesunięcie i obrót canvasu,
   woła rysunek i przywraca canvas.

## Critical Implementation Details

**Obrót rysunku.** Dla obrotu `r` (0–3) i kształtu o wymiarach `w × h` (w kratkach, przed obrotem)
canvas: `translate(lewyGórnyRógJednostki + przesunięcie)`, potem `rotate(r * 90°)`.
Przesunięcie (w kratkach): r=0 → (0, 0), r=1 → (h, 0), r=2 → (w, h), r=3 → (0, w).
Lewy górny róg jednostki to `min x` i `min y` jej kratek.

## Phase 1: Dane i zasady

### Overview
Nowe kształty, tymczasowe odblokowanie trzech jednostek i zapamiętywanie obrotu.

### Changes Required:

#### 1. Kształty i odblokowanie
**File**: `data.js`
**Intent**: Kawaleria (1) dostaje kształt Γ, ułan 2×2, słoń 7 kratek. Wojownik orłów, słoń i ułan
dostają `availableNow: true` z komentarzem, że to tymczasowe do czasu er. Pole `symbol` znika
(rysunki je zastąpią); `name` zostaje.
**Contract**:
- Γ: `[[0,0],[1,0],[0,1]]`
- słoń: `[[1,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]`
- ułan: `SHAPE_SQUARE4`
- kawaleria (2) i paladyn zostają przy `SHAPE_L3`.

#### 2. Era i obrót w zasadach
**File**: `rules.js`
**Intent**: Jednostka jest dostępna, gdy `era <= era gracza` **albo** `availableNow`. Jednostka pamięta
swój obrót, żeby dało się ją dobrze narysować.
**Contract**:
- nowa funkcja `isUnitAvailable(game, unitKey)`, używana przez `getRecruitOptions` i `canPlaceUnit`;
- `addUnit(game, typeKey, owner, cells, rotation)` zapisuje `unit.rotation` (domyślnie 0);
- `placeUnit(game, unitKey, building, cells, rotation)` przekazuje obrót.
- `game.js` (`clickBoard`) przekazuje `action.rotation` do `placeUnit`.

#### 3. Dokumenty
**File**: `context/foundation/zasady-gry.md`, `context/foundation/do-zrobienia.md`
**Intent**: Zapisać nowe kształty, nazwy er (mroku, feudalna, zamków, imperiów), uniwersytet
(ulepszenia + badanie prochu → bombardy) i zamek jako następną zmianę.

#### 4. Testy
**File**: `tests/run-tests.js`
**Intent**: Słoń ma 7 kratek, ułan 4, kawaleria (1) to Γ; koszary w erze 1 robią piechura, włócznika
i wojownika orłów; strzelnica – łucznika, oszczepnika i słonia; stajnia – kawalerię (1) i ułana;
pikinier (era 2, bez znacznika) dalej niedostępny; jednostka postawiona z obrotem 1 ma `rotation === 1`.
Poprawić stary test „Koszary w erze 1 robią: piechur i włócznik”.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

#### Manual Verification:
- W koszarach, strzelnicy i stajni widać nowe jednostki (wojownik orłów, słoń, ułan) i da się je postawić

**Implementation Note**: Po etapie pauza na sprawdzenie przez autora gry.

---

## Phase 2: Rysunki jednostek

### Overview
Każda jednostka rysowana jak w zeszycie, z obrotem; duch przy stawianiu też pokazuje rysunek.

### Changes Required:

#### 1. Rysowanie z obrotem
**File**: `game.js`
**Intent**: `drawUnit` rysuje jasne tło w kolorze gracza (jak teraz), a potem rysunek jednostki czarnymi
liniami zamiast liter. Wspólna funkcja ustawia obrót canvasu (patrz Critical Implementation Details).
**Contract**: `UNIT_DRAWINGS[unitKey](size)` – funkcja rysująca w układzie kształtu przed obrotem,
`size` = rozmiar kratki w pikselach. Brak rysunku → zwykła ramka (żeby gra się nie wysypała).

#### 2. Rysunki 20 jednostek
**File**: `game.js` (albo osobny `drawings.js`, jeśli `game.js` zrobi się za długi)
**Intent**:
- **chłop** – ludzik;
- **piechur** – prostokąt; **piechur ulepszony** – prostokąt z kreską oddzielającą górną kratkę;
- **włócznik** – kwadrat z trójkątnym grotem w górnej kratce; **pikinier** – to samo + skośna kreska;
  **halabardnik** – kwadrat z X + grot;
- **wojownik orłów** – „ołówek” (jak ozdoba na ekranie tytułowym); **elitarny** – ołówek z piórami z tyłu;
  **elitarny+** – pióra + zamalowany tył;
- **łucznik** – kółko; **wyszkolony łucznik** – dwa nachodzące kółka;
- **oszczepnik** – kwadrat z kropką; **elitarny oszczepnik** – kropka + zamalowany róg;
- **słoń** – obrys kształtu + kwadrat na górze;
- **kawaleria (1)** – Γ z kółkami (kopyta); **ciężka kawaleria** – 2×2 z falkami;
  **kawaleria (2)** – L; **paladyn** – L ze strzałką w górę; **ułan** – 2×2 ze skośną strzałką.

#### 3. Duch z rysunkiem
**File**: `game.js`
**Intent**: Przy stawianiu jednostki duch (zielony/czerwony) pokazuje też rysunek w aktualnym obrocie.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzut ekranu (Edge headless) ze wszystkimi 20 jednostkami w 4 obrotach – rysunki są czytelne, bez błędów w konsoli

#### Manual Verification:
- Jednostki wyglądają jak w zeszycie (autor gry porównuje z rysunkiem)
- Obrót R przy stawianiu obraca też rysunek

**Implementation Note**: Po etapie pauza na sprawdzenie przez autora gry.

---

## Testing Strategy

- Testy zasad (Node): kształty, dostępność jednostek (era albo `availableNow`), zapis obrotu.
- Wizualnie: strona testowa ze wszystkimi jednostkami w 4 obrotach (zrzut z Edge headless).

## References

- Rysunki: dzisiejszy rysunek z teksturami + zdjęcia zeszytu (folder „DWA BLANKI - ZESZYT”).
- Poprzednia zmiana: `context/archive/2026-11-03-rozgrywka-podstawy/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Dane i zasady

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js`

#### Manual

- [ ] 1.2 W koszarach, strzelnicy i stajni widać nowe jednostki (wojownik orłów, słoń, ułan) i da się je postawić

### Phase 2: Rysunki jednostek

#### Automated

- [ ] 2.1 Testy przechodzą: `node tests/run-tests.js`
- [ ] 2.2 Zrzut ekranu (Edge headless) ze wszystkimi 20 jednostkami w 4 obrotach – rysunki są czytelne, bez błędów w konsoli

#### Manual

- [ ] 2.3 Jednostki wyglądają jak w zeszycie (autor gry porównuje z rysunkiem)
- [ ] 2.4 Obrót R przy stawianiu obraca też rysunek
