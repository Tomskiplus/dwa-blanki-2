# Gra przez internet – Plan Brief

> Full plan: `context/changes/gra-przez-internet/plan.md`

## What & Why
Tryb MULTIPLAYER w DWA BLANKI II: przycisk **WYSZUKAJ GRĘ** dobiera przeciwnika o podobnym rankingu
i gracie 1 na 1 przez internet. Tomek chce grać z innymi na różnych komputerach, z rankingiem
(+2 za wygraną, −1 za przegraną).

## Starting Point
Gra działa na jednym komputerze (EDYTOR, 2–8 graczy po kolei). Zasady są w osobnym `rules.js` bez
losowości, a stan gry to zwykły JSON. Baza Supabase jest założona przez TATĘ (anonimowe logowanie,
tabele `rooms` i `room_players`).

## Desired End State
Dwóch graczy na różnych komputerach klika WYSZUKAJ GRĘ i po chwili gra razem na MAŁEJ planszy.
Ruchy przeciwnika widać na żywo, tura ma 5 minut. Po meczu zmienia się ranking. Ucieczka z gry
kończy się walkowerem po 2 minutach.

## Key Decisions Made
| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Backend | Supabase (TATA) | SQL do rankingu, darmowe funkcje serwerowe, open source – bez migracji później |
| Znajdowanie gry | WYSZUKAJ GRĘ, 1 na 1 | Pomysł Tomka; prosty ranking: jeden wygrywa, drugi przegrywa |
| Ranking | Start 10, +2 / −1, min. 0 | Nowy gracz ma zapas, nikt nie ma minusów |
| Dobieranie | ±5, po 30 s każdy | Gra znajdzie się nawet przy małej liczbie graczy |
| Kraj / plansza | Kraj przed szukaniem, plansza MAŁA | Szybko i bez dzielenia graczy na grupy |
| Kto zaczyna | Niższy ranking (remis: dłużej czekał) | Pomaga słabszemu |
| Tura przeciwnika | Na żywo, można czytać statystyki | Nie nudzi się czekając |
| Wyjście | 2:00 na powrót, potem walkower; PODDAJ SIĘ | Zerwany internet nie kończy gry, ucieczka nie pomaga |
| Czas tury | 5:00 | Nikt nie zablokuje gry |
| Kto liczy co | Baza: dobieranie, tura, ranking, walkower; przeglądarka: zasady (`rules.js`) | Uczciwe tam, gdzie łatwo oszukać, bez przepisywania zasad |

## Scope
**In scope:** ranking, wyszukiwanie 1 na 1, gra na żywo, zegar tury, rozłączenia, poddanie, captcha.

**Out of scope:** kody pokoi, lista gier, 3–8 graczy online, czat/nicki, prawdziwe konta, serwer
sprawdzający zasady (anty-oszustwo), top 10, publikacja (osobno z TATĄ).

## Architecture / Approach
`network.js` (jedyny plik znający Supabase) ↔ funkcje SQL w bazie (`02-mecze-i-ranking.sql`) ↔ Realtime.
`online.js` = ekrany i zegary trybu online. `game.js` dostaje haczyki: blokada akcji poza swoją turą
i `afterAction()` → wysłanie stanu z numerem `version`. `rules.js` bez zmian.

## Phases at a Glance
| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Baza – mecze i ranking | Tabele + funkcje SQL, test na 2 sztucznych graczach | Błąd w SQL wymaga ponownego uruchomienia przez TATĘ |
| 2. Połączenie i szukanie | Ekran z rankingiem, WYSZUKAJ GRĘ, ANULUJ | Biblioteka z CDN / połączenie |
| 3. Gra na żywo | Wspólna gra, blokada tury, zegar, ranking po meczu | Synchronizacja stanu i zaznaczeń |
| 4. Rozłączenia | 2:00 i walkower, PODDAJ SIĘ, powrót do gry | Czasy liczone na różnych komputerach |
| 5. Captcha (z TATĄ) | Ochrona przed botami | Konto Cloudflare TATY |

**Prerequisites:** zgoda TATY na grę z obcymi i captchę; TATA uruchamia SQL (etap 1) i konfiguruje captchę (etap 5).
**Estimated effort:** ~4–6 sesji.

## Open Risks & Assumptions
- Ranking da się oszukać, wysyłając podrobiony stan gry (zostawione na później: logika na serwerze).
- Ranking żyje w przeglądarce – nowy komputer albo wyczyszczone dane = nowy gracz z rankingiem 10.
- Mało graczy online = długie czekanie (łagodzi zasada „po 30 s każdy”).
- Darmowy projekt usypia po ~7 dniach bez gry.

## Success Criteria (Summary)
- Dwóch graczy w dwóch oknach znajduje się przyciskiem i rozgrywa całą grę.
- Ranking zmienia się poprawnie (+2 / −1, nie poniżej 0), także po walkowerze i poddaniu.
- EDYTOR działa jak wcześniej, 219 testów zasad przechodzi.
