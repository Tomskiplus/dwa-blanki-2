# Ery – plan implementacji

## Overview

Gracze zaczynają w erze mroku i mogą przechodzić do ery feudalnej, zamków i imperiów.
Era odblokowuje budynki i jednostki. Do przejścia trzeba mieć wszystkie budynki z obecnej ery.
Przycisk NASTĘPNA ERA działa w każdej chwili tury, a po nim tura się kończy.

## Current State Analysis

- `players[i].era` istnieje (zawsze 1). `isUnitAvailable` w `rules.js` sprawdza `era` albo tymczasowy
  znacznik `availableNow` (wojownik orłów, słoń, ułan).
- `BUILDING_TYPES` (`data.js`) nie mają ery – koszary, strzelnica i stajnia są dostępne od razu.
- Panel (`drawPanel` w `game.js`) ma stałe pozycje: przyciski od y = 185 co 46 px, podpowiedź na y ≈ 385,
  KONIEC TURY y = 470, MENU y = 535. W erze 3–4 koszary będą miały do 8 jednostek – stary układ się nie zmieści.
- Testy etapu 2 poprzednich zmian stawiają strzelnicę i stajnię w erze 1 – po tej zmianie trzeba im ustawić erę.

## Desired End State

- Ery: 1 – era mroku, 2 – era feudalna, 3 – era zamków, 4 – era imperiów.
- Budynki: ratusz i koszary od ery 1, strzelnica od 2, stajnia od 3 (uniwersytet od 4 – następna zmiana).
- Jednostki:
  - era 1: chłop, piechur, włócznik;
  - era 2: piechur ulepszony, pikinier, wojownik orłów, łucznik, oszczepnik;
  - era 3: halabardnik, elitarny wojownik orłów, wyszkolony łucznik, elitarny oszczepnik, słoń, kawaleria (1), kawaleria (2);
  - era 4: elitarny wojownik orłów+, ciężka kawaleria, paladyn, ułan.
- Znacznik `availableNow` znika.
- Przejście: gracz ma co najmniej 1 budynek każdego typu z obecnej ery (tylko budynki, które da się budować).
  Era 4 jest ostatnia.
- NASTĘPNA ERA: w każdej chwili tury → era + 1 → tura się kończy; na banerze następnego gracza informacja,
  kto wszedł w jaką erę. Gdy nie wolno – panel pisze, czego brakuje.
- Panel pokazuje nazwę ery gracza i wymagania do następnej.

### Key Discoveries:

- Wymagania liczymy z danych (`era` budynku), więc mury/wieże/zamek dodane później same wejdą do wymagań.
- Lista jednostek w budynku rośnie z erą (koszary: do 8) – przyciski rekrutacji muszą być niższe,
  a ZAMKNIJ przenosimy do małego „X” obok nagłówka.

## What We're NOT Doing

- Ulepszenia, uniwersytet, proch, bombardy, zamek, mury, wieże, bramy, budynek „na planszy z wodą”.
- Koszt przejścia do ery (jest darmowe – kosztuje tylko resztę tury).
- Cofanie ery.

## Implementation Approach

Etap 1 – zasady i dane (z testami), etap 2 – panel, przycisk i baner.

## Phase 1: Zasady er

### Changes Required:

#### 1. Dane
**File**: `data.js`
**Intent**: `ERA_NAMES` (indeks 1–4), `MAX_ERA = 4`, pole `era` w każdym budynku, nowe ery jednostek
wg tabeli wyżej, usunięcie `availableNow`.

#### 2. Zasady
**File**: `rules.js`
**Contract**:
- `canPlaceBuilding` – odmowa, gdy `era budynku > era gracza` („Strzelnica będzie dostępna w erze feudalnej.”);
- `isUnitAvailable` – tylko era;
- `getEraRequirements(game, owner)` → klucze budynków z `era === era gracza` i `canBuild`;
- `canAdvanceEra(game)` → `{ ok, reason, missing }` (brakujące budynki gracza, który ma turę; era 4 → „To już ostatnia era.”);
- `advanceEra(game)` → era + 1, potem `endTurn(game)`; zwraca `{ ok, reason, era }`.

#### 3. Testy
**File**: `tests/run-tests.js`
**Intent**: Poprawić stare testy, które stawiają strzelnicę/stajnię albo wymagają `availableNow` (ustawić erę gracza).
Nowe: strzelnica w erze 1 – nie wolno; koszary w erze 1 robią tylko piechura i włócznika; strzelnica w erze 2
robi łucznika i oszczepnika; era 1 bez koszar – nie można przejść; koszary WROGA się nie liczą; z koszarami –
przejście do ery 2 i koniec tury; era 4 – nie można dalej.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

#### Manual Verification:
- (sprawdzane razem z etapem 2)

---

## Phase 2: Panel, przycisk i baner

### Changes Required:

#### 1. Panel
**File**: `game.js`
**Intent**: Nazwa ery gracza pod kwadracikami graczy. Lista budynków tylko z dostępnych er.
Przycisk NASTĘPNA ERA nad KONIEC TURY (gdy nic nie jest wybrane); kliknięcie przy braku wymagań →
komunikat „Brakuje: …”. Domyślna podpowiedź mówi, czego potrzeba do następnej ery.
Lista jednostek w budynku: niższe przyciski (mieszczą 8), ZAMKNIJ jako małe „X” obok nagłówka,
podpowiedź pod listą.

#### 2. Baner
**File**: `game.js`
**Intent**: Po przejściu do ery baner następnego gracza ma dodatkową linijkę, np.
„Czerwony wchodzi w erę feudalną!”.

### Success Criteria:

#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzuty ekranu (Edge headless): panel w erze 1 i 3, koszary w erze 4 (8 jednostek), baner po zmianie ery

#### Manual Verification:
- Na start można budować tylko koszary; po zbudowaniu koszar NASTĘPNA ERA przenosi do ery feudalnej i kończy turę
- W erze feudalnej da się zbudować strzelnicę i zrobić łucznika
- Bez wymaganych budynków NASTĘPNA ERA pisze, czego brakuje

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Zasady er

#### Automated

- [ ] 1.1 Testy przechodzą: `node tests/run-tests.js`

### Phase 2: Panel, przycisk i baner

#### Automated

- [ ] 2.1 Testy przechodzą: `node tests/run-tests.js`
- [ ] 2.2 Zrzuty ekranu (Edge headless): panel w erze 1 i 3, koszary w erze 4 (8 jednostek), baner po zmianie ery

#### Manual

- [ ] 2.3 Na start można budować tylko koszary; po zbudowaniu koszar NASTĘPNA ERA przenosi do ery feudalnej i kończy turę
- [ ] 2.4 W erze feudalnej da się zbudować strzelnicę i zrobić łucznika
- [ ] 2.5 Bez wymaganych budynków NASTĘPNA ERA pisze, czego brakuje
