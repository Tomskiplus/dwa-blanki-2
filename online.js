// =====================================================
//  DWA BLANKI II - GRA PRZEZ INTERNET (ekrany i zegary)
//  Ekrany: "multiMenu" (ranking + wybór kraju) i "searching" (szukanie gry).
//  Z bazą rozmawiamy tylko przez funkcje z network.js.
//  Rysujemy funkcjami z game.js (drawPaper, drawButton, drawText...).
// =====================================================

// --- Ustawienia (zmieniaj śmiało!) ---
const SEARCH_POLL_MS = 2000;       // co ile milisekund pytamy bazę "jest przeciwnik?"
const ANYONE_AFTER_SECONDS = 30;   // po tylu sekundach baza dobiera każdego (zasada Tomka)
const RATING_RANGE = 5;            // na początku: przeciwnik z rankingiem ± tyle
const COUNTRY_STORAGE_KEY = "dwaBlanki.onlineCountry";  // gdzie przeglądarka pamięta mój kraj
const TURN_SECONDS = 5 * 60;       // czas na turę (zasada Tomka: 5 minut)
const TIMEOUT_GRACE_SECONDS = 15;  // zapas, zanim przeciwnik może zakończyć moją turę (tak samo w bazie)
const SYNC_EVERY_TICKS = 5;        // co ile sekund sprawdzamy bazę "na wszelki wypadek"
const FIRST_STATE_WAIT_MS = 5000;  // gracz z miejsca 1 czeka tyle na planszę od gracza z miejsca 0

// --- Stan trybu online ---
let onlineStatus = "offline";      // "offline", "connecting", "ready" albo "error"
let onlineProfile = null;          // mój ranking: { rating, wins, losses }
let onlineCountry = loadSavedCountry();  // numer mojego kraju w COUNTRIES
let searchStartedAt = 0;           // kiedy kliknąłem WYSZUKAJ GRĘ (Date.now())
let isSearching = false;           // czy teraz szukamy (pętla pytań do bazy)
let foundRoomCode = null;          // kod znalezionej gry

// Trwająca gra przez internet albo null (= gramy w EDYTORZE albo jesteśmy w menu).
// { code, mySlot, version, turnStartedAt, myRatingBefore, settings, ... }
let online = null;
let onlineTimer = null;            // "zegarek", który co sekundę sprawdza czas tury i bazę
let tickCount = 0;                 // ile razy już tyknął
let inspectedId = null;            // obiekt kliknięty w turze przeciwnika (pokazujemy jego statystyki)
let onlineResult = null;           // wynik skończonej gry (do ekranu "onlineEnd")

// =====================================================
//  POMOCNICZE
// =====================================================

// Pamiętany kraj z poprzedniego razu (albo 0). try/catch, bo przeglądarka może blokować pamięć
function loadSavedCountry() {
  try {
    const saved = Number(localStorage.getItem(COUNTRY_STORAGE_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < COUNTRIES.length) return saved;
  } catch (problem) {
    // brak pamięci przeglądarki - trudno, zaczynamy od pierwszego kraju
  }
  return 0;
}

function saveCountry() {
  try {
    localStorage.setItem(COUNTRY_STORAGE_KEY, String(onlineCountry));
  } catch (problem) {
    // nie udało się zapamiętać - nic złego się nie dzieje
  }
}

// Zmienia mój kraj o krok w lewo (-1) albo w prawo (+1)
function changeOnlineCountry(step) {
  const count = COUNTRIES.length;
  onlineCountry = (onlineCountry + step + count) % count;
  saveCountry();
}

// Sekundy -> napis zegara, np. 75 -> "1:15"
function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return minutes + ":" + (rest < 10 ? "0" : "") + rest;
}

// Pokazuje błąd tylko, gdy gracz dalej jest w multiplayerze
// (mógł w międzyczasie kliknąć WSTECZ - wtedy nie straszymy go napisem na ekranie tytułowym)
function showOnlineError(text) {
  if (currentScreen === "multiMenu" || currentScreen === "searching") message = text;
}

