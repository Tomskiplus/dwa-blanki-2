# Czat w meczu przez internet – Plan Brief

> Full plan: `context/changes/czat-w-grze/plan.md`

## What & Why

Gracze w meczu przez internet mogą do siebie pisać: **Enter** otwiera pole, drugi **Enter** wysyła. Po drugiej stronie są obcy ludzie, więc TATA zgodził się tylko na wersję z zabezpieczeniami („TATA: Zróbmy A”, 2026-11-14).

## Starting Point

Mecz już ma kanał na żywo (Supabase Realtime) na zmiany w pokoju. Klawiatura obsługuje tylko R i Esc. Czatu nie ma.

## Desired End State

W meczu: Enter → pisanie (max 60 znaków) → wiadomość pojawia się u przeciwnika w lewym dolnym rogu planszy jako „Czerwony: hej!”. Brzydkie słowa przychodzą jako `***`, a dane kontaktowe w ogóle nie wychodzą. Przeciwnika można wyciszyć do końca meczu.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Rodzaj czatu | Wolny tekst, wariant A | Wybór autora gry, zgoda TATY tylko z zabezpieczeniami |
| Transport | Broadcast Realtime na kanale pokoju | Zero zmian w SQL, nic nie jest zapisywane |
| Gdzie filtr | U nadawcy **i** u odbiorcy | Przerobiona gra albo obcy z kodem pokoju omija filtr nadawcy |
| Brzydkie słowa | Zamiana na `***` | Rozmowa toczy się dalej |
| Dane kontaktowe | Blokada całej wiadomości | Numer czy nick nie może wyjść nawet w kawałkach |
| Miejsce na ekranie | Lewy dół planszy, 4 ostatnie, znikają po 15 s | Panel jest już ciasny |
| Wyciszanie | Do końca meczu | Jeden niemiły gracz nie wyłącza czatu na zawsze |
| Podpis | Nazwa koloru w kolorze kraju | Od razu widać, czyj to kraj |
| Pole do pisania | `<input>` HTML nad canvasem | Polskie litery działają same |

## Scope

**In scope:** filtr + testy, wysyłanie/odbieranie, pole do pisania, rysowanie wiadomości, limit 60 znaków i 1 wiadomości na 2 s, WYCISZ CZAT, podpowiedź „Enter = czat”.

**Out of scope:** historia w bazie, zgłaszanie graczy, czat poza meczem, dźwięki, dowolne emotki, prywatne kanały z RLS.

## Architecture / Approach

`chat-filter.js` (strażnik, czyste funkcje, testy w node) ← używany przez `chat.js` (stan, klawisze, rysowanie) → `network.js` (`sendChat`, broadcast w `watchRoom`). `online.js` włącza i czyści czat przy starcie i końcu meczu. `game.js` rysuje czat i ignoruje klawisze, gdy pisze się w polu.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Filtr | Strażnik + testy | Fałszywe alarmy (np. „Szczecin”) |
| 2. Czat działa | Enter → wysyłka → wiadomość u przeciwnika | „r”/Esc w polu sterują grą; pozycja pola przy skalowaniu |
| 3. Wyciszanie i szlif | WYCISZ CZAT, podpowiedź, czytelne kolory | Przycisk zasłania planszę |

**Prerequisites:** zgoda TATY (jest). Supabase działa (projekt nie „śpi”).
**Estimated effort:** ~1–2 sesje, 3 etapy.

## Open Risks & Assumptions

- Żaden filtr nie jest szczelny (np. numer napisany bardzo pomysłowo). TATA to zaakceptował.
- Zakładamy, że broadcast działa na publicznym kanale pokoju tak samo jak obecne zmiany w bazie (to ten sam kanał).

## Success Criteria (Summary)

- Dwa okna, jeden mecz: wiadomości przychodzą w obie strony, podpisane kolorem kraju.
- Numer telefonu, e-mail, link ani komunikator nigdy nie dochodzą do przeciwnika.
- Pisanie w czacie nie steruje grą, a czat znika po końcu meczu.
