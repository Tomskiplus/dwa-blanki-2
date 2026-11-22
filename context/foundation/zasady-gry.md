# DWA BLANKI II – zasady gry

Gra strategiczna w turach na planszy w kratkę, przeniesiona z zeszytu.
Ten plik to „biblia zasad” – zaglądamy tu przy każdej nowej funkcji.
Gdy zasada się zmieni, poprawiamy ją tutaj (nie robimy kopii pliku).

## Tryby gry
- **Singleplayer** – menu z opcjami:
  - **1 vs bot** (później)
  - **Edytor** – tu można grać na jednym komputerze (gracze siadają po kolei)
- **Multiplayer** – gra przez internet: przycisk **WYSZUKAJ GRĘ**, zawsze **1 na 1**
  (zasady niżej, „Multiplayer przez internet”). Poczekalnia dla 2–8 graczy – kiedyś później.
- Rozmiar planszy ustawia się w menu EDYTOR; w multiplayerze plansza jest zawsze MAŁA.

### Kolejność budowy (ustalona)
1. Gra na jednym komputerze (gracze siedzą po kolei, jak przy planszówce) – testujemy zasady.
2. Bot.
3. Multiplayer przez internet – potrzebny serwer i konto, więc **robimy z TATĄ**.
   (TATA wybrał Supabase, 2026-11-11; bot jest później.)

### Multiplayer przez internet (ustalone 2026-11-11)
| Sprawa | Zasada |
|---|---|
| Szukanie | Przycisk **WYSZUKAJ GRĘ**, zawsze **1 na 1** (na razie bez kodów pokoju i listy gier) |
| Ranking | Nowy gracz ma **10**. Wygrana **+2**, przegrana **−1**. Nigdy mniej niż **0** |
| Dobieranie | Przeciwnik o rankingu różnym najwyżej o **5**; gdy ktoś czeka **30 s** – każdy (najpierw najbliższy ranking) |
| Kraj i plansza | Kraj wybierasz przed szukaniem (◀ ▶). Plansza zawsze **MAŁA 20×15**. Ten sam kraj → numery jak w EDYTORZE |
| Kto zaczyna | **Niższy ranking**; przy remisie ten, kto dłużej czekał |
| Tura przeciwnika | Widzisz każdy ruch **na żywo**; możesz klikać, żeby czytać statystyki, ale nic nie zmienisz |
| Wyjście z gry | **2 minuty** na powrót (ta sama przeglądarka), potem **walkower** (+2 / −1). MENU w grze → **PODDAJ SIĘ** (z „NA PEWNO?”) |
| Czas tury | **5 minut**; po czasie tura kończy się sama (to, co zrobione, zostaje) |
| Prywatność | Bez czatu, nicków i imion – widać tylko kraj i ranking |
| Ranking a komputer | Gracz = ta przeglądarka. Inny komputer albo wyczyszczone dane = nowy gracz z rankingiem 10 |

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
- **Jednostka** pojawia się obok budynku, który ją zrobił **albo obok twojej jednostki, która
  dotyka tego budynku** (ustalone 2026-11-08):
  - tylko o jedną jednostkę dalej (bez łańcuszka),
  - „obok” = bokiem albo rogiem,
  - jednostka zrobiona w tej turze też się liczy.
- Nowa jednostka nie rusza się i nie atakuje w turze, w której powstała.
- **Budowanie i ruch można mieszać** – po ruchu dalej można budować (ustalone 2026-11-08).
- **Punkty budowy są wspólne i przechodzą na ruch:**
  - każda jednostka (albo oddział) ma **5 darmowych kroków** na turę,
  - dalsze kroki biorą po **1 punkcie ze wspólnych punktów budowy** (za oddział 1 punkt na krok,
    niezależnie od liczby jednostek),
  - co zostanie, można wydać na budowanie.
  - Przykład: 8 punktów budowy, piechur idzie 7 pól → zostaje 6 do budowy; inny piechur może
    teraz iść 5 + 6.
  - Bonus +1 za koszary **nie** przechodzi na ruch – zostaje na koszary.
- **Zamek** buduje się przez **2 tury**.
- **Ulepszenia** kosztują 4 pola (później).
- **Następna era:** jeśli gracz ma wymagane budynki, może przejść do następnej ery –
  ale wtedy w tej turze **nie może już nic innego robić**.

