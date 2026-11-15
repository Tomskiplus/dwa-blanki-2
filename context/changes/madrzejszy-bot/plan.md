# Mądrzejszy bot – ery, ulepszenia i badania – plan

## Overview

Bot z gry 1 VS BOT ma przechodzić przez ery od 1 do 4, tak jak gracz, i korzystać z tego, co one dają:
- nowe budynki: strzelnica, wieże, mury, zamek, stajnia, uniwersytet,
- nowe jednostki,
- ulepszenia i badania.

Dziś bot stawia tylko koszary i robi piechurów, bo era 1 nic więcej nie daje. W dłuższej grze robi się przez to nudno.

Bot nadal gra uczciwie. Każdą akcję wykonuje przez funkcje z `rules.js` (`placeBuilding`, `placeUnit`, `moveSquad`, `buyUpgrade`, `buyResearch`, `advanceEra`).

## Current State Analysis

**Bot (`bot.js`):**
- Działa krok po kroku: `getBotStep(game, mode)` wybiera jedną akcję, a `doBotStep(game, step)` ją wykonuje.
- Kolejność akcji: atak → ruch wojska → koszary (tylko gdy ich nie ma) → rekrutacja (najdroższa jednostka) → koniec tury.
- Chłopi nigdy się nie ruszają (`getBotArmy` ich pomija).
- `findSpot` szuka miejsca w promieniu `BOT_SEARCH_MARGIN` = 5 i wybiera miejsce **najbliżej wroga**.
- `describeBotStep` i `getBotStepObjectId` opisują krok (napis i ramka w `game.js`).

**Ery (`rules.js:786-820`):**
- `canAdvanceEra` wymaga **wszystkich** budynków z `canBuild` z obecnej ery:
  - era 1: koszary, dom, palisada, brama drewniana (razem 18 pól/punktów),
  - era 2: strzelnica, wieża drewniana, mur, brama kamienna (13),
  - era 3: stajnia, wieża z kamienia, zamek (18, zamek buduje się 2 tury, a dług spłaca `endTurn`).
- `advanceEra` **kończy turę**.
- W erze 4 (`MAX_ERA`) nie ma już kolejnej ery. W erze 4 da się zbudować ratusz i uniwersytet.

**Miejsce na budynki:**
- Budynek musi dotykać chłopa (`canPlaceBuilding`). Palisada i mur mogą też dotykać swojego muru.
- Symulacja (skrypt w scratchpadzie) pokazała, że przy 2 nieruchomych chłopach bot na planszy małej i średniej mieści wszystko z ery 1 oraz wieżę i mur z ery 2. **Strzelnicy, bramy kamiennej ani nic z ery 3 już nie zmieści.** Bez nowego chłopa bot utknąłby w erze 2.

**Jednostki i ulepszenia (`data.js`):**
- Lepsze wersje to ulepszenia za `UPGRADE_COST` = 4 (`buyUpgrade`). Ulepszenie zmienia wszystkie jednostki danego typu i leczy je.
- Jednostkę z ulepszenia można robić dopiero po kupieniu ulepszenia (`isCurrentTier`).
- Bez ulepszeń dostępne są:
  - w erze 2: łucznik i oszczepnik (strzelnica), wojownik orłów (koszary),
  - w erze 3: słoń (strzelnica), kawaleria 1 i 2 (stajnia),
  - w erze 4: ułan (stajnia) i bombarda (uniwersytet, po Prochu).

**Badania:**
- Robi się je tylko w uniwersytecie (era 4). Każde kosztuje `RESEARCH_COST` = 4 (`buyResearch`).

**Testy:**
- `tests/run-tests.js` ma 304 testy. Sekcja BOT ma `playBotTurn` i `playMatch`.
- Raport `movedPeasant` sprawdza dziś, że **żaden** chłop się nie ruszył.

## Desired End State

