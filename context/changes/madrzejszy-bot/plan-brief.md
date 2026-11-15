# Mądrzejszy bot – plan w skrócie

> Pełny plan: `context/changes/madrzejszy-bot/plan.md`

## Co i dlaczego

Bot w grze 1 VS BOT ma przechodzić przez ery od 1 do 4, tak jak gracz. Ma też korzystać z nowych budynków, jednostek, ulepszeń i badań.

Dziś bot robi tylko koszary i piechurów, bo era 1 nic więcej nie daje. W dłuższej grze robi się przez to nudno.

## Punkt startu

Bot (`bot.js`) gra krok po kroku przez zasady z `rules.js`:
- atakuje,
- chodzi wojskiem,
- stawia koszary,
- robi najdroższą jednostkę, na którą go stać.

Jego chłopi stoją w miejscu. Symulacja pokazała, że bez nowego chłopa bot utknąłby w erze 2, bo zabraknie miejsca na strzelnicę.

## Stan docelowy

Bot przechodzi przez kolejne ery: stawia budynki ery i robi chłopa-budowniczego, gdy brakuje miejsca. Wieże i mury stawia od strony wroga, a resztę budynków z dala od niego. Ulepsza jednostki, a w erze 4 bada i robi bombardy.

Gracz widzi to na banerze, np. „⭐ Niebieski przechodzi do ery feudalnej!”, i w napisach w panelu.

## Najważniejsze decyzje

| Decyzja | Wybór | Dlaczego |
|---|---|---|
| Kiedy era | Najpierw 4 wojaków, potem budynki ery | Bot nie jest bezbronny |
| Brak miejsca | Nowy chłop-budowniczy (1 naraz), starzy chłopi w domu | Baza rośnie, a chłopi ze startu są bezpieczni |
| Ulepszenia | Gdy bot ma ≥ 6 jednostek danego typu | Decyzja Tomka: ulepszenie ma się opłacać |
| Wojsko | Najpierw z najnowszego budynku | Od razu widać, co dała nowa era |
| Ile er | Do ery 4, z badaniami i bombardą | Bot używa wszystkiego, co jest w grze |
| Badania | Proch zawsze; reszta przy ≥ 4 jednostkach/budynkach, którym pomoże | Decyzja Tomka, jak przy ulepszeniach |
| Kolejność wydawania | 4 wojaków → budynki ery → ulepszenia → badania → wojsko za resztę | Bot pewnie idzie przez ery |
| Miejsce budynków | Obrona z przodu, reszta z tyłu | Wygląda jak prawdziwa baza, a ważne budynki są bezpieczniejsze |
| Przed wejściem w erę | Najpierw reszta punktów na wojsko | Wejście w erę kończy turę, a punkty by przepadły |

## Zakres

**Robimy:**
- budynki ery 1–3 i uniwersytet,
- chłopa-budowniczego,
- wejście w erę z napisem na banerze,
- wojsko z najnowszego budynku,
- ulepszenia,
- badania i bombardy,
- testy,
- README.

**Nie robimy:**
- drugiego ratusza,
- poziomów trudności,
- zmian w trybach ataku i obrony,
- ulepszenia chłopa,
- zmian w EDYTORZE i w grze przez internet.

## Jak to działa

`getBotStep` dostaje nowe „szukacze kroków”. Każdy zwraca akcję albo `null`, a pierwszy, który coś zwróci, wygrywa. Kolejność:

atak → ruch wojska → ruch budowniczego → wojsko (gdy < 4) → budynek ery albo budowniczy → ulepszenie → badanie → wojsko za resztę → wejście w erę albo koniec tury.

Nowe kroki `advanceEra`, `upgrade` i `research` wykonuje `doBotStep` przez `advanceEra`, `buyUpgrade` i `buyResearch` z `rules.js`. `game.js` traktuje `advanceEra` jak koniec tury, z napisem o nowej erze.

## Fazy

| Faza | Co daje | Główne ryzyko |
|---|---|---|
| 1. Bot idzie przez ery | Budynki ery, budowniczy, przód/tył, wejście w erę | Zatkana baza: wojsko zasłania miejsce na budowniczego |
| 2. Nowe wojsko i ulepszenia | Jednostki z najnowszego budynku, ulepszenia przy 6 | Za mało miejsca przy nowych budynkach |
| 3. Era 4 | Badania przy 4, Proch, bombardy, README | Długi mecz w testach może być wolny |

**Wymagania:** zrobiona zmiana `gra-z-botem` (commity 3ce7db0…84d9a59).
**Ile pracy:** ok. 3 sesje, po jednej na fazę.

## Ryzyka

- Wojsko defensywnego bota może zatkać bazę. Wtedy bot rozwija się wolniej. Sprawdzi to test meczu.
- Budowniczy daleko od bazy może zginąć. Wtedy bot robi nowego.
- Więcej obiektów na planszy może spowolnić testy. Trzeba zmierzyć i ewentualnie skrócić mecz.

## Jak poznamy, że się udało

- W grze widać, jak bot wchodzi w kolejne ery, stawia wieże i mury od strony gracza i robi różne jednostki.
- Test: defensywny bot kontra bierny gracz dochodzi do ery 4, bada Proch i robi bombardę. Każdy krok jest dozwolony.
