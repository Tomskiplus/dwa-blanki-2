# Podstawy rozgrywki – skrót planu

> Pełny plan: `context/changes/rozgrywka-podstawy/plan.md`
> Zasady gry: `context/foundation/zasady-gry.md`

## Co i po co

Zamieniamy sam ekran tytułowy w grywalną wersję DWA BLANKI II na jednym komputerze:
gracze siadają po kolei, budują, rekrutują, ruszają oddziałami i walczą, aż zostanie jeden.

## Punkt startowy

Jest tylko ekran tytułowy w `game.js` (tło w kratkę, ozdoby, 2 przyciski „wkrótce”). Brak logiki gry i testów.

## Efekt końcowy

Singleplayer → Edytor → wybór 2–8 graczy i rozmiaru planszy → pełna gra do zwycięstwa.
Zasady siedzą w osobnym pliku `rules.js` i są sprawdzane testami (`node tests/run-tests.js`).

## Najważniejsze decyzje

| Decyzja | Wybór | Dlaczego |
|---|---|---|
| Gdzie gra na 1 komputerze | Singleplayer → Edytor | decyzja autora gry |
| Koszary 9 kratek vs 8 punktów | +1 bonus tylko na koszary | tak działa „+1 na koszary” z zeszytu |
| Gdzie budować | budynek musi dotykać chłopa | chłop = budowniczy |
| Krok po skosie | 1 punkt | spójne z zasięgiem ataku |
| Życie budynków | 2 za kratkę | większy = twardszy |
| Chłop | 1/0/0 (ulepszenie 3/1/1 później) | decyzja autora gry |
| Jednostki | wszystkie w danych, każda z erą; teraz dostępna era 1 | ery dojdą później |
| Kolejność w turze | najpierw budowa, potem ruch | dopiero wtedy wiadomo, ile zostało na ruch |
| Oddziały | ustalane na początku ruchu, łączą się od następnej tury | prosto i uczciwie |
| Nowa jednostka | nie rusza się i nie atakuje w swojej pierwszej turze | „musi się przygotować” |
| Odpadanie | gracz bez jednostek odpada | zasada wygranej z zeszytu |

## Zakres

**Robimy:** menu, ustawienia, plansza, tury, budowanie, rekrutacja, ruch oddziałów, walka, wygrana, testy.

**Nie robimy teraz:** przechodzenie er, ulepszenia, zamek, mury/wieże, woda, bot, internet, prawdziwy edytor map.

## Budowa

`data.js` (liczby i kształty) → `rules.js` (zasady, bez rysowania) → `game.js` (ekrany, rysowanie, myszka).
Testy ładują `data.js` + `rules.js` w Node.

## Etapy

| Etap | Co daje | Ryzyko |
|---|---|---|
| 1. Menu i plansza | ekrany + plansza z ratuszami i chłopami | 8 graczy na małej planszy może być ciasno |
| 2. Tury i budowanie | punkty, budynki, jednostki, koniec tury | wygodne stawianie „ducha” i obrót |
| 3. Ruch oddziałów | oddziały jak sztywne klocki | czytelne pokazanie, dokąd można dojść |
| 4. Walka i wygrana | atak, HP, eliminacja, ekran zwycięzcy | balans liczb (łatwo zmienić w `data.js`) |

**Wymagania:** Node (jest zainstalowany) do testów, Live Preview do oglądania.
**Szacunek:** ok. 4 sesje, jedna na etap.

## Ryzyka i założenia

- Kształty jednostek i przydział do er odczytane z zeszytu „na oko” – do poprawy w `data.js`.
- Start (ratusz + 2 chłopów) jest tymczasowy – do ustalenia z kolegą.

## Jak poznamy, że się udało

- Dwóch graczy przy jednym komputerze rozgrywa pełną partię do zwycięstwa.
- Wszystkie testy zasad przechodzą.
