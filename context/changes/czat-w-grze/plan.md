# Czat w meczu przez internet – plan

## Overview

Dodajemy czat z wolnym tekstem do meczu przez internet (1 na 1). **Enter** otwiera pole do pisania, drugi **Enter** wysyła, a **Esc** zamyka. TATA zgodził się na wariant A z zabezpieczeniami (2026-11-14, „TATA: Zróbmy A”). Zabezpieczenia są obowiązkowe i nie wolno ich luzować bez ponownej zgody TATY.

## Current State Analysis

- Mecz przez internet słucha zmian w pokoju przez jeden kanał Realtime `"room-" + code` ([network.js:203-213](../../../network.js#L203-L213)). Ten sam kanał może przenosić wiadomości **broadcast**. Takie wiadomości nie trafiają do bazy, więc nie trzeba zmieniać SQL ani dodawać nowego serwisu.
- Klawiatura: jeden `keydown` w [game.js:1691-1700](../../../game.js#L1691-L1700) obsługuje R (obrót) i Esc (anuluj). Działa tylko wtedy, gdy `action` jest ustawione. Nie sprawdza, czy ktoś pisze w polu tekstowym, więc litera „r” wpisana w czacie obróciłaby kształt.
- Elementy HTML nad grą już istnieją: `#captcha-box` ([index.html:15](../../../index.html#L15), [style.css:21-27](../../../style.css#L21-L27)). Canvas skaluje się przez `max-width: 100%`, więc pole czatu musi się skalować razem z nim.
- Ekran gry rysuje [`drawGameScreen`](../../../game.js#L1596) w tej kolejności: plansza → obiekty → panel → `drawOnlineOverlay` → baner tury. Plansza zajmuje 600×600 po lewej (`BOARD_AREA`), a panel 200 px po prawej.
- Przyciski ekranu gry pochodzą z [`getGameButtons`](../../../game.js#L334). Kliknięcie najpierw sprawdza przyciski, a dopiero potem planszę ([game.js:1673-1681](../../../game.js#L1673-L1681)).
- Koniec meczu i wyjście: [`leaveOnlineGame`](../../../online.js#L309) (woła `unwatchRoom`), [`showOnlineEnd`](../../../online.js#L608).
- Testy: `node tests/run-tests.js` wczytuje pliki gry przez `vm.runInThisContext` ([tests/run-tests.js:12-17](../../../tests/run-tests.js#L12-L17)). Filtr musi więc być osobnym plikiem bez canvasu i bez `document`.
- `context/foundation/lessons.md` ani `roadmap.md` nie istnieją.

## Desired End State

W meczu przez internet każdy gracz może nacisnąć Enter, napisać do 60 znaków i wysłać wiadomość. Przeciwnik widzi ją w lewym dolnym rogu planszy jako „Czerwony: hej!” (nazwa w kolorze kraju). Brzydkie słowa zamieniają się na `***`. Wiadomości z danymi kontaktowymi (cyfry, e-mail, link, @nick, komunikatory, numer zapisany słownie) w ogóle nie wychodzą. Ten sam filtr działa u odbiorcy. Można wyciszyć przeciwnika do końca meczu. Poza meczem przez internet czat nie istnieje.

Jak sprawdzić: testy filtra w `node tests/run-tests.js` i mecz na dwóch oknach przeglądarki (zwykłe + prywatne).

### Key Discoveries:

- Broadcast w supabase-js v2: `.on("broadcast", { event: "chat" }, msg => msg.payload)` na kanale i `channel.send({ type: "broadcast", event: "chat", payload })`. Domyślnie `self: false`, więc nadawca nie dostaje swojej wiadomości z powrotem.
- Kanał pokoju jest publiczny: kto zna kod pokoju, mógłby coś do niego nadać. Dlatego filtr u odbiorcy jest konieczny, a nie tylko „na zapas”.
- `game.players[slot].colorName` / `.color` dają podpis i kolor. Slot przeciwnika = `1 - online.mySlot`.

## What We're NOT Doing

- Nie zapisujemy historii czatu w bazie. Nie ma zgłaszania graczy ani moderacji (decyzja TATY: tylko broadcast).
- Brak czatu w menu, podczas szukania gry i na ekranie końca meczu. (W EDYTORZE czat jest, ale tylko lokalny – bez internetu, więc zgoda TATY go nie dotyczy.)
- Nie ma prywatnych kanałów Realtime (z RLS). Wymagałyby SQL po stronie TATY. Ryzyko obcych wiadomości zamyka filtr u odbiorcy.
- Bez dźwięku nowej wiadomości.
- Bez wyciszania „na zawsze”. Wyciszenie trwa tylko do końca meczu (decyzja autora gry).
- Bez dowolnych emotek. Dozwolona jest tylko mała stała lista (np. 😀 😂 😅 😎 👍 👋 🙂 😮 😢 🔥), bo inne znaki Unicode mogą ukrywać cyfry.

## Implementation Approach

Trzy pliki z jasnym podziałem, jak klocki:
- `chat-filter.js` – sam „strażnik”, czyste funkcje bez rysowania (testowalne w node),
- `network.js` – wysyłanie i odbieranie przez kanał pokoju (jedyny plik, który zna Supabase),
- `chat.js` – stan czatu, pole do pisania, rysowanie wiadomości, wyciszanie.

Filtr działa w obu miejscach: przed wysłaniem i po odebraniu.

## Critical Implementation Details

- **Klawiatura**: gdy fokus jest w polu czatu, `keydown` z game.js nie może reagować (R, Esc). Enter otwierający czat trzeba obsłużyć tak, żeby to samo naciśnięcie nie trafiło od razu do pola i nie wysłało pustej wiadomości (`preventDefault`).
- **Kolejność filtra**: najpierw blokada kontaktów na *surowym* tekście (np. `@` i cyfry dowolnego alfabetu – `\p{N}`), dopiero potem odcinanie niedozwolonych znaków i gwiazdki. W odwrotnej kolejności „@nick” zamieniłby się na zwykłe „nick” i przeszedł.
- **Pozycja pola**: canvas jest skalowany CSS-em, więc pole musi siedzieć w kontenerze `position: relative` razem z canvasem i być ustawione w procentach. Wtedy na małym ekranie zostaje nad planszą.

## Phase 1: Filtr czatu (strażnik)

### Overview

Czysty plik z funkcją, która sprawdza i czyści tekst, oraz testy w node.

### Changes Required:

#### 1. Strażnik

**File**: `chat-filter.js` (nowy)

**Intent**: Jedno miejsce z zasadami czatu, używane przy wysyłaniu i przy odbieraniu.

**Contract**:
- Stałe: `CHAT_MAX_LENGTH = 60`, `CHAT_MIN_GAP_MS = 2000`.
- `filterChatMessage(text)` → `{ ok: true, text }` (tekst przycięty do 60 znaków, z brzydkimi słowami zamienionymi na `***`) albo `{ ok: false, reason }`, gdzie `reason` to polski napis dla gracza, np. „Bez cyfr, linków i kontaktów!” albo „Pusta wiadomość”.
- Blokada (`ok: false`):
  - dowolna cyfra (`\p{N}`) i `@`,
  - `http`, `www`, wzorzec domeny (`coś.pl/.com/.gg/...`),
  - nazwy komunikatorów i serwisów po normalizacji (discord, insta/instagram, snap/snapchat, tiktok, whatsapp, telegram, messenger, facebook, gmail, youtube…),
  - 3 lub więcej słów-liczebników w wiadomości (np. „pięć siedem trzy”, „one two three”).
- Normalizacja do porównań: małe litery, bez polskich ogonków, zamiana „leet” (0→o, 1→i, 3→e, 4→a, $→s), zlepione powtórzone litery, sprawdzenie także wersji bez spacji i kropek (łapie „d i s c o r d” i „k.u.r.w.a”).
- Dozwolone znaki: litery (z polskimi), spacja, `.,!?:;()-'"` i mała stała lista emotek. Pozostałe znaki są usuwane.
- Lista brzydkich słów (rdzenie PL + EN) jako stała w tym pliku, z komentarzem, po co jest. Słowo zawierające rdzeń → `***`. Gdy rdzeń wychodzi dopiero po zlepieniu słów, cała wiadomość → `***`.

#### 2. Testy

**File**: `tests/run-tests.js`

**Intent**: Wczytać `chat-filter.js` i dodać sekcję „CZAT – FILTR”.

**Contract**: przypadki co najmniej:
- normalny tekst przechodzi bez zmian („hej, powodzenia!”, polskie litery),
- tekst 80 znaków → przycięty do 60,
- pusta wiadomość lub same spacje → `ok: false`,
- blokowane: „mój nr 600 123 456”, „pisz na ab@cd.pl”, „wejdź na www.strona.pl”, „mam discorda”, „d i s c o r d”, „insta: kowal”, „pięć sześć siedem osiem”, cyfry pełnej szerokości `１２３`,
- brzydkie słowo → `***` (także z ogonkami, wielkimi literami, „leet”),
- bez fałszywych alarmów: „Szczecin”, „kurczak”, „skubany”, „szach mat”.

### Success Criteria:

#### Automated Verification:

- Wszystkie testy przechodzą: `node tests/run-tests.js` (także stare)
- Testy filtra pokrywają każdą regułę blokady z listy wyżej

#### Manual Verification:

- Autor gry przegląda listę testów i dopisuje 1 własny przypadek

**Implementation Note**: Po etapie i zielonych testach – pauza na potwierdzenie przed etapem 2.

---

## Phase 2: Czat działa (wysyłanie, odbieranie, pole do pisania)

### Overview

Enter → pisanie → wysłanie przez broadcast → wiadomość u przeciwnika w lewym dolnym rogu planszy.

### Changes Required:

#### 1. Sieć

**File**: `network.js`

**Intent**: Wiadomości czatu na tym samym kanale pokoju.

**Contract**:
- `watchRoom(code, onRoom, onPlayer, onChat)` – dodatkowy `.on("broadcast", { event: "chat" }, ...)` woła `onChat(text)` z `payload.text`.
- `sendChat(text)` → `{ ok, error }`: wysyła `{ text }` przez `roomChannel.send(...)`. Gdy kanału nie ma albo wysłanie się nie uda → `ok: false` z `NO_CONNECTION`.

#### 2. Pole do pisania

**Files**: `index.html`, `style.css`

**Intent**: Prawdziwe pole `<input>` (polskie litery działają same), schowane, dopóki nie ma czatu.

**Contract**:
- Canvas i pole są w kontenerze `#game-wrap` (`position: relative`). `<input id="chat-input" maxlength="60" hidden autocomplete="off">` leży nad lewym dolnym rogiem planszy (pozycja i szerokość w %).
- `<script src="chat-filter.js">` i `<script src="chat.js">` są wczytywane po `online.js`, a przed `game.js`.
- Zmiana kontenera nie może zepsuć `#captcha-box` ani skalowania canvasu.

#### 3. Logika czatu

**File**: `chat.js` (nowy)

**Intent**: Stan czatu i obsługa klawiszy.

**Contract**:
- Stan: `chatMessages` (lista `{ fromMe, text, at }`, rysujemy ostatnie 4 sprzed < 15 s), `chatLastSentAt`, `chatOpen`.
- `chatAvailable()` – prawda, gdy `currentScreen === "game" && game` i (`!online` albo `!online.ended`). Czyli w meczu przez internet **i w EDYTORZE** (zmiana z 2026-11-14 – w EDYTORZE wpisuje się kody, patrz `context/changes/kody-w-edytorze/`).
- W EDYTORZE nic nie idzie do internetu: wysłana wiadomość pokazuje się tylko lokalnie jako „<Kolor gracza, który ma turę>: …” (oboje gracze siedzą przy jednym komputerze). Filtr działa tak samo. Przed filtrem jest miejsce na sprawdzenie kodu (dopisze je zmiana `kody-w-edytorze`).
- Enter (gdy czat dostępny i zamknięty) → pokaż pole i daj mu fokus.
- W polu: Enter → `filterChatMessage`. Jeśli wynik jest zły, pokaż `reason` (w `message`) i zostaw tekst do poprawy. Jeśli od ostatniej wiadomości minęło < 2 s → „Zwolnij! Jedna wiadomość co 2 sekundy.” Jeśli wszystko gra → `sendChat`, dopisz „Ty: …” (przefiltrowany tekst), wyczyść i zamknij pole. Esc → zamknij pole. Utrata fokusu → zamknij (tekst zostaje na później).
- `receiveChat(text)`: przepuszcza przez `filterChatMessage`. Odrzucone wiadomości nie są pokazywane. Wiadomości przychodzące szybciej niż co 1,5 s są pomijane. Reszta zostaje dopisana jako wiadomość przeciwnika.
- `drawChat()` rysuje wiadomości na półprzezroczystym tle nad polem: „Czerwony: …” w kolorze kraju przeciwnika, „Ty: …” na czarno.
- `clearChat()` – czyści listę i zamyka pole.

#### 4. Podpięcie do gry

**Files**: `online.js`, `game.js`

**Intent**: Czat żyje tylko w meczu, a pisanie nie steruje grą.

**Contract**:
- `startOnlineGame` przekazuje `receiveChat` do `watchRoom` i woła `clearChat()`. `leaveOnlineGame` też woła `clearChat()`.
- `drawGameScreen` woła `drawChat()` (po `drawOnlineOverlay`, przed banerem), gdy `online`.
- Na początku `keydown` w game.js: jeśli fokus jest w polu czatu → nic nie rób. Obsługa Enter dla czatu jest w chat.js.

### Success Criteria:

#### Automated Verification:

- `node tests/run-tests.js` nadal przechodzi
- Brak błędów w konsoli przy wczytaniu strony (sprawdzenie w przeglądarce)

#### Manual Verification:

- Dwa okna (zwykłe + prywatne), mecz: wiadomość z okna A pojawia się w oknie B jako „<Kolor>: …”, a w A jako „Ty: …”
- „mój numer 600…” nie wychodzi i pokazuje „Bez cyfr, linków i kontaktów!”
- Brzydkie słowo dochodzi jako `***`
- Dwie wiadomości szybciej niż co 2 s → druga zablokowana z komunikatem
- Litera „r” wpisana w czacie podczas stawiania budynku nie obraca kształtu, a Esc w czacie nie anuluje stawiania
- W EDYTORZE Enter otwiera czat, a wiadomość pokazuje się tylko lokalnie (nic nie idzie do internetu)

**Implementation Note**: Po etapie – pauza na test na dwóch oknach.

---

## Phase 3: Wyciszanie i szlif

### Overview

Przycisk WYCISZ CZAT, podpowiedź „Enter = czat”, czytelne kolory i sprzątanie po meczu.

### Changes Required:

#### 1. Wyciszanie

**Files**: `chat.js`, `game.js`

**Intent**: Gracz może wyciszyć przeciwnika do końca meczu i odciszyć go z powrotem.

**Contract**:
- `chatMuted` (resetowane w `clearChat`, więc nowy mecz = czat włączony).
- Gdy wyciszone, `receiveChat` nic nie dopisuje, a wiadomości przeciwnika już widoczne znikają z ekranu.
- `getChatButtons()` → mały przycisk na planszy obok okna czatu, z napisem „WYCISZ CZAT” / „WŁĄCZ CZAT”. Pokazuje się, odkąd przeciwnik napisał cokolwiek w tym meczu, i zostaje do końca meczu. `getGameButtons` dołącza te przyciski (także w turze przeciwnika, ale nie przy banerze).

#### 2. Szlif

**File**: `chat.js`

**Intent**: Czytelność i podpowiedź.

**Contract**:
- Gdy nie ma widocznych wiadomości i pole jest zamknięte → mała szara podpowiedź „Enter = czat” w lewym dolnym rogu.
- Nazwa koloru przeciwnika ma ciemny obrys, żeby jasne kolory (np. żółty) były czytelne.
- Podczas wyciszenia: mały napis „czat wyciszony”.

### Success Criteria:

#### Automated Verification:

- `node tests/run-tests.js` nadal przechodzi

#### Manual Verification:

- WYCISZ CZAT: wiadomości przeciwnika znikają i nowe się nie pokazują. WŁĄCZ CZAT: nowe znowu przychodzą
- Nowy mecz po wyciszeniu → czat znowu włączony
- Po końcu meczu (np. PODDAJ SIĘ) pole czatu znika, a stare wiadomości nie pojawiają się w następnym meczu
- Żółty kraj przeciwnika jest czytelny w czacie
- Przycisk wyciszania nie przeszkadza w klikaniu planszy ani w zaznaczaniu ramką

---

## Testing Strategy

### Unit Tests:

- Filtr (etap 1): każda reguła blokady, gwiazdki, przycinanie, fałszywe alarmy.

### Integration Tests:

- Brak automatycznych testów sieci: od czasu captchy test SQL się nie loguje. Sieć sprawdzamy ręcznie na dwóch oknach.

### Manual Testing Steps:

1. Otwórz grę w Live Preview w zwykłym oknie i w oknie prywatnym. W obu MULTIPLAYER → WYSZUKAJ GRĘ.
2. W oknie A: Enter, „hej!”, Enter → w B widać „<Kolor A>: hej!”.
3. Spróbuj wysłać numer, e-mail, link, „discord”, „pięć sześć siedem” → zablokowane.
4. Brzydkie słowo → u przeciwnika `***`.
5. Wycisz w B, napisz z A → w B nic nie widać. Włącz z powrotem → widać.
6. PODDAJ SIĘ → pole czatu znika. Nowy mecz → czat pusty i włączony.

## Performance Considerations

Wiadomości są małe (≤ 60 znaków, max 1 na 2 s), więc nie obciążają Realtime. Rysowanie 4 linijek co klatkę jest pomijalne.

## Migration Notes

Brak. Baza i SQL bez zmian, nie ma nowego serwisu.

## References

- Decyzja TATY: `context/changes/czat-w-grze/change.md`
- Kanał pokoju: [network.js:203](../../../network.js#L203)
- Wcześniejsza zmiana online: `context/archive/2026-11-11-gra-przez-internet/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Filtr czatu (strażnik)

#### Automated

- [x] 1.1 Wszystkie testy przechodzą: `node tests/run-tests.js` (także stare) — 423af92
- [x] 1.2 Testy filtra pokrywają każdą regułę blokady z listy wyżej — 423af92

#### Manual

- [ ] 1.3 Autor gry przegląda listę testów i dopisuje 1 własny przypadek

### Phase 2: Czat działa (wysyłanie, odbieranie, pole do pisania)

#### Automated

- [x] 2.1 `node tests/run-tests.js` nadal przechodzi — 7ab91dc
- [x] 2.2 Brak błędów w konsoli przy wczytaniu strony — 7ab91dc

#### Manual

- [ ] 2.3 Wiadomość z okna A pojawia się w oknie B jako „<Kolor>: …”, a w A jako „Ty: …”
- [ ] 2.4 Numer telefonu nie wychodzi i pokazuje komunikat
- [ ] 2.5 Brzydkie słowo dochodzi jako `***`
- [ ] 2.6 Dwie wiadomości szybciej niż co 2 s → druga zablokowana
- [ ] 2.7 „r” i Esc w czacie nie sterują grą
- [ ] 2.8 W EDYTORZE Enter otwiera czat, a wiadomość pokazuje się tylko lokalnie (nic nie idzie do internetu)

### Phase 3: Wyciszanie i szlif

#### Automated

- [x] 3.1 `node tests/run-tests.js` nadal przechodzi

#### Manual

- [ ] 3.2 WYCISZ CZAT / WŁĄCZ CZAT działa
- [ ] 3.3 Nowy mecz po wyciszeniu → czat włączony
- [ ] 3.4 Po końcu meczu pole znika, stare wiadomości nie wracają
- [ ] 3.5 Żółty kraj czytelny w czacie
- [ ] 3.6 Przycisk wyciszania nie przeszkadza w klikaniu planszy