// =====================================================
//  WEJŚCIE DO MULTIPLAYERA
// =====================================================

// Kliknięcie MULTIPLAYER na ekranie tytułowym
async function openMultiplayer() {
  goToScreen("multiMenu");
  foundRoomCode = null;
  onlineStatus = "connecting";

  const connection = await connect();
  if (!connection.ok) {
    onlineStatus = "error";
    showOnlineError(connection.error);
    return;
  }

  const profile = await getMyProfile();
  if (!profile.ok) {
    onlineStatus = "error";
    showOnlineError(profile.error);
    return;
  }
  onlineProfile = profile.data;
  onlineStatus = "ready";
}

// =====================================================
//  SZUKANIE GRY
// =====================================================

// Kliknięcie WYSZUKAJ GRĘ
function startSearch() {
  if (onlineStatus !== "ready") {
    message = "Najpierw musimy połączyć się z serwerem gry.";
    return;
  }
  goToScreen("searching");
  foundRoomCode = null;
  searchStartedAt = Date.now();
  isSearching = true;
  askForMatch();
}

// Jedno pytanie do bazy "jest przeciwnik?". Gdy nie ma - pytamy znowu za chwilę.
// (Kolejne pytanie wysyłamy dopiero po odpowiedzi - nigdy dwa naraz.)
async function askForMatch() {
  if (!isSearching) return;

  const result = await findMatch(onlineCountry);
  if (!isSearching) return;   // w międzyczasie ktoś kliknął ANULUJ

  if (!result.ok) {
    message = result.error;   // np. brak internetu - ale szukamy dalej
  } else if (result.data) {
    matchFound(result.data);
    return;
  } else {
    message = "";
  }
  setTimeout(askForMatch, SEARCH_POLL_MS);
}

// Kliknięcie ANULUJ
function stopSearch() {
  isSearching = false;
  cancelSearch();   // nie czekamy na odpowiedź - baza i tak usunie nas po 15 s
  goToScreen("multiMenu");
}

// Baza znalazła przeciwnika!
function matchFound(code) {
  isSearching = false;
  startOnlineGame(code);
}

// =====================================================
//  START GRY PRZEZ INTERNET
// =====================================================

// Wchodzimy do gry o kodzie "code" (nowej albo już trwającej - np. po zamknięciu strony)
async function startOnlineGame(code) {
  if (online) leaveOnlineGame();
  foundRoomCode = code;
  goToScreen("searching");    // pokazuje "MAMY PRZECIWNIKA! Przygotowuję planszę..."
  game = null;                // stara gra z EDYTORA nie może się pomylić z nową

  const loaded = await loadRoom(code);
  if (!loaded.ok || loaded.data.mySlot === null) {
    showOnlineError(loaded.ok ? "Nie grasz w tej grze." : loaded.error);
    return;
  }
  const room = loaded.data.room;
  const me = loaded.data.players.find(player => player.slot === loaded.data.mySlot);

  online = {
    code: code,
    mySlot: loaded.data.mySlot,
    version: 0,                    // ostatnia wersja stanu, którą znamy
    turnStartedAt: Date.now(),     // kiedy zaczęła się tura (poprawi to czas z bazy)
    myRatingBefore: me.rating_before,
    settings: room.settings,
    unsent: false,                 // czy mamy ruch, którego nie udało się wysłać (brak internetu)
    syncing: false,                // czy właśnie pobieramy stan z bazy
    autoEndedAt: null,             // tura, którą zegar już sam zakończył
    claiming: false,               // czy właśnie kończymy turę przeciwnika po czasie
    ended: false,                  // czy gra się skończyła
  };

  // Słuchamy zmian na żywo i włączamy zegarek
  watchRoom(code, room => receiveRoom(room, false), player => {});
  startOnlineTick();

  if (room.status === "finished") {
    showOnlineEnd(room);
  } else if (room.version > 0) {
    receiveRoom(room, false);       // gra już trwa - wchodzimy
  } else if (online.mySlot === 0) {
    createFirstState();             // jestem pierwszy - to ja rozstawiam planszę
  } else {
    // Czekam na planszę od przeciwnika; jeśli się nie pojawi - rozstawiam sam
    setTimeout(() => {
      if (online && online.code === code && online.version === 0) createFirstState();
    }, FIRST_STATE_WAIT_MS);
  }
}

