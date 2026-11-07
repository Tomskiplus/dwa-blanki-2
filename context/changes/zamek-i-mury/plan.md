# Zamek, mury, bramy, wieże i dom – plan implementacji

## Overview
Nowe budowle z zeszytu: dom, palisada, mur, bramy, wieże, zamek i drugi ratusz (era 4).
Mury blokują drogę, bramy przepuszczają swoich, wieże i zamek strzelają, zamek buduje się 2 tury.

## Current State Analysis
- `BUILDING_TYPES` (`data.js`): ratusz, koszary, strzelnica, stajnia; HP = `BUILDING_HP_PER_CELL` × kratki.
- `canPlaceBuilding` (`rules.js`): budynek musi dotykać chłopa; koszt = liczba kratek.
- Ruch (`squadFitsAt`) blokuje każde zajęte pole; `getObjectAt` zwraca pierwszy obiekt z listy.
- Atak (`getAttackTargets`, `canAttack`, `attack`) działa tylko dla jednostek (`UNIT_TYPES`).
- Wymagania er: wszystkie budowalne budynki z ery gracza (`getEraRequirements`) – nowe budynki wejdą same.
- Panel: lista budynków to jedna kolumna przycisków co 46 px – 12 budynków się nie zmieści.

## Desired End State

| Budowla | Era | Kształt | Koszt | Życie/kratkę | Działanie |
|---|---|---|---|---|---|
| dom | 1 | 2×2 | 4 | 2 | nic (na razie) |
| palisada | 1 | 1 | 1 | 1 | blokuje; da się przedłużać |
| brama drewniana | 1 | 2×2 | 4 | 2 | swoi przechodzą, wrogowie nie |
| mur | 2 | 1 | 1 | 4 | blokuje; da się przedłużać |
| brama kamienna | 2 | 2×2 | 4 | 4 | jak drewniana |
| wieża drewniana | 2 | 1×3 | 3 | 2 | strzela: atak 1, zasięg 4 |
| wieża z kamienia | 3 | 1×2 | 2 | 4 | strzela: atak 2, zasięg 5 |
| zamek | 3 | 10 pól | 10 (2 tury) | 4 | strzela: atak 3, zasięg 6 |
| ratusz | 4 | 2×3 | 6 | 2 | robi chłopów (drugi ratusz) |

- Zamek: kształt `[[0,0],[2,0],[0..3,1],[0..3,2]]`. Stawiasz go, płacisz tyle punktów, ile masz (najwyżej 10);
  brakujące punkty zabiera początek twojej następnej tury i wtedy zamek jest gotowy.
  Niedokończony zamek nie strzela i nie liczy się do wymagań ery.
- Przedłużanie: palisada/mur może dotykać chłopa ALBO bokiem dotykać twojej palisady/muru.
  Po postawieniu kawałka tryb stawiania zostaje włączony (klik, klik, klik…).
- Wymagania er (wszystkie budynki ery): era 1→2: koszary, dom, palisada, brama drewniana;
  2→3: strzelnica, mur, brama kamienna, wieża drewniana; 3→4: stajnia, wieża z kamienia, zamek (gotowy).

## What We're NOT Doing
- Wieża zwiadowcza i mgła wojny, bombarda, port i woda, uniwersytet, populacja domów,
  jednostki specjalne zamku („menu kolorów”).

## Phase 1: Zasady budowli
**Files**: `data.js`, `rules.js`, `tests/run-tests.js`
- Dane: nowe typy z `era`, `hpPerCell`, `attack`/`range` (wieże, zamek), `wall: true` (palisada, mur),
  `gate: true` (bramy), `turnsToBuild` dla zamku; ratusz `canBuild: true`, `era: 4`.
- `canPlaceBuilding`: przedłużanie murów; zamek może kosztować więcej niż masz punktów (reszta = dług).
- `endTurn`: na początku tury właściciela spłaca dług zamku i kończy budowę; zdejmuje `hasAttacked` z jego budowli.
- Ruch: oddział może wejść na swoją bramę; `getObjectAt` woli jednostkę niż bramę pod nią.
- Atak: budowla z `attack` (gotowa) może strzelać raz na turę – te same funkcje co jednostki.
- Testy: rozmiary/koszty, przedłużanie muru, brama przepuszcza swoich i blokuje wrogów, wieża strzela raz,
  zamek: dług, gotowy w następnej turze, niedokończony nie liczy się do ery; wymagania ery 1.

### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

## Phase 2: Wygląd i panel
**Files**: `game.js` (i rysunki budowli)
- Rysunki: palisada (pale z ostrzami), mur (cegły), bramy (łuk z kratą), wieże (blanki), zamek (blanki + brama),
  dom (okno); niedokończony zamek półprzezroczysty z napisem „budowa”.
- Panel: dwie zakładki budynków – „BUDYNKI” (koszary, strzelnica, stajnia, dom, ratusz) i „OBRONA”
  (palisada, mur, bramy, wieże, zamek); pokazujemy tylko budowle z dostępnych er.
- Wieże i zamek: klik → czerwone ramki celów → klik celu = strzał.
- Mur/palisada: po postawieniu tryb stawiania zostaje.

### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzuty ekranu: zakładki, wszystkie budowle, strzał wieży, zamek w budowie

#### Manual Verification:
- Postawienie długiego muru jednym chłopem (klik, klik, klik)
- Brama przepuszcza moje jednostki, a wroga nie
- Wieża strzela raz na turę; zamek buduje się 2 tury i potem strzela

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Zasady budowli

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js` — cd465ce

### Phase 2: Wygląd i panel

#### Automated

- [x] 2.1 Testy przechodzą: `node tests/run-tests.js`
- [x] 2.2 Zrzuty ekranu: zakładki, wszystkie budowle, strzał wieży, zamek w budowie

#### Manual

- [x] 2.3 Postawienie długiego muru jednym chłopem (klik, klik, klik)
- [x] 2.4 Brama przepuszcza moje jednostki, a wroga nie
- [x] 2.5 Wieża strzela raz na turę; zamek buduje się 2 tury i potem strzela
