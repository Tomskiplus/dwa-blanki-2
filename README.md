# DWA BLANKI II

Strategiczna gra w turach na planszy w kratkę, przeniesiona z zeszytu do przeglądarki.
Budujesz koszary, strzelnice i stajnie, robisz wojsko, ruszasz oddziałami i walczysz,
aż zostanie jeden gracz.

## Jak zagrać

**SINGLEPLAYER → EDYTOR** → wybierz liczbę graczy (2–8) i rozmiar planszy → **START**.
Gracze grają po kolei przy jednym komputerze.

- Co turę masz **8 punktów budowy** (+1 bonus tylko na koszary).
- Budynek stawiasz **obok swojego chłopa**, a jednostkę **obok budynku**, który ją robi.
- Jednostki, które się stykają, tworzą **oddział** i ruszają się razem.
  Ruch = 5 punktów + niewydane punkty budowy.
- Każda jednostka atakuje **raz na turę**.
- Wygrywa ostatni gracz, któremu zostały jednostki.

## Gra z botem

**SINGLEPLAYER → 1 VS BOT** → wybierz swój kraj, kraj bota, tryb bota i rozmiar planszy → **START**.

- Ty zaczynasz (lewy górny róg), bot gra drugi.
- Bot gra według tych samych zasad co ty: stawia koszary, robi piechurów i włóczników, chodzi i atakuje.
- Turę bota widać krok po kroku (ruch co pół sekundy). Pomarańczowa ramka pokazuje,
  co bot właśnie zrobił, a napis w panelu mówi, jaka to była akcja.
- **Tryb ofensywny ⚔️**: bot zbiera 4 wojaków i idzie na ciebie.
- **Tryb defensywny 🛡️**: bot pilnuje bazy i walczy, gdy podejdziesz na 6 pól do jego budynków.
- Bot atakuje najsłabszy cel w zasięgu (najmniej życia).
- Uczciwa gra: tajne kody jednostek działają tylko w EDYTORZE.

## Sterowanie

- **Myszka**: kliknij przycisk w panelu, budynek albo jednostkę na planszy.
- **R**: obróć stawiany budynek lub jednostkę.
- **Esc** albo **prawy przycisk myszy**: anuluj stawianie.

## Uruchomienie na komputerze

1. Otwórz folder projektu w VS Code.
2. Prawy klik na `index.html` → **Show Preview** (rozszerzenie Live Preview).
3. Albo otwórz `index.html` w przeglądarce.

Testy zasad: `node tests/run-tests.js`