// Pierwszy stan gry: plansza MAŁA, kraje z bazy - tymi samymi zasadami co w EDYTORZE
async function createFirstState() {
  const code = online.code;
  const state = createGame(2, online.settings.sizeKey, online.settings.countries);
  const result = await submitState(code, state, () => 0);
  if (!online || online.code !== code) return;

  if (result.ok) {
    online.version = result.data;
    online.turnStartedAt = Date.now();
    applyRemoteState(state);
  } else {
    syncFromServer(true);   // przeciwnik był szybszy - bierzemy jego planszę
  }
}

// Wychodzimy z gry przez internet (MENU, koniec gry, nowa gra w EDYTORZE)
function leaveOnlineGame() {
  stopOnlineTick();
  unwatchRoom();
  online = null;
  inspectedId = null;
}

// =====================================================
//  WYSYŁANIE I ODBIERANIE RUCHÓW
// =====================================================

// Wysyła mój "zapis świata" do bazy (woła to afterAction z game.js)
async function sendMyState() {
  if (!online) return;
  const code = online.code;
  const result = await submitState(code, game, () => (online ? online.version : 0));
  if (!online || online.code !== code) return;

  if (result.ok) {
    online.version = Math.max(online.version, result.data);
    online.unsent = false;
    if (game.winner !== null) syncFromServer(true);   // wygrana! baza już skończyła grę
    return;
  }
  if (result.code === "network") {
    // Brak internetu: spróbujemy wysłać jeszcze raz (cały stan, więc nic nie zginie)
    online.unsent = true;
    message = result.error;
    return;
  }
  // Inny błąd (np. ktoś zapisał coś w międzyczasie) - bierzemy stan z bazy
  message = result.error;
  syncFromServer(true);
}

// Pobiera pokój z bazy i porównuje z naszym stanem.
// force = true: weź stan z bazy, nawet jeśli wydaje się, że mamy już ten sam
async function syncFromServer(force) {
  if (!online || online.syncing) return;
  online.syncing = true;
  const code = online.code;
  const loaded = await loadRoom(code);
  if (!online || online.code !== code) return;
  online.syncing = false;
  if (loaded.ok) receiveRoom(loaded.data.room, force);
}

// Przyszedł pokój z bazy (na żywo albo z syncFromServer)
function receiveRoom(room, force) {
  if (!online || online.ended) return;
  if (room.turn_started_at) online.turnStartedAt = Date.parse(room.turn_started_at);

  if (room.status === "finished") {
    showOnlineEnd(room);
    return;
  }
  if (room.version < online.version) return;                  // stara wiadomość
  if (room.version === online.version && !force) return;      // to już mamy
  if (room.version === 0) return;                              // planszy jeszcze nie ma

  // Realtime nie przysyła bardzo dużych danych - wtedy pobieramy pokój sami
  if (!room.state) {
    syncFromServer(true);
    return;
  }

  // W mojej turze baza odsyła mi moje własne ruchy ("echo") - ignorujemy je,
  // bo mamy już nowszy stan u siebie
  const myTurnHere = game && game.current === online.mySlot;
  if (myTurnHere && room.state.current === online.mySlot && !force) return;

  online.version = room.version;
  applyRemoteState(room.state);
}

// =====================================================
//  ZEGAREK: czas tury, ponowne wysyłanie, sprawdzanie bazy
// =====================================================