## Ruch – oddziały (zmienione 2026-11-08)
- **Każda jednostka chodzi sama** – stykanie się nie robi oddziału.
- **Oddział robisz ramką:** przeciągasz myszką prostokąt; zaznaczone twoje jednostki, które się
  **stykają** (bokiem albo rogiem), tworzą oddział. Grupy daleko od siebie = **osobne** oddziały.
- Oddział rusza się **razem**, jak jeden klocek, i trzyma się razem **tylko do końca tury**.
- Jednostka zaznaczona nową ramką wychodzi ze starego oddziału i wchodzi do nowego.
- Każda jednostka pamięta swoje kroki. Oddział może iść tyle, ile ma **najsłabsza** jednostka;
  każdej odejmuje się przebytą drogę.
- Kliknięcie jednostki z oddziału zaznacza cały oddział do ruchu; atakuje kliknięta jednostka.
- Krok **po skosie kosztuje 1 punkt**, tak samo jak krok prosto.

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
- ~~Kolorowe strony zeszytu – czy to różne cywilizacje/drużyny?~~ → tak, patrz „Kolory (kraje)”.
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

## Kolory (kraje) – USTALANE 2026-11-08 (jeszcze nie w grze)
- Kolory działają jak **cywilizacje (kraje)**: każdy kolor ma swoje rzeczy.
- Strona zeszytu z kolorami: każdy kolor ma 3 wiersze (koszary / strzelnica / stajnia) z jednostkami;
  **X = ten kolor tej jednostki nie ma**; rysunki **z boku** = to, co robi **zamek** tego koloru.
- Jednostka specjalna należy do kraju w kolorze, w jakim jest narysowana.
- **Wybór kraju** (ustalone 2026-11-11): na ekranie EDYTOR każdy gracz ma „◀ kraj ▶”; strzałki zmieniają
  kraj na poprzedni/następny z listy (w kółko). Na start kraje po kolei z listy (gracz 1 = czerwony,
  gracz 2 = ciemnopomarańczowy…).
- **Kilku graczy może mieć ten sam kraj.** Wtedy ich budynki i jednostki mają małą cyfrę z numerem gracza,
  a nazwa w panelu i na banerze to np. „Czerwony 2”. Gdy kraje się nie powtarzają – bez cyfr.
- **17 kolorów:** czerwony, ciemnopomarańczowy, pomarańczowy, żółty, jasnozielony, zielony, ciemnozielony,
  jasnoniebieski, niebieski, granatowy, fioletowy, różowy, beżowy, brązowy, szary, czarny, bordowy.

### Jednostki specjalne z zamku – 1. wiersz zdjęcia statystyk (potwierdzone 2026-11-08)
Zapis: życie / atak / zasięg. UL = po ulepszeniu.
| Nazwa | Kratki | Kolor | Statystyki | Po UL |
|---|---|---|---|---|
| Mini armatka | 1 | czerwony | 8 / 5 / 7 | 8 / 6 / 8 |
| Skorpion (balista) | 3 | pomarańczowy | 6 / 5 / 6 | 9 / 7 / 8 |
| Łucznik kompozytowy | 1 | ciemnopomarańczowy | 3 / 2 / 10 | 3 / 3 / 12 |
| Armatka turbo | 1 | jasnozielony | 8 / 5 / 4 | 8 / 8 / 6 |
| Ulepszony paladyn (ulepsza się w zamku) | 3 | zielony | 9 / 5 / 1 | bez UL |
| Słoń z balistą | 7 | ciemnozielony | 10 / 8 / 6 | bez UL |
| Podwójny halabardnik | 1 | niebieski | 8 / 6 / 4 | 8 / 9 / 4 |

### 2. wiersz zdjęcia statystyk (potwierdzone 2026-11-08) – wszystkie bez UL
| Nazwa | Kratki | Kolor | Statystyki | Uwagi |
|---|---|---|---|---|
| Płonący oszczepnik | 1 | jasnoniebieski | 4 / 3 / 6 | |
| Opancerzony słoń trykacz | 7 | granatowy | 10 / 6 / 1 | |
| Shurikeniarz | 1 | granatowy | 5 / 2 / 3 | |
| Kawaleria z łukiem | 3 | granatowy | 5 / 3 / 5 | |
| Ułan z pancerzem płytowym | 3 | granatowy | 5 / 2 / 4 | |
| Słoń z taranem | 7 | granatowy | 9 / 8 / 1 | +3 obrażeń budynkom |
| Armata | 7 | granatowy | 6 / 8 / 10 | robi ją strzelnica prochowa |