W grze 1 VS BOT bot w obu trybach:
1. Najpierw ma co najmniej **4 wojaków**. Potem stawia brakujące budynki do następnej ery.
2. Gdy obok jego chłopów nie ma już miejsca, robi w ratuszu **jednego chłopa-budowniczego**. Budowniczy idzie w miejsce, gdzie zmieści się potrzebny budynek, i tam buduje. Dwaj chłopi ze startu nigdy się nie ruszają.
3. Obronę (wieże, mury, palisady, bramy, zamek, czyli `group: "obrona"`) stawia **od strony wroga**. Resztę (dom, strzelnicę, stajnię, uniwersytet) stawia **z dala od wroga**.
4. Gdy ma wszystkie budynki ery, najpierw wydaje resztę punktów na wojsko, a potem **wchodzi do następnej ery**. Ty widzisz na banerze „⭐ Niebieski przechodzi do ery feudalnej!”.
5. Ulepsza jednostkę, gdy ma **co najmniej 6** jednostek tego typu i 4 punkty.
6. Wojsko robi najpierw w **najnowszym budynku**, czyli tym z najwyższej ery: uniwersytet → stajnia → strzelnica → koszary.
7. W erze 4 stawia uniwersytet i bada:
   - **Proch** zawsze, jako pierwszy,
   - resztę, gdy ma co najmniej 4 jednostki lub budynki, którym badanie pomoże.

   Potem robi bombardy.

Sprawdzenie: testy w `node tests/run-tests.js` oraz gra w Live Preview, w której widać bota w kolejnych erach.

### Key Discoveries:

- `rules.js:786-808`: `getEraRequirements` i `canAdvanceEra`. `missing` daje gotową listę brakujących budynków.
- `rules.js:812-820`: `advanceEra` woła `endTurn`. W bocie to krok, który kończy turę, tak samo jak `endTurn`.
- `rules.js:240-251`: budynek musi dotykać chłopa (`distance === 1`), a mur i palisada mogą też dotykać muru.
- `rules.js:299-313`: `isUnitAvailable` i `getRecruitOptions` już pilnują ery, ulepszeń i badań. Bot nie musi tego liczyć sam.
- `rules.js:880-919`: `getUpgradeOptions(game, building)` i `buyUpgrade(game, building, fromKey)`.
- `rules.js:967-1003`: `getResearchOptions(game, building)` i `buyResearch(game, building, key)`.
- `rules.js:466-469`: `endTurn` sam spłaca dług zamku, więc bot nie musi tego robić.
- `game.js:937-950`: `goToNextEra` ustawia `turnBannerNote` z `ERA_GENITIVE` (`data.js:17`). Bot ma robić to samo.
- `game.js` `runBotStep`: dziś specjalnie traktuje tylko `step.type === "endTurn"` (baner, czyszczenie). Krok `advanceEra` musi kończyć turę tak samo.

## What We're NOT Doing

- Bot nie stawia drugiego ratusza (era 4).
- Nie ma poziomów trudności. Tryby ofensywny i defensywny zostają jak są: zmienia się rozwój bazy, a nie zasady ataku i obrony.
- Bot nie przesuwa dwóch chłopów ze startu. Ma najwyżej **1** chłopa-budowniczego naraz. Gdy ten zginie, robi nowego.
- Bot nie kupuje ulepszenia chłopa. Do tego trzeba 6 chłopów, a bot ich tyle nie ma.
- Bot nie „oszczędza” punktów na następną turę, bo punkty i tak się nie przenoszą.
- Mordownia: bot zbada ją tylko przy 4 wieżach lub zamkach, a stawia po jednej z każdego, więc w praktyce nie zbada jej nigdy. Tak wynika z zasady „min. 4”.
- Bez zmian w EDYTORZE i w grze przez internet.

## Implementation Approach

Rozbudowujemy `bot.js` o nowe „szukacze kroków”. Każdy zwraca akcję albo `null`, jak dotychczasowe. Nowa kolejność w `getBotStep`:

