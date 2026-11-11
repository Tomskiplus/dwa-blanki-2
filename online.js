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

// --- Stan trybu online ---
let onlineStatus = "offline";      // "offline", "connecting", "ready" albo "error"
let onlineProfile = null;          // mój ranking: { rating, wins, losses }
let onlineCountry = loadSavedCountry();  // numer mojego kraju w COUNTRIES
let searchStartedAt = 0;           // kiedy kliknąłem WYSZUKAJ GRĘ (Date.now())
let isSearching = false;           // czy teraz szukamy (pętla pytań do bazy)
let foundRoomCode = null;          // kod znalezionej gry

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
  foundRoomCode = code;
  // Tu w etapie 3 zacznie się prawdziwa gra przez internet
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
        onClick: () => goToScreen("title") },
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
    drawText("(sama gra przez internet będzie w następnym etapie)", canvas.width / 2, 300, 16, "#555555");
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
