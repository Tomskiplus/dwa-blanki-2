# Tryb 1 VS BOT – Plan Brief

> Full plan: `context/changes/gra-z-botem/plan.md`

## What & Why

Ożywiamy przycisk **1 VS BOT**: gracz gra przeciwko prostemu botowi, więc może grać sam, gdy nikogo
nie ma online. Bot gra uczciwie – tymi samymi zasadami z `rules.js` co gracz.

## Starting Point

Przycisk „1 VS BOT” pokazuje tylko „wkrótce!”. Zasady gry są oddzielone od rysowania (`rules.js`),
a tryb online ma już „turę przeciwnika” (`isMyTurn`), której bot może użyć.

## Desired End State

Gracz wybiera swój kraj, kraj bota, tryb bota i planszę, klika START i gra. Po jego turze bot robi
akcje co 0,5 s (widać je na planszy), potem wraca „TWOJA TURA”. Koniec: „WYGRAŁEŚ!” albo „BOT WYGRAŁ”.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Siła bota | Prosty: koszary + piechurzy/włócznicy, era mroku | Najpierw działający bot, potem ulepszenia. |
| Liczba botów | 1 vs 1 | Pasuje do przycisku i łatwo sprawdzić. |
| Tryby | Ofensywny (atak od 4 wojaków) i defensywny (walczy, gdy wróg ≤ 6 pól od bazy) | Pomysł Tomka – dwa charaktery bota. |
| Kto wybiera tryb | Gracz, na ekranie ustawień | Wiadomo, z kim się gra. |
| Cel ataku | Najsłabszy (najmniej życia); remis → jednostka przed budynkiem | Wybór Tomka; remis rozstrzygamy na korzyść jednostek, bo one decydują o wygranej. |
| Kto zaczyna | Zawsze gracz (lewy górny róg) | Od razu grasz. |
| Tura bota | Krok po kroku, co 0,5 s | Widać, co robi, łatwiej szukać błędów. |
| Tajne kody | Wyłączone w grze z botem | Uczciwa gra (i bot nie dostanie żaby w swojej turze). |
| Ustawienia | Osobny ekran: kraje, tryb, plansza | Jak EDYTOR, ale dla 2 graczy. |

## Scope

**In scope:** `bot.js` (mózg bota), testy bota w node (też mecze bot kontra bot), ekran ustawień,
tura bota w grze, blokady w turze bota, podświetlenie akcji bota, ekran końca, README.

**Out of scope:** ery/ulepszenia/badania/mury dla bota, oddziały z ramki u bota, poziomy trudności,
kilka botów, bot online, tajne kody w grze z botem.

## Architecture / Approach

`bot.js` nic nie rysuje: `getBotStep(game, mode)` zwraca **jedną** następną akcję (atak → ruch →
budowa → rekrutacja → koniec tury), `doBotStep(game, step)` wykonuje ją funkcjami z `rules.js`.
`game.js` woła to co 0,5 s w turze bota; testy – w pętli bez czekania. Bezpiecznik: max 60 kroków na turę.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Mózg bota + testy | `bot.js` i testy (też cały mecz bot kontra bot) | Bot „utknie” albo wybierze złą akcję – łapią to testy i bezpiecznik |
| 2. Ekran i tura bota | Grywalny tryb 1 VS BOT w przeglądarce | Kliknięcia/kody w turze bota zmienią stan bota |
| 3. Szlif | Podświetlenie akcji bota, „WYGRAŁEŚ!/BOT WYGRAŁ”, README | Mały – tylko wygląd i napisy |

**Prerequisites:** brak (nic nowego do instalowania, żadnych kont).
**Estimated effort:** ~3 sesje, po jednej na fazę.

## Open Risks & Assumptions

- Prosty bot w erze mroku będzie słabszy od gracza, który przejdzie do ery feudalnej – świadomie, na później.
- Ofensywny bot bez pamięci: gdy armia spadnie poniżej 4, ocaleli przestają iść naprzód (czekają na posiłki).
- Liczby 4 / 6 / 0,5 s są zgadnięte – do dostrojenia po pierwszych grach.

## Success Criteria (Summary)

- Da się zagrać pełną grę 1 VS BOT w obu trybach, a bot robi tylko dozwolone ruchy.
- Testy w node (z meczem bot kontra bot) są zielone.
- W turze bota widać, co robi, a gracz nie może mu „przeszkodzić”.