1. **atak** (bez zmian),
2. **ruch wojska** (bez zmian),
3. **ruch budowniczego** w stronę placu budowy,
4. **wojsko, gdy jest mniej niż 4 wojaków** (`BOT_MIN_ARMY`),
5. **budynek do ery**: brakujący budynek z `canAdvanceEra(...).missing`; w erze 4 uniwersytet. Gdy obok chłopów nie ma miejsca, bot zamiast tego **robi budowniczego**, jeśli go jeszcze nie ma,
6. **ulepszenie** (min. 6 jednostek danego typu),
7. **badanie** (Proch zawsze, reszta przy min. 4 jednostkach lub budynkach, którym pomoże),
8. **wojsko za resztę punktów**,
9. **wejście w erę**, gdy wszystkie budynki stoją; w przeciwnym razie **koniec tury**.

Każda faza dokłada kilka kroków, testy w node i ręczne sprawdzenie w grze.

## Critical Implementation Details

- **Budowniczy nie może wejść na plac budowy.** Cel ruchu to kratki przyszłego budynku. Ruch, po którym budowniczy stanąłby na tych kratkach (odległość 0), trzeba odrzucić. Budowniczy ma skończyć **obok** placu (odległość 1), bo dopiero wtedy `canPlaceBuilding` pozwoli budować.
- **Plac budowy liczymy od nowa w każdym kroku.** Bot nie ma pamięci, a plac zależy od planszy. Wybór musi być deterministyczny (ta sama plansza = ten sam plac), żeby budowniczy nie kręcił się w kółko.
- **Krok `advanceEra` kończy turę.** W `runBotStep` (`game.js`) i w `playBotTurn` (testy) musi działać jak `endTurn`: baner „TWOJA TURA”, zerowanie licznika kroków. Do tego `turnBannerNote` z nazwą ery. Kolor gracza zapamiętujemy **przed** krokiem, bo `advanceEra` zmienia `game.current`.
- **Raport „chłopi w domu” w testach.** `movedPeasant` ma od teraz liczyć tylko **dwóch chłopów ze startu** (dwa najmniejsze numery chłopów bota). Budowniczy może chodzić.

## Phase 1: Bot idzie przez ery (budynki, budowniczy, wejście w erę)

### Overview

Bot stawia brakujące budynki ery i w razie potrzeby robi chłopa-budowniczego, który idzie budować dalej. Obronę stawia z przodu, resztę z tyłu, a gdy ma komplet, wchodzi do następnej ery. W erze 4 stawia uniwersytet. Ulepszenia, badania i wybór jednostek z najnowszego budynku przyjdą w fazach 2 i 3; w tej fazie bot robi wojsko jak dotąd.

### Changes Required:

#### 1. Budynki do ery i ich miejsce

**File**: `bot.js`

**Intent**: Zastąpić „tylko koszary” wyborem budynku, którego brakuje do następnej ery: koszary zawsze pierwsze, potem w kolejności z `missing`. W erze 4 jest to uniwersytet. Obrona trafia od strony wroga, reszta z dala od niego.

**Contract**:
- Nowa stała `BOT_MIN_ARMY = 4`.
- `getBotBuildGoals(game)` zwraca listę kluczy budynków do postawienia (pusta = nic):
  - w erach 1-3: `canAdvanceEra(game).missing`,
  - w erze 4: `["uniwersytet"]`, jeśli go nie ma.

  Kolejność: koszary pierwsze, potem obrona, potem reszta. Najpierw tanie i potrzebne, ale ważne tylko, żeby kolejność była stała.
- `findSpot` dostaje rodzaj oceny miejsca: „blisko wroga” (obrona) albo „daleko od wroga” (reszta).
- `findBuildStep(game)` próbuje każdy budynek z celów i zwraca `{type:"build", ...}` dla pierwszego, na który są punkty i miejsce obok chłopa.
- Zamek (`buildTurns`) liczymy jak w `canPlaceBuilding`: wystarczy 1 punkt, ale tylko gdy nie ma niedokończonej budowy.

#### 2. Chłop-budowniczy

**File**: `bot.js`

