# DWA BLANKI II – zasady gry

Gra strategiczna w turach na planszy w kratkę, przeniesiona z zeszytu.
Ten plik to „biblia zasad” – zaglądamy tu przy każdej nowej funkcji.
Gdy zasada się zmieni, poprawiamy ją tutaj (nie robimy kopii pliku).

## Tryby gry
- **Singleplayer** – menu z opcjami:
  - **1 vs bot** (później)
  - **Edytor** – tu można grać na jednym komputerze (gracze siadają po kolei)
- **Multiplayer** – poczekalnia dla **2–8 graczy**.
- Rozmiar planszy ustawia się w poczekalni (multiplayer) albo w menu (singleplayer).

### Kolejność budowy (ustalona)
1. Gra na jednym komputerze (gracze siedzą po kolei, jak przy planszówce) – testujemy zasady.
2. Bot.
3. Multiplayer przez internet – potrzebny serwer i konto, więc **robimy z TATĄ**.

## Start gry
- Każdy gracz zaczyna z: **ratusz + 2 chłopów**.
- ⚠️ Tymczasowo! Do ustalenia z kolegą, który ma zeszyt.

## Tura
- Gracze grają **po kolei (w turach)**.
- Co turę gracz dostaje:
  - **8 punktów budowy** + **1 bonusowy punkt, który można wydać tylko na koszary**
    (koszary mają 9 kratek, więc 8 + 1 = 9),
  - **5 punktów ruchu**.
- Postawienie budynku lub jednostki kosztuje tyle punktów budowy, ile ma **kratek**.
- **Budynek** można postawić tylko tak, żeby **dotykał chłopa** (bokiem lub rogiem).
- **Jednostka** pojawia się obok budynku, który ją zrobił.
- ⚠️ Na razie w grze: najpierw budujesz, potem chodzisz – po pierwszym ruchu nie można już budować.
  **Do zmiany:** po ruchu ma się dać dalej budować (punkt 6 w `do-zrobienia.md`).
- Nowa jednostka nie rusza się i nie atakuje w turze, w której powstała.
- **Niewydane punkty budowy przechodzą na ruch.**
  Przykład: zostały 2 punkty budowy → ruch = 5 + 2 = 7.
- **Zamek** buduje się przez **2 tury**.
- **Ulepszenia** kosztują 4 pola (później).
- **Następna era:** jeśli gracz ma wymagane budynki, może przejść do następnej ery –
  ale wtedy w tej turze **nie może już nic innego robić**.

## Ruch – oddziały
- Jednostki, które się **stykają** (bokiem albo rogiem), tworzą **oddział**.
- Oddział rusza się **razem**, jak jeden klocek.
- Każdy oddział i każda samotna jednostka ma **własną** pulę punktów ruchu.
- Krok **po skosie kosztuje 1 punkt**, tak samo jak krok prosto.
- Oddziały ustalają się na początku ruchu – jeśli dwa się zetkną, łączą się od następnej tury.

## Atak
- Każda jednostka atakuje **najwyżej 1 raz na turę**.
- **Zasięg** liczymy w każdą stronę, **także po skosie**
  (zasięg 1 = 8 pól dookoła, jak kwadrat 3×3 z jednostką w środku).
- Można atakować jednostki i budynki przeciwnika.
- **Budynki mają 2 życia za każdą kratkę** (np. koszary 9 kratek = 18 życia).
- Nowa jednostka pojawia się **obok budynku**, który ją stworzył.

## Wygrana
- Wygrywa gracz, który **zniszczy wszystkie jednostki przeciwnika**.
- Gracz bez jednostek **odpada** (nawet jeśli ma budynki). Ostatni gracz w grze wygrywa.

## Ery
- 4 ery: **1 – era mroku, 2 – era feudalna, 3 – era zamków, 4 – era imperiów**.
- W każdej erze dostępne są inne budowle (mury, wieże, bramy, zamki…).
- **Zamek** – budowany w 2 turach.
- **Uniwersytet** (4 kratki w rzędzie) – robi się w nim niektóre ulepszenia; po zbadaniu **prochu**
  można w nim robić **bombardy**.
- Część budowli jest tylko „na planszy z wodą”.
- Są też **budowle specjalne**.
- ❓ Wymagania do przejścia do następnej ery – do odczytania z zeszytu.

## Budynki produkujące wojsko
| Budynek | Kształt |
|---|---|
| Koszary | kwadrat 3×3 (❓ sprawdzić) |
| Strzelnica | kształt litery L |
| Stajnia | prostokąt 2×3 |
| Ratusz | 2×2 kwadraty + trójkątny dach na górze (dach zajmuje rząd 2 kratek, razem 2×3); tylko na starcie – drugiego nie da się zbudować |

## Jednostki
Oznaczenia z zeszytu: **D** = życie ❤️, **K** = atak ⚔️, **Z** = zasięg.