function startOnlineTick() {
  stopOnlineTick();
  tickCount = 0;
  onlineTimer = setInterval(onlineTick, 1000);
}

function stopOnlineTick() {
  if (onlineTimer) clearInterval(onlineTimer);
  onlineTimer = null;
}

// Ile sekund zostało w tej turze (może być mniej niż 0, gdy czas minął)
function turnSecondsLeft() {
  if (!online) return TURN_SECONDS;
  return TURN_SECONDS - (Date.now() - online.turnStartedAt) / 1000;
}

// Co sekundę:
function onlineTick() {
  if (!online || online.ended) return;
  tickCount++;

  if (game && currentScreen === "game") {
    // Zmieniła się tura? Zegar startuje od nowa (dokładny czas i tak przyśle za chwilę baza)
    if (online.lastCurrent !== undefined && online.lastCurrent !== game.current) {
      online.turnStartedAt = Date.now();
    }
    online.lastCurrent = game.current;

    const left = turnSecondsLeft();

    // Moja tura i czas minął - tura kończy się sama (to, co zrobione, zostaje)
    if (isMyTurn() && left <= 0 && online.autoEndedAt !== online.turnStartedAt) {
      online.autoEndedAt = online.turnStartedAt;
      action = null;
      finishTurn();
      message = "Czas minął - tura skończyła się sama.";
    }

    // Tura przeciwnika i minęło 5:00 (+ zapas) - kończymy ją za niego (co 5 sekund próbujemy)
    if (!isMyTurn() && left <= -TIMEOUT_GRACE_SECONDS && !online.claiming && tickCount % 5 === 0) {
      claimOpponentTimeout();
    }
  }

  if (online.unsent) sendMyState();

  // Na wszelki wypadek co kilka sekund pytamy bazę (gdyby wiadomość na żywo zginęła).
  // Zanim pojawi się plansza - częściej.
  if (tickCount % (game ? SYNC_EVERY_TICKS : 2) === 0) syncFromServer(false);
}

// Przeciwnikowi minął czas: kończymy jego turę (baza sprawdzi, czy naprawdę minął)
async function claimOpponentTimeout() {
  online.claiming = true;
  const code = online.code;
  const copy = JSON.parse(JSON.stringify(game));   // kopia stanu - nie psujemy swojego, jeśli baza odmówi
  endTurn(copy);
  const result = await claimTimeout(code, copy, online.version);
  if (!online || online.code !== code) return;
  online.claiming = false;

  if (result.ok) {
    online.version = result.data;
    online.turnStartedAt = Date.now();
    applyRemoteState(copy);
    message = "Przeciwnikowi minął czas - twoja tura!";
  } else if (result.code !== "too_early") {
    syncFromServer(true);   // nasz stan był nieaktualny - bierzemy z bazy
  }
}

// =====================================================
//  W TURZE PRZECIWNIKA: oglądanie statystyk
// =====================================================

// Kliknięcie na planszy w turze przeciwnika (woła je clickBoard z game.js)
function inspectObjectAt(cell) {
  const obj = getObjectAt(game, cell.x, cell.y);
  inspectedId = obj ? obj.id : null;
}

// Panel w turze przeciwnika: napis i statystyki klikniętego obiektu
function drawOpponentTurnPanel(left) {
  drawText("Tura przeciwnika", left, 182, 17, "#000000", "left");
  drawWrappedText("Patrz, co robi. Kliknij budynek albo jednostkę, żeby zobaczyć statystyki.",
    left, 208, PANEL_WIDTH - 30, 17, 13, "#555555");

  const obj = inspectedId === null ? null : game.objects.find(o => o.id === inspectedId);
  if (obj) {
    const type = obj.kind === "unit" ? UNIT_TYPES[obj.type] : BUILDING_TYPES[obj.type];
    const owner = game.players[obj.owner];
    drawText(type.name, left, 290, 16, "#000000", "left");
    drawText("Gracz: " + owner.colorName, left, 312, 13, owner.color, "left");
    drawText("Życie: " + obj.hp + "/" + obj.maxHp, left, 332, 13, "#333333", "left");
    if (type.attack) {
      drawText("Atak: " + type.attack + "   Zasięg: " + type.range, left, 350, 13, "#333333", "left");
    }
  }

  if (message !== "") drawWrappedText(message, left, 400, PANEL_WIDTH - 30, 17, 13, "#c0392b");
}