**Intent**: Gdy budynek z celów nie mieści się obok żadnego chłopa, bot robi jednego dodatkowego chłopa w ratuszu (1 punkt). Ten chłop idzie za darmowe kroki w stronę placu budowy, który sam wybiera w pobliżu bazy.

**Contract**:
- `getBotBuilder(game)` zwraca chłopa bota, który nie jest jednym z dwóch najstarszych (najmniejsze `id`), albo `null`.
- `findBuildSite(game, key)` zwraca kratki wolnego miejsca na budynek w pobliżu ratusza.
  - Ocena miejsca jak w punkcie 1 (przód albo tył).
  - **Nie sprawdza** dotykania chłopa, tylko to, czy kratki są na planszy i wolne.
  - Bierze pierwszy budynek z `getBotBuildGoals`, który nie zmieścił się obok chłopów.
- Nowy krok `findBuilderMoveStep(game)`: budowniczy (nie `isNew`, z darmowymi krokami) idzie bliżej placu budowy. Ruch, po którym stanąłby na kratkach placu, jest odrzucany.
- `findBuildStep` zwraca rekrutację budowniczego `{type:"recruit", key:"chlop", buildingId: ratusz, ...}`, gdy trzeba budować, nie ma miejsca i nie ma budowniczego.
- Dwaj chłopi ze startu nadal nigdy się nie ruszają.

#### 3. Kolejność kroków i wejście w erę

**File**: `bot.js`

**Intent**: `getBotStep` używa nowej kolejności z „Implementation Approach”, w wersji dla tej fazy, czyli bez ulepszeń i badań. Gdy wszystkie budynki ery stoją i nie ma już nic do zrobienia, bot zamiast `endTurn` wchodzi do następnej ery.

**Contract**:
- Nowy krok `{type:"advanceEra"}`. `doBotStep` woła `advanceEra(game)`.
- `getBotStep` kończy się tak: `canAdvanceEra(game).ok ? {type:"advanceEra"} : {type:"endTurn"}`.
- Wojsko przed budynkami tylko wtedy, gdy `getBotArmy(game).length < BOT_MIN_ARMY`.
- `describeBotStep` dla `advanceEra` zwraca np. „Bot przechodzi do ery feudalnej!” (`ERA_GENITIVE` nowej ery).
- `getBotStepObjectId` dla `advanceEra` zwraca `null`.

#### 4. Tura bota w grze

**File**: `game.js`

**Intent**: Krok `advanceEra` kończy turę bota tak samo jak `endTurn`. Twój baner pokazuje informację o nowej erze bota.

**Contract**:
- W `runBotStep` warunek „bot skończył” obejmuje `endTurn` i `advanceEra`.
- Przy `advanceEra` ustawiamy `turnBannerNote = <kolor bota> + " przechodzi do " + ERA_GENITIVE[era] + "!"`. Kolor zapamiętujemy przed krokiem.

#### 5. Testy

**File**: `tests/run-tests.js`

**Intent**: Sprawdzić budynki ery, budowniczego, miejsca budynków i wejście w erę.

**Contract**:
- `playBotTurn` traktuje `advanceEra` jak koniec tury (warunek `game.current !== botPlayer` już to łapie). `movedPeasant` liczy tylko dwóch chłopów ze startu.
- Nowe testy:
  - Z 4 wojakami i 8 punktami w erze 1 bot stawia budynek z listy ery, a nie piechura.
  - Z 3 wojakami bot najpierw robi wojaka.
  - Wieża lub mur stoi bliżej wroga niż ratusz bota. Dom lub strzelnica stoi dalej od wroga niż ratusz bota.
  - Gdy obok chłopów brakuje miejsca, bot robi dokładnie 1 budowniczego, ten idzie, a potem stawia budynek.
  - Gdy wszystkie budynki ery stoją, ostatnim krokiem tury jest `advanceEra` i era bota rośnie o 1.
  - Opis kroku: „Bot przechodzi do ery feudalnej!”.
  - Mecz: bot 🛡️ kontra gracz, który nic nie robi, na małej planszy.
    - Bot dochodzi do ery 4 w rozsądnej liczbie tur. Dokładną granicę ustalimy po pomiarze, z zapasem.
    - Każdy krok jest dozwolony, bez bezpiecznika i bez punktów wydanych na ruch.
    - Chłopi ze startu zostają w domu.