| Budynek | Jednostka | Życie | Atak | Zasięg |
|---|---|---|---|---|
| Ratusz | Chłop | 1 | 0 | 0 (ulepszony: 3 / 1 / 1) |
| Koszary | Piechur | 3 | 1 | 1 |
| Koszary | Piechur ulepszony | 4 | 1.5 | 1 |
| Koszary | Włócznik | 2 | 1 (+3 vs kawaleria) | 1 |
| Koszary | Pikinier | 4 | 2 (+2 vs kawaleria) | 1 |
| Koszary | Halabardnik | 6 | 3 (+3 vs kawaleria) | 1 |
| Koszary | Wojownik orłów | 3 | 2 | 2 |
| Koszary | Elitarny wojownik orłów | 4 | 4 | 2 |
| Koszary | Elitarny wojownik orłów (ulepszony) | 6 | 5 | 2 |
| Strzelnica | Łucznik | 2 | 1 | 4 |
| Strzelnica | Wyszkolony łucznik | 2 | 1.5 | 6 |
| Strzelnica | Oszczepnik | 2 | 1 | 4 |
| Strzelnica | Elitarny oszczepnik | 3 | 2 | 5 |
| Strzelnica | Słoń bojowy | 10 | 4 | 6 |
| Stajnia | Kawaleria (1) | 5 | 2 | 1 |
| Stajnia | Ciężka kawaleria | 6 | 3 | 1 |
| Stajnia | Kawaleria (2) | 5 | 2 | 1 |
| Stajnia | Paladyn | 9 | 4 | 1 |
| Stajnia | Ułan | 6 | 4 | 1 |

Kształty ustalone 2026-11-05 (rysunek z teksturami):
- włócznik – kwadrat z grotem (2 kratki), łucznik – kółko (1), oszczepnik – kwadrat z kropką (1),
- wojownik orłów – „ołówek” (4 w rzędzie), kawaleria (1) – litera Γ (3),
- ułan – kwadrat 2×2 ze skośną strzałką (4), słoń bojowy – kratka na górze + podstawa 3×2 (7).
- Wojownik orłów, słoń i ułan są **tymczasowo** dostępne od początku gry (do czasu er).

Kształty pozostałych jednostek (ze starych zdjęć, przybliżone):
- piechur – prostokąt 1×2, piechur ulepszony – 1×3,
- łucznik – kółko (1 kratka), oszczepnik – kwadrat z kropką,
- słoń – duży kształt w kształcie odwróconej litery T,
- kawaleria / paladyn / ułan – kształty litery L ze strzałką.
❓ Dokładne kształty i liczba kratek każdej jednostki – do ustalenia.

## Pytania otwarte (do zeszytu / kolegi)
- Co gracze mają na starcie (na razie: ratusz + 2 chłopów)?
- Które jednostki są w której erze (np. włócznik – era 1, pikinier – era 2; reszta zgadnięta w `data.js`).
- Wymagania do kolejnych er.
- Dokładne kształty jednostek i budynków (ile kratek kosztują).
- Kolorowe strony zeszytu – czy to różne cywilizacje/drużyny?
- Czy jednostki mogą przechodzić przez siebie/budynki?

## Ulepszenia i badania (ustalone 2026-11-07)

### Ulepszenia jednostek
- Każde ulepszenie kosztuje **4 punkty budowy**; można je kupić od ery lepszej jednostki.
- Ulepszenie zmienia **wszystkie** jednostki danego rodzaju (te, które gracz ma, i nowe).
  Potem budynek robi już tylko lepszą wersję.
- Ulepsza się w budynku, który robi jednostkę:
  - koszary: piechur → piechur ulepszony; włócznik → pikinier → halabardnik;
    wojownik orłów → elit. wojownik orłów → elit. wojownik orłów+
  - strzelnica: łucznik → wyszkolony łucznik; oszczepnik → elit. oszczepnik (słoń – bez ulepszenia)
  - stajnia: kawaleria (1) → ciężka kawaleria; kawaleria (2) → paladyn (ułan – bez ulepszenia)
  - ratusz (od ery 2): chłop 1/0/0 → chłop 3/1/1 (1 pole, kwadrat z kosą)
- Gdy lepsza wersja jest większa: piechur (1×2 → 1×3) rośnie zawsze **z przodu**,
  kawaleria (1) dopełnia pusty róg; jeśli nie ma miejsca – rośnie później, gdy będzie miejsce.
- Gdy ulepszenie/badanie dodaje życie – ranni **leczą się do pełna**.

### Uniwersytet (era 4, 4 pola w rzędzie) – badania „Zbadaj…”, każde 4 punkty
| Badanie | Efekt |
|---|---|
| Wypalanie | budynki: +1 życia za pole |
| Płonący grot | jednostki ze strzelnicy (też słoń): +2 ataku |
| Mordownia | wieże i zamek mogą strzelać do wroga tuż obok (bez niej NIE mogą) |
| Pancerz łuskowy | każdy oddział: +2 punkty ruchu |
| Szarża | kawaleria atakuje 2 razy na turę |
| Sparing | jednostki z koszar: +3 życia |
| Proch | uniwersytet robi bombardy |

### Bombarda (uniwersytet, era 4, po Prochu)
- 5 pól: 4 w rzędzie + 1 pod trzecim; szara, trzecie pole w kolorze gracza.
- Życie 5, atak 5, zasięg 5, **+4 obrażeń budynkom**; koszt 5; chodzi i atakuje jak zwykła jednostka.
