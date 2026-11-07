# DWA BLANKI II – lista MVP do zrobienia (po kolei)

Lista następnych kroków po skończeniu „podstaw rozgrywki”
(`context/changes/rozgrywka-podstawy/`). Robimy od góry.
Każdy punkt to osobna zmiana: `/10x-new` → `/10x-plan` → `/10x-implement`.

## 1. Stawianie jednostek obok własnych jednostek
Teraz nowa jednostka musi stać **tuż obok budynku**, który ją robi.
Chcemy: jeśli **twoja** jednostka stoi obok budynku, to nową jednostkę można postawić
też **obok tej jednostki** (ale tylko obok swojej, nie wroga).
- ❓ Do ustalenia: czy działa to „łańcuszkiem” (obok jednostki, która stoi obok jednostki,
  która stoi obok budynku…), czy tylko o jedną jednostkę dalej?
- Miejsce w kodzie: `canPlaceUnit` w `rules.js`.

## 2. Odłączanie jednostki od oddziału
Osobny przycisk w panelu: „ODŁĄCZ” – wybrana jednostka przestaje należeć do oddziału
i może ruszać się sama.
- ❓ Do ustalenia: ile punktów ruchu dostaje odłączona jednostka (tyle, ile zostało oddziałowi?).

## 3. Wygląd jednostek jak w zeszycie
✅ Zrobione 2026-11-05 (zmiana `wyglad-jednostek`, rysunki w `drawings.js`).
- Jednostki mają wyglądać jak na rysunkach z zeszytu (np. łucznik = kółko, włócznik z grotem,
  wojownik orłów = „ołówek”), a nie tylko kolorowe kratki z literami.
- Sprawdzić kształty (ile kratek) wszystkich jednostek.
- Niektórych jednostek nie da się jeszcze zrobić (np. **słonia**), bo są z dalszych er – patrz punkt 4.

## 4. Ulepszenia i przechodzenie do następnych er
✅ Zrobione 2026-11-07 (zmiany `ery`, `zamek-i-mury`, `ulepszenia-uniwersytet`).
Zostało na później: dom zwiększa populację, wieża zwiadowcza + mgła wojny,
jednostki specjalne zamku (menu kolorów).
- Nazwy er: **mroku → feudalna → zamków → imperiów**.
- Przejście do następnej ery: gdy gracz ma wymagane budynki; w tej turze nic więcej nie robi.
- Nowe budynki: **zamek** (budowany w 2 turach) i **uniwersytet** (4 kratki w rzędzie:
  niektóre ulepszenia + badanie **prochu** → nowa jednostka **bombarda**).
- Usunąć tymczasowy znacznik `availableNow` z wojownika orłów, słonia i ułana.
- Ulepszenia kosztują 4 pola (np. chłop 1/0/0 → 3/1/1, piechur → piechur ulepszony).
- Budowle z er 1–4 z zeszytu (mury, wieże, bramy, zamek budowany w 2 turach, budowle specjalne).
- ❓ Do ustalenia z kolegą: wymagania do każdej ery i które jednostki są w której erze
  (na razie zgadnięte w `data.js`).

## 5. Ruch bez punktów budowy – do sprawdzenia
Gdy nie ma punktów budowy, oddział i tak ma 5 punktów ruchu.
✅ To już działa (sprawdzone 2026-11-03: po koszarach pula ruchu = 5).
Oddział nie przechodzi przez budynki, więc obejście przeszkody kosztuje więcej kroków.
Jeśli w grze wygląda to inaczej – opisać dokładnie, kiedy.

## 6. Budowanie także po ruchu
Teraz pierwszy ruch oddziału kończy budowanie w tej turze. **Ma być inaczej:**
po ruchu nadal można budować i robić jednostki.
- ❓ Do ustalenia: jak liczyć punkty, skoro niewydane punkty budowy zamieniają się w ruch?
  Przykład: ruszasz się o 7 pól (5 ruchu + 2 z budowy), czy potem zostaje ci 6 punktów budowy?
  Pomysł: ruch najpierw zużywa 5 „darmowych” punktów ruchu, a dopiero potem punkty budowy.
  Ale co, jeśli masz kilka oddziałów, a każdy ma swoją pulę?
- Miejsce w kodzie: `startMovePhase`, `canPlaceBuilding`, `canPlaceUnit` w `rules.js`.

## Później (po MVP)
- Gra z botem (1 vs bot).
- Multiplayer przez internet (z TATĄ – serwer i konto).
- Prawdziwy edytor map.
- Plansza z wodą.
