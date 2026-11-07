# Ulepszenia, uniwersytet i bombarda – plan implementacji

## Overview
Zasady gry: `context/foundation/zasady-gry.md` → „Ulepszenia i badania” (wszystko ustalone z autorem gry).
Ten plan opisuje tylko, JAK to zbudować w kodzie.

## Current State Analysis
- Lepsze wersje jednostek to dziś osobne typy w `UNIT_TYPES` rekrutowane od swojej ery (`getRecruitOptions`).
- Gracz ma tylko `era`; brak stanu ulepszeń/badań.
- Atak: `hasAttacked` (1 atak na turę); budowle strzelają też do sąsiadów (do zmiany – Mordownia).
- Życie liczone przy tworzeniu (`addUnit`, `addBuilding`).

## Technical Approach
- **Dane** (`data.js`): `UPGRADE_COST = 4`, `RESEARCH_COST = 4`; lista `UPGRADES` (`from → to`, opcjonalnie
  `grow: [dx, dy]` – przesunięcie starego kształtu w nowym, np. piechur `[0, 1]` = nowe pole z przodu);
  nowe jednostki `chlopUlepszony` (ratusz, era 2, 3/1/1) i `bombarda` (uniwersytet, era 4, `needsResearch: "proch"`,
  `bonusVsBuildings: 4`); budynek `uniwersytet` (1×4, era 4); `RESEARCH` (7 badań z opisami).
- **Stan gracza**: `player.upgraded = {}` (np. `{ wlocznik: true }`), `player.research = {}`.
- **Zasady** (`rules.js`):
  - `getRecruitOptions` – tylko „aktualny stopień” (np. po ulepszeniu włócznika – pikinier), bombarda po Prochu.
  - `getUpgradeOptions(game, building)`, `buyUpgrade(...)` – zmienia typ wszystkich jednostek gracza,
    leczy do pełna, próbuje urosnąć (`tryGrow`); gdy brak miejsca – `unit.shapeType` zostaje stary,
    a rośnięcie jest ponawiane po ruchu i na początku tury.
  - `getResearchOptions`, `buyResearch(...)` – efekty liczone funkcjami: `unitMaxHp`, `buildingMaxHp`,
    `movePointsFor`, `maxAttacks`, bonusy w `getDamage`, Mordownia w `getAttackTargets`/`canAttack`;
    badania z życiem leczą do pełna.
  - Atak: licznik `attacksUsed` (Szarża = 2 ataki kawalerii); `hasAttacked` = wykorzystane wszystkie ataki.
- **Interfejs** (`game.js`, `drawings.js`): w budynku przyciski rekrutacji + „↑ ulepszenie (4)”; w uniwersytecie
  „Zbadaj: … (4)” z opisem po najechaniu; rysunki: chłop z kosą, bombarda; uniwersytet jako czerwone 4 pola.

## What We're NOT Doing
- Inne badania niż 7 z listy; jednostki specjalne zamku; mgła wojny; populacja.

## Phase 1: Ulepszenia jednostek
- Dane, stan gracza, rekrutacja „aktualnego stopnia”, kupowanie ulepszeń, rośnięcie, testy.
### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

## Phase 2: Uniwersytet, badania i bombarda
- Budynek, 7 badań z efektami, bombarda, Mordownia, Szarża, testy.
### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

## Phase 3: Interfejs i rysunki
- Przyciski ulepszeń i badań, opisy, rysunki (chłop z kosą, bombarda, uniwersytet).
### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzuty ekranu: koszary z ulepszeniami, uniwersytet z badaniami, bombarda, chłop z kosą
#### Manual Verification:
- Ulepszenie zmienia wszystkie jednostki (np. włócznicy → pikinierzy), piechur rośnie z przodu
- Badania działają (np. Pancerz łuskowy: 7 ruchu; Szarża: 2 ataki kawalerii; Mordownia)
- Po Prochu uniwersytet robi bombardy; bombarda mocno bije budynki

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Ulepszenia jednostek

#### Automated

- [ ] 1.1 Testy przechodzą: `node tests/run-tests.js`

### Phase 2: Uniwersytet, badania i bombarda

#### Automated

- [ ] 2.1 Testy przechodzą: `node tests/run-tests.js`

### Phase 3: Interfejs i rysunki

#### Automated

- [ ] 3.1 Testy przechodzą: `node tests/run-tests.js`
- [ ] 3.2 Zrzuty ekranu: koszary z ulepszeniami, uniwersytet z badaniami, bombarda, chłop z kosą

#### Manual

- [ ] 3.3 Ulepszenie zmienia wszystkie jednostki (np. włócznicy → pikinierzy), piechur rośnie z przodu
- [ ] 3.4 Badania działają (np. Pancerz łuskowy: 7 ruchu; Szarża: 2 ataki kawalerii; Mordownia)
- [ ] 3.5 Po Prochu uniwersytet robi bombardy; bombarda mocno bije budynki