- Dotychczasowe testy dalej przechodzą: koszary w 1. turze, 4 piechurów w 2. turze, 3 piechurów i 1 włócznik za 7 punktów, mecze, wygrana z biernym graczem.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `node tests/run-tests.js`
- Test meczu: bot 🛡️ dochodzi do ery 4 i każdy krok jest dozwolony
- Testy trwają nie dłużej niż ok. 10 s

#### Manual Verification:

- W grze z botem (mała plansza, tryb defensywny) bot stawia dom, palisadę i bramę, a potem widzisz baner „⭐ … przechodzi do ery feudalnej!”
- Bot robi chłopa-budowniczego, który idzie i stawia strzelnicę za swoim ratuszem, a wieże i mury od twojej strony
- Gra przez internet i EDYTOR działają jak dawniej

**Implementation Note**: Po fazie pauza na ręczne sprawdzenie, potem commit `/zapisz-postep`.

---

## Phase 2: Nowe wojsko i ulepszenia

### Overview

Bot robi wojsko najpierw w budynku z najnowszej ery i kupuje ulepszenie, gdy ma co najmniej 6 jednostek danego typu.

### Changes Required:

#### 1. Wojsko z najnowszego budynku

**File**: `bot.js`

**Intent**: `findRecruitStep` przegląda budynki bota od najwyższej ery typu budynku (`BUILDING_TYPES[type].era`), przy remisie od najstarszego. W każdym budynku zostaje dotychczasowa zasada: najdroższa jednostka, na którą go stać. Ratusz robi tylko budowniczego, więc nie robi tu wojska.

**Contract**: kolejność budynków w `findRecruitStep`: era typu malejąco, potem `id` rosnąco. `getBotRecruitChoices` bez zmian.

#### 2. Ulepszenia

**File**: `bot.js`

**Intent**: Nowy krok `findUpgradeStep(game)`. Gdy bot ma co najmniej `BOT_UPGRADE_MIN = 6` jednostek typu `from` i co najmniej `UPGRADE_COST` punktów, kupuje ulepszenie w budynku, który robi tę jednostkę.

**Contract**:
- Krok `{type:"upgrade", buildingId, fromKey}`. `doBotStep` woła `buyUpgrade`.
- W `getBotStep` ulepszenie stoi **po** budynkach do ery, a **przed** wojskiem za resztę punktów.
- Gdy kilka ulepszeń jest możliwych, wygrywa to z największą liczbą jednostek, a przy remisie pierwsze z listy `UPGRADES`.
- `describeBotStep`: „Bot ulepsza: Piechur → Piechur ulepszony”.
- `getBotStepObjectId`: budynek, w którym bot kupił ulepszenie.

#### 3. Testy

**File**: `tests/run-tests.js`

**Contract**:
- W erze 2 z koszarami i strzelnicą bot robi najpierw łucznika lub oszczepnika, a koszary pracują dopiero, gdy przy strzelnicy nie ma miejsca albo punktów.
- 6 piechurów i 4 punkty: bot kupuje ulepszenie, piechurzy stają się „piechurami ulepszonymi”.
- 5 piechurów: bot nie kupuje ulepszenia.
- Ulepszenie dopiero po budynkach do ery: gdy brakuje budynku ery i są na niego punkty, bot najpierw go stawia.
- Opis: „Bot ulepsza: Piechur → Piechur ulepszony”.
- Mecz 🛡️ kontra bierny gracz dalej: każdy krok dozwolony, era 4.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `node tests/run-tests.js`

#### Manual Verification:

- W erze 2 bot robi łuczników lub oszczepników ze strzelnicy, a później kawalerię ze stajni
- Gdy bot ma 6 piechurów, widać napis „Bot ulepsza: …”, a jego piechurzy rosną

