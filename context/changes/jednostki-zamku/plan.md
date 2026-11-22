# Jednostki specjalne z zamku – plan implementacji

## Overview
Zasady: `context/foundation/zasady-gry.md` → „Kolory (kraje)” → „Jak działają jednostki z zamku” (2026-11-22).
Zamek robi jednostki swojego kraju (19 typów + 6 ulepszonych wersji), z długiem jak przy budowie zamku.

## What We're NOT Doing
- Mnich, magnonella, strzelnica prochowa + armata (kawałek 3); X-y krajów (kawałek 4); bot nie używa zamku.

## Phase 1: Zasady i dane
- `data.js`: nowe jednostki (`building: "zamek"`, `countries: [...]`, `group`), `SHAPE_MAMMOTH`, ulepszenia
  (`where: "uniwersytet"`; paladyn → ulepszony paladyn `where: "zamek"`, `countries: ["zielony"]`).
- `rules.js`: kraj w `isUnitAvailable`; zamek w budowie nie rekrutuje; dług jednostki z zamku (płaci w `endTurn`);
  `getUpgradeOptions` z `where` i krajem; grupa jednostki (`unitGroup`) w Płonącym grocie i Sparingu.
- Testy.
### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`

## Phase 2: Rysunki i panel
- `drawings.js`: rysunki nowych jednostek wg zeszytu; `game.js`: dług jednostki w panelu.
### Success Criteria:
#### Automated Verification:
- Testy przechodzą: `node tests/run-tests.js`
- Zrzut ekranu: galeria jednostek z zamku i menu zamku granatowego
#### Manual Verification:
- Zamek robi jednostki swojego kraju; mamut z długiem; ulepszenia w uniwersytecie
- Rysunki wyglądają jak w zeszycie

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Zasady i dane

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js`

### Phase 2: Rysunki i panel

#### Automated

- [ ] 2.1 Testy przechodzą: `node tests/run-tests.js`
- [ ] 2.2 Zrzut ekranu: galeria jednostek z zamku i menu zamku granatowego

#### Manual

- [ ] 2.3 Zamek robi jednostki swojego kraju; mamut z długiem; ulepszenia w uniwersytecie
- [ ] 2.4 Rysunki wyglądają jak w zeszycie