**Strzelnica prochowa** (budynek specjalny, granatowy): 4 kratki, 10 życia / atak 1 / zasięg 3, produkuje armatę.

### 3. wiersz zdjęcia statystyk (potwierdzone 2026-11-11)
| Nazwa | Kratki | Kolor | Statystyki | Po UL | Uwagi |
|---|---|---|---|---|---|
| Mamut | 10 | granatowy | 12 / 7 / 8 | bez UL | |
| Słoń opancerzony | 7 | granatowy | 10 / 5 / 6 | 11 / 6 / 6 | inny niż „opancerzony słoń trykacz” |
| Super łucznik | 1 | fioletowy | 3 / 2 / 6 | 4 / 4 / 7 | |
| Kawaleria z łukiem 2 | 3 | różowy | 5 / 3 / 4 | 6 / 5 / 4 | |
| Mnich | 1 | beżowy | 3 / 0 / 7 | bez UL | **nawraca** = przejmuje jednostkę przeciwnika |
| Magnonella | zajmuje 9, kosztuje 4 | brązowy | 3 / 10 / 11 | 5 / 11 / 12 | strzela tylko w budynek albo jednostkę, która nie ruszy się w następnej turze; obrażenia zadaje w następnej turze |
| Opancerzony paladyn | 3 | szary | 8 / 4 / 1 | bez UL | |

Ostatni rysunek w 3. wierszu (żółty kwadrat z włócznią) – **nie robimy**.

### Pozostałe kraje
- **Żółty** – nie ma jednostki specjalnej.
- **Czarny** – zwiadowca (kwadrat z łukiem), 1 kratka, 6 / 6 / 9, bez UL.
- **Bordowy** – płonący oszczepnik, taki sam jak jasnoniebieski (4 / 3 / 6), tylko bordowy.

### Jak działają jednostki z zamku (ustalone 2026-11-22)
- Zamek (gotowy, nie w budowie) robi jednostki **swojego kraju** jak koszary: klik → lista → stawiasz obok.
- **Koszt = liczba kratek**; gdy brakuje punktów – **dług** jak przy zamku (reszta z następnej tury).
  Jednostka pojawia się od razu (jak każda nowa – rusza się dopiero w następnej turze).
- **Ulepszenia** jednostek z zamku: w **uniwersytecie**, 4 punkty; nazwa po ulepszeniu „Ulepszona …”.
- **Ulepszony paladyn** (zielony): ulepszenie paladyna kupowane **w zamku** (4 pkt) – paladyni zielonego → 9 / 5 / 1.
- **Kształty:** 1 kratka – mini armatka, łucznik kompozytowy, armatka turbo, podwójny halabardnik, płonący oszczepnik,
  shurikeniarz, super łucznik, zwiadowca; **skorpion 2 kratki w kolumnie (koszt 2)**; kawaleria z łukiem (1 i 2)
  jak kawaleria (2); ułan z pancerzem jak ułan; opancerzony/ulepszony paladyn jak paladyn; 4 słonie jak słoń;
  **mamut = duży słoń „T”** (głowa 1 + ciało 3×3 = 10).
- **Grupy** (badania i bonusy):
  - jak kawaleria: kawaleria z łukiem (1 i 2), ułan z pancerzem płytowym, opancerzony paladyn;
  - jak strzelnica: łucznik kompozytowy, super łucznik, płonący oszczepnik, shurikeniarz, zwiadowca, 4 słonie, mamut;
  - jak koszary: podwójny halabardnik (**+3 na kawalerię**, jak halabardnik);
  - żadna: mini armatka, armatka turbo, skorpion.
- Słoń z taranem: **+3 obrażeń budynkom**.
- Mnich, magnonella, strzelnica prochowa + armata – później (osobna zmiana).

❓ Do ustalenia: czy nad 1. wierszem są jeszcze jednostki,
co który kraj ma/nie ma (X), jak gracz wybiera kraj, kształty jednostek, ile kosztuje ulepszenie w zamku.