**Implementation Note**: Po fazie pauza na ręczne sprawdzenie, potem commit `/zapisz-postep`.

---

## Phase 3: Era 4 – badania i bombardy

### Overview

W erze 4 bot ma uniwersytet (z fazy 1). Bada Proch, potem robi bombardy. Inne badania bada, gdy ma co najmniej 4 jednostki lub budynki, którym badanie pomoże.

### Changes Required:

#### 1. Badania

**File**: `bot.js`

**Intent**: Nowy krok `findResearchStep(game)`, w kolejności: najpierw Proch, potem reszta według listy `RESEARCH`. Badanie jest możliwe, gdy bot ma uniwersytet (nie w budowie), co najmniej `RESEARCH_COST` punktów i odpowiednią liczbę „zyskujących”.

**Contract**:
- `BOT_RESEARCH_MIN = 4`.
- Kto zyskuje na badaniu (liczymy obiekty bota):
  - `proch`: zawsze (próg 0),
  - `wypalanie`: budynki,
  - `plonacyGrot`: jednostki ze strzelnicy,
  - `mordownia`: wieże i zamek (budynki z `attack`),
  - `pancerzLuskowy`: całe wojsko (bez chłopów),
  - `szarza`: kawaleria (`cavalry`),
  - `sparing`: jednostki z koszar.
- Krok `{type:"research", buildingId, key}`. `doBotStep` woła `buyResearch`.
- W `getBotStep` badanie stoi **po** ulepszeniach i **przed** wojskiem za resztę punktów.
- `describeBotStep`: „Bot bada: Proch”.
- `getBotStepObjectId`: uniwersytet.

#### 2. Dokumentacja

**Files**: `README.md`, `context/foundation/do-zrobienia.md`

**Intent**:
- README, sekcja „Gra z botem”: bot przechodzi przez ery, ma budowniczego, kupuje ulepszenia przy 6 jednostkach i robi badania przy 4.
- `do-zrobienia.md`: odhaczyć pomysły „bot przechodzi do kolejnych er…” i „bot stawia inne budynki…”.

#### 3. Testy

**File**: `tests/run-tests.js`

**Contract**:
- Era 4 z uniwersytetem i 4 punktami: pierwsze badanie to Proch. Potem uniwersytet robi bombardę, bo to najnowszy budynek.
- 3 jednostki z koszar: bez Sparingu. 4 jednostki: Sparing jest badany (gdy nie ma ważniejszych badań).
- Opis: „Bot bada: Proch”.
- Mecz 🛡️ kontra bierny gracz: bot dochodzi do ery 4, bada Proch i robi co najmniej 1 bombardę. Każdy krok dozwolony.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `node tests/run-tests.js`
- Test meczu: bot bada Proch i robi bombardę

#### Manual Verification:

- W długiej grze z defensywnym botem widać uniwersytet, napis „Bot bada: Proch” i bombardy bota
- README opisuje nowego bota

**Implementation Note**: Po fazie pauza na ręczne sprawdzenie, potem commit `/zapisz-postep`.

---

## Testing Strategy

### Unit Tests:

- Budynki ery:
  - kolejność (najpierw wojsko do 4, potem budynki),
  - miejsce (obrona z przodu, reszta z tyłu),
  - zamek na 2 tury.
- Budowniczy: tylko 1, tylko gdy brakuje miejsca, nie wchodzi na plac budowy. Chłopi ze startu stoją.
- Wejście w erę jako ostatni krok tury.
- Ulepszenia: próg 6 (5 = nie, 6 = tak).
- Badania: Proch pierwszy, próg 4 (3 = nie, 4 = tak).
- Wojsko z najnowszego budynku.

### Integration Tests:

- Mecz bot 🛡️ kontra bierny gracz na małej planszy:
  - era 4, Proch, bombarda,
  - każdy krok dozwolony, bez bezpiecznika i bez punktów na ruch,
  - chłopi ze startu w domu.