// Zegar tury w panelu (czerwony, gdy zostało mniej niż 30 sekund)
function drawOnlineClock() {
  const left = turnSecondsLeft();
  const color = left <= 30 ? "#c0392b" : "#000000";
  drawText(formatClock(left), PANEL_X + 122, 26, 16, color);
}

// =====================================================
//  KONIEC GRY
// =====================================================

// Baza mówi: gra skończona. Pokazujemy wynik i nowy ranking.
async function showOnlineEnd(room) {
  if (!online || online.ended) return;
  online.ended = true;

  const winner = game ? game.players[room.winner_slot] : null;
  onlineResult = {
    iWon: room.winner_slot === online.mySlot,
    reason: room.end_reason,                 // "win", "walkover" albo "surrender"
    winnerName: winner ? winner.colorName : "",
    winnerColor: winner ? winner.color : "#888888",
    ratingBefore: online.myRatingBefore,
    ratingAfter: null,                       // dopiszemy, gdy baza odpowie
  };
  leaveOnlineGame();
  goToScreen("onlineEnd");

  const profile = await getMyProfile();
  if (profile.ok) {
    onlineProfile = profile.data;
    onlineResult.ratingAfter = profile.data.rating;
  }
}

// Opis, dlaczego gra się skończyła
function endReasonText(result) {
  if (result.reason === "walkover") {
    return result.iWon ? "Przeciwnik nie wrócił do gry (walkower)" : "Nie wróciłeś na czas (walkower)";
  }
  if (result.reason === "surrender") {
    return result.iWon ? "Przeciwnik się poddał" : "Poddałeś się";
  }
  return result.iWon ? "Ratusz przeciwnika zniszczony!" : "Twój ratusz został zniszczony";
}

function getOnlineEndButtons() {
  return [
    { label: "SZUKAJ ZNOWU", x: 260, y: 420, w: 280, h: 60, fontSize: 24,
      onClick: startSearch },
    { label: "MENU", x: 260, y: 500, w: 280, h: 60,
      onClick: () => goToScreen("title") },
  ];
}

function drawOnlineEndScreen() {
  drawPaper();
  drawBigTitle(onlineResult.iWon ? "ZWYCIĘSTWO!" : "PRZEGRANA", 90, 60);

  // Okienko w kolorze zwycięzcy
  ctx.fillStyle = onlineResult.winnerColor;
  ctx.fillRect(170, 160, 460, 150);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeRect(170, 160, 460, 150);
  if (onlineResult.winnerName !== "") {
    drawText("Wygrywa: " + onlineResult.winnerName, 400, 205, 30, "#ffffff");
  }
  drawText(endReasonText(onlineResult), 400, 262, 20, "#ffffff");

  // Ranking: 10 → 12 (+2)
  let ratingText = "Ranking: liczę...";
  if (onlineResult.ratingAfter !== null) {
    const change = onlineResult.ratingAfter - onlineResult.ratingBefore;
    ratingText = "Ranking: " + onlineResult.ratingBefore + " → " + onlineResult.ratingAfter +
      " (" + (change >= 0 ? "+" : "") + change + ")";
  }
  drawText(ratingText, 400, 365, 26, "#000000");

  getButtons().forEach(drawButton);
}

// =====================================================
//  PRZYCISKI
// =====================================================