- Dotychczasowe mecze (⚔️ kontra 🛡️, ⚔️ kontra ⚔️, ⚔️ kontra bierny gracz) dalej uczciwe.

### Manual Testing Steps:

1. 1 VS BOT, mała plansza, tryb defensywny. Graj spokojnie, nie podchodź do bazy bota, i obserwuj kolejne ery bota.
2. Sprawdź, czy wieże i mury bota stoją od twojej strony, a strzelnica i dom za jego ratuszem.
3. Zobacz chłopa-budowniczego: idzie i buduje.
4. Gdy bot ma 6 jednostek jednego typu, sprawdź, czy je ulepsza.
5. W erze 4 sprawdź uniwersytet, „Bot bada: Proch” i bombardy.
6. Zagraj też z ofensywnym botem, czy dalej atakuje.

## Performance Considerations

- Defensywny bot trzyma całe wojsko w bazie, więc obiektów jest więcej. Wcześniej przy 70+ jednostkach testy zwalniały (pathfinding w `rules.js`).
- Wojsko pojawia się tylko obok budynków, więc liczba jednostek jest ograniczona. Mimo to długi mecz trzeba zmierzyć. Gdy będzie wolny, skracamy go albo używamy `getTakenCells` w nowych funkcjach.
- `findBuildSite` przeszukuje okolicę ratusza tak samo jak `findSpot`: szybkie odrzucanie po zbiorze zajętych kratek, potem zasady.

## Open Risks

- **Zatkana baza.** Wojsko może obstawić ratusz tak, że nie ma miejsca na budowniczego. Wtedy bot nie przejdzie dalej (to nie błąd, tylko wolniejszy rozwój). Test meczu pokaże, czy tak się dzieje. W razie potrzeby wojsko może stawać „od strony wroga”, z dala od ratusza (już tak robi `findSpot`).
- **Budowniczy daleko od bazy** może zginąć. Wtedy bot robi nowego, co jest zgodne z decyzją.

## References

- Poprzednia zmiana: `context/changes/gra-z-botem/plan.md` (bot w erze 1)
- Zasady er: `rules.js:783-820`, ulepszenia: `rules.js:855-919`, badania: `rules.js:963-1003`
- Dane: `data.js:35-164` (budynki), `data.js:189-276` (jednostki, ulepszenia, badania)
- Tura bota w grze: `game.js` `runBotStep`, `goToNextEra` (`game.js:937-950`)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Bot idzie przez ery (budynki, budowniczy, wejście w erę)

#### Automated

- [x] 1.1 Testy przechodzą: `node tests/run-tests.js` — b11c617
- [x] 1.2 Test meczu: bot 🛡️ dochodzi do ery 4 i każdy krok jest dozwolony — b11c617
- [x] 1.3 Testy trwają nie dłużej niż ok. 10 s — b11c617

#### Manual

- [x] 1.4 Bot stawia budynki ery 1 i widać baner „⭐ … przechodzi do ery feudalnej!” — b11c617
- [x] 1.5 Budowniczy idzie i stawia strzelnicę z tyłu; wieże i mury od strony gracza — b11c617
- [ ] 1.6 Gra przez internet i EDYTOR działają jak dawniej

### Phase 2: Nowe wojsko i ulepszenia

#### Automated

- [ ] 2.1 Testy przechodzą: `node tests/run-tests.js`

#### Manual

- [ ] 2.2 Bot robi wojsko ze strzelnicy, a później ze stajni
- [ ] 2.3 Przy 6 jednostkach widać „Bot ulepsza: …”

### Phase 3: Era 4 – badania i bombardy

#### Automated

- [ ] 3.1 Testy przechodzą: `node tests/run-tests.js`
- [ ] 3.2 Test meczu: bot bada Proch i robi bombardę

#### Manual

- [ ] 3.3 W długiej grze widać uniwersytet, „Bot bada: Proch” i bombardy
- [ ] 3.4 README opisuje nowego bota