function getMultiMenuButtons() {
  const buttons = [
    { label: "WSTECZ", x: 20, y: 530, w: 160, h: 50, fontSize: 22,
      onClick: () => goToScreen("title") },
  ];

  if (onlineStatus === "ready") {
    buttons.push({ label: "◀", x: 230, y: 283, w: 34, h: 34, fontSize: 16,
      onClick: () => changeOnlineCountry(-1) });
    buttons.push({ label: "▶", x: 536, y: 283, w: 34, h: 34, fontSize: 16,
      onClick: () => changeOnlineCountry(1) });
    buttons.push({ label: "WYSZUKAJ GRĘ", x: 260, y: 380, w: 280, h: 60,
      onClick: startSearch });
  }
  if (onlineStatus === "error") {
    buttons.push({ label: "SPRÓBUJ ZNOWU", x: 260, y: 380, w: 280, h: 60, fontSize: 24,
      onClick: openMultiplayer });
  }
  return buttons;
}

function getSearchingButtons() {
  if (foundRoomCode) {
    return [
      { label: "MENU", x: 260, y: 450, w: 280, h: 60,
        onClick: () => { leaveOnlineGame(); goToScreen("title"); } },
    ];
  }
  return [
    { label: "ANULUJ", x: 260, y: 450, w: 280, h: 60,
      onClick: stopSearch },
  ];
}

// =====================================================
//  RYSOWANIE EKRANÓW
// =====================================================

function drawMultiMenuScreen() {
  drawPaper();
  drawBigTitle("MULTIPLAYER", 80, 56);

  if (onlineStatus === "connecting") {
    drawText("Łączę z serwerem gry...", canvas.width / 2, 220, 24, "#000000");
  }

  if (onlineStatus === "ready") {
    // Ranking
    drawText("Twój ranking: " + onlineProfile.rating, canvas.width / 2, 170, 32, "#000000");
    drawText("Wygrane: " + onlineProfile.wins + "    Przegrane: " + onlineProfile.losses,
      canvas.width / 2, 210, 18, "#555555");

    // Wybór kraju: ◀ [kwadracik w kolorze] nazwa ▶
    drawText("Twój kraj:", canvas.width / 2, 260, 20, "#000000");
    const country = COUNTRIES[onlineCountry];
    ctx.fillStyle = country.color;
    ctx.fillRect(280, 288, 24, 24);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(280, 288, 24, 24);
    drawText(country.name, 420, 300, 20, "#000000");

    drawText("Gra 1 na 1 - plansza MAŁA", canvas.width / 2, 470, 16, "#555555");
  }

  getButtons().forEach(drawButton);
  drawMessage(350);
}

function drawSearchingScreen() {
  drawPaper();

  if (foundRoomCode) {
    drawBigTitle("MAMY PRZECIWNIKA!", 150, 44);
    drawText("Kod gry: " + foundRoomCode, canvas.width / 2, 250, 28, "#000000");
    drawText("Przygotowuję planszę...", canvas.width / 2, 300, 18, "#555555");
  } else {
    // Kropki po "Szukam przeciwnika" mrugają: . .. ...
    const dots = ".".repeat(1 + Math.floor(time / 30) % 3);
    drawBigTitle("Szukam przeciwnika" + dots, 150, 40);

    const seconds = (Date.now() - searchStartedAt) / 1000;
    drawText(formatClock(seconds), canvas.width / 2, 240, 48, "#000000");

    // Kogo szukamy (zasada: najpierw ± 5, po 30 s każdego)
    let who = "Każdy przeciwnik";
    if (seconds < ANYONE_AFTER_SECONDS) {
      const low = Math.max(0, onlineProfile.rating - RATING_RANGE);
      const high = onlineProfile.rating + RATING_RANGE;
      who = "Ranking od " + low + " do " + high;
    }
    drawText(who, canvas.width / 2, 300, 20, "#555555");
  }

  getButtons().forEach(drawButton);
  drawMessage(390);
}
