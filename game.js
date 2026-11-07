// =====================================================
//  DWA BLANKI II - ekrany, rysowanie i myszka
//  (dane są w data.js, zasady w rules.js)
// =====================================================

// --- Ustawienia (skrzynie z wartościami - zmieniaj śmiało!) ---

const GRID = 20;            // rozmiar jednej kratki na kartce (w pikselach)
const BLOCK = 60;           // rozmiar jednego kwadratu w kształtach (= 3 kratki)
const LINE_WIDTH = 4;       // grubość czarnych linii
const BLOCK_COLOR = "#ffffff";        // kolor wypełnienia kształtów
const HOVER_COLOR = "#ffe066";        // kolor przycisku po najechaniu myszką
const SELECTED_COLOR = "#bfe3ff";     // kolor wybranego przycisku (np. rozmiar planszy)
const FLOAT_AMOUNT = 4;     // jak mocno kształty "pływają" w górę i w dół (0 = stoją)

const RECRUIT_TOP = 192;    // gdzie w panelu zaczyna się lista jednostek budynku
const RECRUIT_STEP = 28;    // odstęp między przyciskami jednostek (8 jednostek musi się zmieścić)
const BUILD_LIST_TOP = 194; // gdzie zaczyna się lista budowli w zakładce
const BUILD_LIST_STEP = 31; // odstęp między przyciskami budowli

const BOARD_AREA = 600;     // plansza zajmuje kwadrat 600×600 po lewej
const PANEL_X = 600;        // panel z informacjami zaczyna się tu
const PANEL_WIDTH = 200;    // szerokość panelu

// --- Przygotowanie canvasu ---

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d"); // ctx = "pędzel", którym rysujemy

// --- Stan programu (to, co zmienia się w czasie) ---
const mouse = { x: -1, y: -1 };  // gdzie jest myszka
let message = "";                // napis pokazywany po kliknięciu
let time = 0;                    // licznik czasu do animacji

// Na którym ekranie jesteśmy: "title", "singleMenu", "editorSetup", "game" albo "victory"
let currentScreen = "title";

// Ustawienia wybrane w edytorze
const setup = {
  playerCount: 2,
  sizeKey: "mala",
};

let game = null;   // stan gry (tworzy go createGame z rules.js)
let board = null;  // gdzie i jak duża jest plansza na ekranie

// Co gracz teraz robi na planszy:
// null = nic, albo { kind: "building" lub "unit", key: typ, rotation: 0-3 }
let action = null;
let selectedBuildingId = null;  // numer klikniętego budynku (żeby zrobić w nim jednostki)
let selectedUnitId = null;      // numer klikniętej jednostki (żeby nią ruszyć)
let selectedAnchor = null;      // kratka jednostki, którą kliknęliśmy - "uchwyt" do przesuwania
let reachableMoves = new Map(); // dokąd może dojść oddział: "dx,dy" -> koszt
let attackTargets = [];         // wrogowie, których wybrana jednostka może teraz zaatakować
let attackInfo = "";            // napis po ataku, np. "Trafienie! -2 życia"
let showTurnBanner = false;     // czy pokazać duży napis "Tura gracza X"
let turnBannerNote = "";        // dodatkowa linijka na banerze, np. "Czerwony wchodzi w erę feudalną!"
let buildTab = "budynki";       // która zakładka budowania jest otwarta: "budynki" albo "obrona"

// Zmienia ekran i czyści stary komunikat
function goToScreen(screenName) {
  currentScreen = screenName;
  message = "";
}

// =====================================================
//  RYSOWANIE KARTKI
// =====================================================

// Rysuje tło jak w zeszycie w kratkę
function drawPaper() {
  ctx.fillStyle = "#fdfdf8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#d6e4f0";
  ctx.lineWidth = 1;

  // Linie pionowe - pętla idzie co jedną kratkę
  for (let x = 0; x <= canvas.width; x += GRID) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Linie poziome
  for (let y = 0; y <= canvas.height; y += GRID) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// =====================================================
//  KLOCKI - ozdobne kształty z ekranu tytułowego
// =====================================================

// Rysuje jeden prostokąt z czarną ramką (nasz podstawowy klocek LEGO)
function drawBlock(x, y, w, h) {
  ctx.fillStyle = BLOCK_COLOR;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeRect(x, y, w, h);
}

// Kształt 1: grupa 7 kwadratów (1 na górze, pod spodem 2 rzędy po 3)
function drawSquareGroup(x, y) {
  // Kwadrat na samej górze - w środkowej kolumnie
  drawBlock(x + BLOCK, y, BLOCK, BLOCK);

  // Dwa rzędy po 3 kwadraty
  for (let row = 1; row <= 2; row++) {
    for (let col = 0; col < 3; col++) {
      drawBlock(x + col * BLOCK, y + row * BLOCK, BLOCK, BLOCK);
    }
  }
}

// Kształt 2: "ołówek" - kwadrat, długi prostokąt i trójkątny grot
function drawPencil(x, y) {
  const S = BLOCK;
  const tipStart = x + 3 * S;     // gdzie kończy się prostokąt i zaczyna grot
  const middleY = y + S / 2;      // środek wysokości

  // Kwadrat z tyłu i długi prostokąt (2 kwadraty długości)
  drawBlock(x, y, S, S);
  drawBlock(x + S, y, 2 * S, S);

  // Trójkątny grot
  ctx.beginPath();
  ctx.moveTo(tipStart, y);          // lewy górny róg grota
  ctx.lineTo(tipStart + S, middleY); // czubek
  ctx.lineTo(tipStart, y + S);      // lewy dolny róg grota
  ctx.closePath();
  ctx.fillStyle = BLOCK_COLOR;
  ctx.fill();
  ctx.stroke();

  // Pozioma linia przez środek
  ctx.beginPath();
  ctx.moveTo(x + S * 0.3, middleY);
  ctx.lineTo(tipStart + S * 0.42, middleY);
  ctx.stroke();

  // Dwa wygięte łuki w grocie (jak dwa nawiasy ">")
  ctx.lineWidth = LINE_WIDTH - 1;
  drawCurve(tipStart + S * 0.02, y + S * 0.18, tipStart + S * 0.52, middleY, y + S * 0.82);
  drawCurve(tipStart + S * 0.14, y + S * 0.22, tipStart + S * 0.72, middleY, y + S * 0.78);
}

// Pomocnicza funkcja: łuk od (startX, topY) do (startX, bottomY),
// wygięty w prawo w stronę punktu (bendX, bendY)
function drawCurve(startX, topY, bendX, bendY, bottomY) {
  ctx.beginPath();
  ctx.moveTo(startX, topY);
  ctx.quadraticCurveTo(bendX, bendY, startX, bottomY);
  ctx.stroke();
}

// Kształt 3: kwadrat stojący na wysokim prostokącie
function drawTower(x, y) {
  drawBlock(x, y, BLOCK, BLOCK);              // kwadrat na górze
  drawBlock(x, y + BLOCK, BLOCK, 2 * BLOCK);  // prostokąt (2 kwadraty wysokości)
}

// Zwraca przesunięcie w górę/dół do "pływania".
// Math.sin daje liczby od -1 do 1, które płynnie się zmieniają - jak fala.
function floatOffset(delay) {
  return Math.sin(time * 0.03 + delay) * FLOAT_AMOUNT;
}

// Rysuje wszystkie ozdobne kształty w ich miejscach
function drawDecorations() {
  drawSquareGroup(40, 380 + floatOffset(0));
  drawPencil(280, 460 + floatOffset(2));
  drawTower(700, 380 + floatOffset(4));
}

// =====================================================
//  NAPISY I PRZYCISKI (wspólne dla wszystkich ekranów)
// =====================================================

// Wielki napis na środku u góry ekranu (z niebieskim cieniem)
function drawBigTitle(text, y, size) {
  ctx.font = "900 " + size + "px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Najpierw "cień" przesunięty trochę w bok, potem właściwy napis
  ctx.fillStyle = "#9fb8d0";
  ctx.fillText(text, canvas.width / 2 + 5, y + 5);
  ctx.fillStyle = "#000000";
  ctx.fillText(text, canvas.width / 2, y);
}

// Zwykły napis (align = "left", "center" albo "right")
function drawText(text, x, y, size, color, align) {
  ctx.font = "bold " + size + "px Arial, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = align || "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

// Sprawdza, czy punkt (px, py) jest w środku prostokąta (np. przycisku)
function isInside(px, py, btn) {
  return px >= btn.x && px <= btn.x + btn.w &&
         py >= btn.y && py <= btn.y + btn.h;
}

// Rysuje jeden przycisk.
// Żółty, gdy myszka jest nad nim; niebieskawy, gdy jest wybrany (btn.selected)
function drawButton(btn) {
  const hovered = isInside(mouse.x, mouse.y, btn);

  ctx.fillStyle = "#ffffff";
  if (btn.selected) ctx.fillStyle = SELECTED_COLOR;
  if (hovered) ctx.fillStyle = HOVER_COLOR;
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

  drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 2, btn.fontSize || 28, "#000000");
}

// Napis, który pojawia się po kliknięciu (np. "wkrótce!")
function drawMessage(y) {
  if (message === "") return; // nic nie kliknięto - nic nie rysujemy
  drawText(message, canvas.width / 2, y, 20, "#c0392b");
}

// =====================================================
//  PRZYCISKI KAŻDEGO EKRANU
//  Każdy przycisk: napis, pozycja (x, y), rozmiar (w, h)
//  i onClick - co się dzieje po kliknięciu.
// =====================================================

function getTitleButtons() {
  return [
    { label: "SINGLEPLAYER", x: 260, y: 200, w: 280, h: 60,
      onClick: () => goToScreen("singleMenu") },
    { label: "MULTIPLAYER", x: 260, y: 280, w: 280, h: 60,
      onClick: () => { message = "Tryb MULTIPLAYER - wkrótce!"; } },
  ];
}

function getSingleMenuButtons() {
  return [
    { label: "1 VS BOT", x: 260, y: 200, w: 280, h: 60,
      onClick: () => { message = "Gra z botem - wkrótce!"; } },
    { label: "EDYTOR", x: 260, y: 280, w: 280, h: 60,
      onClick: () => goToScreen("editorSetup") },
    { label: "WSTECZ", x: 20, y: 530, w: 160, h: 50, fontSize: 22,
      onClick: () => goToScreen("title") },
  ];
}

function getEditorSetupButtons() {
  const buttons = [
    // Mniej graczy (ale nie mniej niż MIN_PLAYERS)
    { label: "−", x: 260, y: 175, w: 60, h: 60, fontSize: 36,
      onClick: () => { setup.playerCount = Math.max(MIN_PLAYERS, setup.playerCount - 1); } },
    // Więcej graczy (ale nie więcej niż MAX_PLAYERS)
    { label: "+", x: 480, y: 175, w: 60, h: 60, fontSize: 36,
      onClick: () => { setup.playerCount = Math.min(MAX_PLAYERS, setup.playerCount + 1); } },
    { label: "START", x: 260, y: 450, w: 280, h: 60,
      onClick: startGame },
    { label: "WSTECZ", x: 20, y: 530, w: 160, h: 50, fontSize: 22,
      onClick: () => goToScreen("singleMenu") },
  ];

  // Po jednym przycisku dla każdego rozmiaru planszy (pętla po BOARD_SIZES z data.js)
  const sizeKeys = Object.keys(BOARD_SIZES);
  sizeKeys.forEach((key, index) => {
    const size = BOARD_SIZES[key];
    buttons.push({
      label: size.name + " " + size.cols + "×" + size.rows,
      x: 115 + index * 195, y: 345, w: 180, h: 55, fontSize: 18,
      selected: setup.sizeKey === key,
      onClick: () => { setup.sizeKey = key; },
    });
  });

  return buttons;
}

function getGameButtons() {
  // Gdy widać baner zmiany tury, przyciski są "zasłonięte"
  if (showTurnBanner) return [];

  const buttons = [];
  const x = PANEL_X + 15;
  const w = PANEL_WIDTH - 30;
  const selected = getSelectedBuilding();

  if (getSelectedUnit()) {
    // Wybrana jednostka: tylko przycisk ZAMKNIJ (informacje rysuje drawPanel)
    buttons.push({ label: "ZAMKNIJ", x: x, y: 255, w: w, h: 34, fontSize: 15,
      onClick: clearSelection });
  } else if (selected) {
    // Kliknięty budynek: w fazie budowy przyciski jednostek, które może zrobić.
    // Niskie przyciski, bo w późnych erach koszary robią aż 8 jednostek.
    if (game.phase === "build") {
      getRecruitOptions(game, selected).forEach((key, index) => {
        const type = UNIT_TYPES[key];
        buttons.push({
          label: type.name + " (" + unitCost(key) + ")",
          x: x, y: RECRUIT_TOP + index * RECRUIT_STEP, w: w, h: RECRUIT_STEP - 3, fontSize: 13,
          selected: action !== null && action.key === key,
          onClick: () => startPlacing("unit", key),
        });
      });
    }
    // Mały przycisk "X" obok nagłówka zamyka budynek
    buttons.push({ label: "X", x: PANEL_X + PANEL_WIDTH - 38, y: 162, w: 24, h: 24, fontSize: 14,
      onClick: clearSelection });
  } else if (game.phase === "build") {
    // Nic nie kliknięte: dwie zakładki i budowle z wybranej zakładki
    for (const [tab, label, tabX] of [["budynki", "BUDYNKI", x], ["obrona", "OBRONA", x + 88]]) {
      buttons.push({ label: label, x: tabX, y: 164, w: 82, h: 22, fontSize: 12,
        selected: buildTab === tab,
        onClick: () => { buildTab = tab; action = null; } });
    }
    getBuildableKeys().forEach((key, index) => {
      const type = BUILDING_TYPES[key];
      buttons.push({
        label: type.name + " (" + type.shape.length + ")",
        x: x, y: BUILD_LIST_TOP + index * BUILD_LIST_STEP, w: w, h: BUILD_LIST_STEP - 3, fontSize: 14,
        selected: action !== null && action.key === key,
        onClick: () => startPlacing("building", key),
      });
    });
  }

  // Przycisk następnej ery - tylko gdy nic nie jest wybrane i nie jesteśmy w ostatniej erze
  const nothingSelected = !getSelectedUnit() && !selected && !action;
  if (nothingSelected && game.players[game.current].era < MAX_ERA) {
    buttons.push({ label: "NASTĘPNA ERA", x: x, y: 478, w: w, h: 42, fontSize: 18,
      onClick: goToNextEra });
  }

  buttons.push({ label: "KONIEC TURY", x: x, y: 530, w: w, h: 52, fontSize: 20,
    onClick: finishTurn });
  // Mały przycisk MENU w prawym górnym rogu panelu
  buttons.push({ label: "MENU", x: PANEL_X + PANEL_WIDTH - 62, y: 12, w: 50, h: 26, fontSize: 11,
    onClick: () => goToScreen("title") });

  return buttons;
}

// Budowle z wybranej zakładki, które gracz może już stawiać (wg ery)
function getBuildableKeys() {
  const era = game.players[game.current].era;
  return Object.keys(BUILDING_TYPES).filter(key => {
    const type = BUILDING_TYPES[key];
    return type.canBuild && type.era <= era && type.group === buildTab;
  });
}

function getVictoryButtons() {
  return [
    { label: "NOWA GRA", x: 260, y: 400, w: 280, h: 60,
      onClick: () => goToScreen("editorSetup") },
    { label: "MENU", x: 260, y: 480, w: 280, h: 60,
      onClick: () => goToScreen("title") },
  ];
}

// Zwraca przyciski ekranu, na którym teraz jesteśmy
function getButtons() {
  if (currentScreen === "title") return getTitleButtons();
  if (currentScreen === "singleMenu") return getSingleMenuButtons();
  if (currentScreen === "editorSetup") return getEditorSetupButtons();
  if (currentScreen === "game") return getGameButtons();
  if (currentScreen === "victory") return getVictoryButtons();
  return [];
}

// =====================================================
//  EKRANY MENU
// =====================================================

function drawTitleScreen() {
  drawPaper();        // 1. czysta kartka
  drawDecorations();  // 2. ozdobne kształty
  drawBigTitle("DWA BLANKI II", 100, 68); // 3. wielki napis
  getButtons().forEach(drawButton);       // 4. przyciski
  drawMessage(375);   // 5. komunikat po kliknięciu
}

function drawSingleMenuScreen() {
  drawPaper();
  drawBigTitle("SINGLEPLAYER", 100, 56);
  getButtons().forEach(drawButton);
  drawMessage(390);
}

function drawEditorSetupScreen() {
  drawPaper();
  drawBigTitle("EDYTOR", 70, 52);

  // Liczba graczy
  drawText("Liczba graczy", canvas.width / 2, 145, 24, "#000000");
  drawText(String(setup.playerCount), canvas.width / 2, 207, 48, "#000000");

  // Kolorowe kwadraciki - po jednym dla każdego gracza
  const squareSize = 30;
  const gap = 10;
  const rowWidth = setup.playerCount * squareSize + (setup.playerCount - 1) * gap;
  let x = canvas.width / 2 - rowWidth / 2;
  for (let i = 0; i < setup.playerCount; i++) {
    ctx.fillStyle = PLAYER_COLORS[i].color;
    ctx.fillRect(x, 255, squareSize, squareSize);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 255, squareSize, squareSize);
    x += squareSize + gap;
  }

  // Rozmiar planszy
  drawText("Plansza", canvas.width / 2, 320, 24, "#000000");

  getButtons().forEach(drawButton);
}

// =====================================================
//  GRA - plansza
// =====================================================

// Tworzy nową grę z ustawień edytora i przechodzi na ekran gry
function startGame() {
  game = createGame(setup.playerCount, setup.sizeKey);

  // Liczymy, jak duża ma być jedna kratka, żeby cała plansza zmieściła się w 600×600
  const cell = Math.floor(Math.min(BOARD_AREA / game.cols, BOARD_AREA / game.rows));
  board = {
    cell: cell,
    // Przesunięcie, żeby plansza była na środku swojego obszaru
    offsetX: Math.floor((BOARD_AREA - cell * game.cols) / 2),
    offsetY: Math.floor((BOARD_AREA - cell * game.rows) / 2),
  };

  clearSelection();
  showTurnBanner = true;   // na start pokazujemy, kto zaczyna
  goToScreen("game");
}

// =====================================================
//  GRA - akcje gracza
// =====================================================

// Zwraca kliknięty budynek, jeśli należy do gracza, który ma turę (albo null)
function getSelectedBuilding() {
  if (selectedBuildingId === null) return null;
  const building = game.objects.find(obj => obj.id === selectedBuildingId);
  if (!building || building.owner !== game.current) return null;
  return building;
}

// Zwraca klikniętą jednostkę, jeśli należy do gracza, który ma turę (albo null)
function getSelectedUnit() {
  if (selectedUnitId === null) return null;
  const unit = game.objects.find(obj => obj.id === selectedUnitId);
  if (!unit || unit.owner !== game.current) return null;
  return unit;
}

// Odznacza wszystko: budynek, jednostkę i stawianie
function clearSelection() {
  action = null;
  selectedBuildingId = null;
  selectedUnitId = null;
  selectedAnchor = null;
  reachableMoves = new Map();
  attackTargets = [];
  attackInfo = "";
}

// Wybiera jednostkę i liczy, dokąd może dojść jej oddział
function selectUnit(unit, cell) {
  clearSelection();
  selectedUnitId = unit.id;
  selectedAnchor = cell;
  refreshReachable();
  if (unit.isNew) message = "Nowa jednostka - ruszy się w następnej turze.";
}

// Liczy od nowa pola, na które może dojść oddział wybranej jednostki, i cele do ataku.
// Robimy to tylko po kliknięciu, ruchu i ataku, a nie co klatkę (bo to sporo liczenia).
function refreshReachable() {
  const unit = getSelectedUnit();
  const squad = unit ? getSquadOfUnit(game, unit) : null;
  reachableMoves = squad ? getReachableMoves(game, squad) : new Map();
  const attacker = getSelectedAttacker();
  attackTargets = attacker ? getAttackTargets(game, attacker) : [];
}

// Wybrana jednostka atakuje cel. Jeśli ktoś wygrał - przechodzimy na ekran zwycięstwa.
function attackTarget(unit, target) {
  const result = attack(game, unit, target);
  if (!result.ok) {
    message = result.reason;
    return;
  }

  const targetName = target.kind === "unit" ? UNIT_TYPES[target.type].name : BUILDING_TYPES[target.type].name;
  attackInfo = "Trafienie! " + targetName + ": -" + result.damage + " życia.";
  if (result.destroyed) attackInfo = "Trafienie! Zniszczono: " + targetName + "!";

  refreshReachable();  // zniszczony wróg mógł zwolnić drogę
  if (game.winner !== null) goToScreen("victory");
}

// Zaczyna stawianie budynku albo jednostki - za myszką pojawi się "duch" kształtu
function startPlacing(kind, key) {
  const building = selectedBuildingId;
  clearSelection();
  selectedBuildingId = building;  // budynek zostaje wybrany (jeśli robimy w nim jednostkę)
  action = { kind: kind, key: key, rotation: 0 };
  message = "";
}

// Kończy turę i pokazuje baner następnego gracza
function finishTurn() {
  endTurn(game);
  clearSelection();
  message = "";
  turnBannerNote = "";
  showTurnBanner = true;
}

// Przycisk NASTĘPNA ERA: przejście do kolejnej ery (to od razu kończy turę)
function goToNextEra() {
  const player = game.players[game.current];  // zapamiętujemy, bo advanceEra zmieni gracza
  const result = advanceEra(game);
  if (!result.ok) {
    message = result.reason;
    return;
  }
  clearSelection();
  message = "";
  turnBannerNote = player.colorName + " przechodzi do " + ERA_GENITIVE[result.era] + "!";
  showTurnBanner = true;
}

// Nazwa ery z wielkiej litery, np. "Era feudalna"
function eraTitle(era) {
  const name = ERA_NAMES[era];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Jeśli myszka jest nad polem, na które oddział może dojść, zwraca { dx, dy, cost }
function getHoveredMove() {
  const cell = mouseToCell(mouse);
  if (!cell || !selectedAnchor) return null;
  const dx = cell.x - selectedAnchor.x;
  const dy = cell.y - selectedAnchor.y;
  const cost = reachableMoves.get(dx + "," + dy);
  if (cost === undefined) return null;
  return { dx: dx, dy: dy, cost: cost };
}

// Zamienia pozycję myszki na kratkę planszy ({x, y}) albo null, gdy myszka jest poza planszą
function mouseToCell(pos) {
  if (!board || pos.x >= PANEL_X) return null;
  const x = Math.floor((pos.x - board.offsetX) / board.cell);
  const y = Math.floor((pos.y - board.offsetY) / board.cell);
  if (!isInsideBoard(game, x, y)) return null;
  return { x: x, y: y };
}

// Kratki "ducha" - kształtu, który stawiamy, ze środkiem pod myszką
function getGhostCells(cell) {
  if (!action || !cell) return null;
  const types = action.kind === "building" ? BUILDING_TYPES : UNIT_TYPES;
  const shape = types[action.key].shape;

  // Najpierw sprawdzamy, jak duży jest kształt po obrocie...
  const sample = shapeCells(shape, 0, 0, action.rotation);
  const width = Math.max(...sample.map(c => c.x)) + 1;
  const height = Math.max(...sample.map(c => c.y)) + 1;

  // ...a potem przesuwamy go tak, żeby myszka była w jego środku
  return shapeCells(shape, cell.x - Math.floor((width - 1) / 2), cell.y - Math.floor((height - 1) / 2), action.rotation);
}

// Sprawdza, czy duch może stanąć w tym miejscu (zwraca { ok, reason })
function checkGhost(cells) {
  if (action.kind === "building") return canPlaceBuilding(game, action.key, cells);
  return canPlaceUnit(game, action.key, getSelectedBuilding(), cells);
}

// Kliknięcie na planszy
function clickBoard(pos) {
  const cell = mouseToCell(pos);
  if (!cell) return;

  // 1. Jeśli coś stawiamy - próbujemy to postawić
  if (action) {
    const cells = getGhostCells(cell);
    let result;
    if (action.kind === "building") result = placeBuilding(game, action.key, cells, action.rotation);
    else result = placeUnit(game, action.key, getSelectedBuilding(), cells, action.rotation);

    if (result.ok) {
      // Palisada i mur: tryb stawiania zostaje, żeby klikać pole za polem
      const isWall = action.kind === "building" && BUILDING_TYPES[action.key].wall;
      if (!isWall) action = null;
      message = "";
    } else {
      message = result.reason;
    }
    return;
  }

  message = "";
  attackInfo = "";
  const unit = getSelectedUnit();
  const clicked = getObjectAt(game, cell.x, cell.y);

  // 2. Jeśli wybraliśmy jednostkę (albo wieżę/zamek) i kliknęliśmy wroga w zasięgu - atak!
  const attacker = getSelectedAttacker();
  if (attacker && clicked && attackTargets.includes(clicked)) {
    attackTarget(attacker, clicked);
    return;
  }

  // 3. Jeśli wybraliśmy jednostkę i kliknęliśmy pole, na które oddział dojdzie - ruszamy!
  const dx = selectedAnchor ? cell.x - selectedAnchor.x : 0;
  const dy = selectedAnchor ? cell.y - selectedAnchor.y : 0;
  if (unit && reachableMoves.has(dx + "," + dy)) {
    const result = moveSquad(game, unit, dx, dy);
    if (result.ok) {
      // "Uchwyt" przesuwa się razem z jednostką, więc można iść dalej
      selectedAnchor = { x: selectedAnchor.x + dx, y: selectedAnchor.y + dy };
      refreshReachable();
    } else {
      message = result.reason;
    }
    return;
  }

  // 4. Kliknięcie własnego budynku albo jednostki je wybiera
  const obj = clicked;
  if (obj && obj.owner === game.current && obj.kind === "unit") {
    selectUnit(obj, cell);
  } else if (obj && obj.owner === game.current && obj.kind === "building") {
    clearSelection();
    selectedBuildingId = obj.id;   // pokazujemy budynek w panelu (jednostki robimy tylko w fazie budowy)
    refreshReachable();            // wieża/zamek: od razu liczymy cele do strzału
  } else {
    clearSelection();
  }
}

// Kto teraz strzela: wybrana jednostka albo wybrana wieża/zamek (albo nikt)
function getSelectedAttacker() {
  const unit = getSelectedUnit();
  if (unit) return unit;
  const building = getSelectedBuilding();
  if (building && canFight(building)) return building;
  return null;
}

// Zamienia kratkę planszy (kolumna, rząd) na piksele na canvasie (lewy górny róg kratki)
function cellToPixel(x, y) {
  return {
    x: board.offsetX + x * board.cell,
    y: board.offsetY + y * board.cell,
  };
}

// Rysuje pustą planszę w kratkę
function drawBoardGrid() {
  const width = game.cols * board.cell;
  const height = game.rows * board.cell;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(board.offsetX, board.offsetY, width, height);

  ctx.strokeStyle = "#cfdcea";
  ctx.lineWidth = 1;
  for (let col = 0; col <= game.cols; col++) {
    const px = board.offsetX + col * board.cell;
    ctx.beginPath();
    ctx.moveTo(px, board.offsetY);
    ctx.lineTo(px, board.offsetY + height);
    ctx.stroke();
  }
  for (let row = 0; row <= game.rows; row++) {
    const py = board.offsetY + row * board.cell;
    ctx.beginPath();
    ctx.moveTo(board.offsetX, py);
    ctx.lineTo(board.offsetX + width, py);
    ctx.stroke();
  }

  // Gruba ramka wokół całej planszy
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeRect(board.offsetX, board.offsetY, width, height);
}

// Rysuje grubą ramkę tylko po ZEWNĘTRZNYCH krawędziach kształtu.
// Dla każdej kratki sprawdzamy 4 boki: jeśli obok nie ma kratki tego kształtu, rysujemy bok.
function drawShapeOutline(cells, lineWidth, color) {
  const taken = new Set(cells.map(c => c.x + "," + c.y));
  const size = board.cell;

  ctx.strokeStyle = color || "#000000";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const c of cells) {
    const p = cellToPixel(c.x, c.y);
    if (!taken.has(c.x + "," + (c.y - 1))) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + size, p.y); }               // góra
    if (!taken.has(c.x + "," + (c.y + 1))) { ctx.moveTo(p.x, p.y + size); ctx.lineTo(p.x + size, p.y + size); } // dół
    if (!taken.has((c.x - 1) + "," + c.y)) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + size); }               // lewo
    if (!taken.has((c.x + 1) + "," + c.y)) { ctx.moveTo(p.x + size, p.y); ctx.lineTo(p.x + size, p.y + size); } // prawo
  }
  ctx.stroke();
  ctx.lineCap = "butt";
}

// Wypełnia kratki kolorem i (jeśli showGrid nie jest false) rysuje cienkie linie między nimi
function fillCells(cells, color, alpha, showGrid) {
  const size = board.cell;
  for (const c of cells) {
    const p = cellToPixel(c.x, c.y);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x, p.y, size, size);
    ctx.globalAlpha = alpha;         // alpha < 1 = kolor "prześwituje" (jaśniejszy)
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, size, size);
    ctx.globalAlpha = 1;
    if (showGrid === false) continue;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, size, size);
  }
}

// Zwraca środek kształtu w pikselach (żeby postawić tam napis)
function shapeCenter(cells) {
  const minX = Math.min(...cells.map(c => c.x));
  const maxX = Math.max(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  const maxY = Math.max(...cells.map(c => c.y));
  const topLeft = cellToPixel(minX, minY);
  return {
    x: topLeft.x + (maxX - minX + 1) * board.cell / 2,
    y: topLeft.y + (maxY - minY + 1) * board.cell / 2,
  };
}

// Rysuje dach ratusza: trójkąt nad kratkami "roofCells" i pionowa kreska od czubka w dół
function drawRoof(roofCells, color) {
  const minX = Math.min(...roofCells.map(c => c.x));
  const maxX = Math.max(...roofCells.map(c => c.x));
  const roofY = roofCells[0].y;
  const left = cellToPixel(minX, roofY);
  const right = cellToPixel(maxX + 1, roofY + 1);   // prawy dolny róg dachu
  const peakX = (left.x + right.x) / 2;

  ctx.beginPath();
  ctx.moveTo(left.x, right.y);   // lewy dolny róg
  ctx.lineTo(peakX, left.y);     // czubek
  ctx.lineTo(right.x, right.y);  // prawy dolny róg
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.stroke();

  // Kreska od czubka do środka podstawy (jak na rysunku z zeszytu)
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(peakX, left.y);
  ctx.lineTo(peakX, right.y);
  ctx.stroke();
}

// Rysuje jeden budynek w kolorze właściciela
function drawBuilding(building) {
  const type = BUILDING_TYPES[building.type];
  const color = game.players[building.owner].color;

  // Palisada/mur połączony z sąsiadami tylko po skosie - rysujemy ukośny pasek
  if (type.wall) {
    const direction = wallDiagonal(building);
    if (direction) {
      drawDiagonalWall(building, direction, color);
      return;
    }
  }

  // Budowle z własnym rysunkiem w drawings.js (mury, bramy, wieże, zamek, dom)
  const picture = BUILDING_DRAWINGS[building.type];
  if (picture) {
    // Zamek w budowie jest półprzezroczysty i ma napis "budowa"
    if (building.underConstruction) ctx.globalAlpha = 0.45;
    drawPicture(type.shape, picture, building.cells, building.rotation || 0, color);
    ctx.globalAlpha = 1;
    if (building.underConstruction) {
      const center = shapeCenter(building.cells);
      drawText("budowa", center.x, center.y, Math.max(10, Math.floor(board.cell * 0.5)), "#000000");
    }
    return;
  }

  let bodyCells = building.cells;

  // Ratusz: górny rząd to dach (trójkąt), reszta to zwykłe kwadraty
  if (type.hasRoof) {
    const roofY = Math.min(...building.cells.map(c => c.y));
    const roofCells = building.cells.filter(c => c.y === roofY);
    bodyCells = building.cells.filter(c => c.y !== roofY);
    drawRoof(roofCells, color);
  }

  fillCells(bodyCells, color, 1);
  drawShapeOutline(bodyCells, 3);

  // Skrót nazwy na środku budynku
  const center = shapeCenter(bodyCells);
  drawText(type.short, center.x, center.y, Math.floor(board.cell * 0.6), "#ffffff");
}

// W którą stronę biegnie ukośny mur? Zwraca "/" albo "\" - albo null, gdy mur jest prosty.
// Patrzymy na sąsiednie kratki z palisadą/murem tego samego gracza:
// jeśli jest sąsiad z boku - mur jest prosty; jeśli tylko po skosie - ukośny.
function wallDiagonal(building) {
  const { x, y } = building.cells[0];
  const hasWall = (wx, wy) => {
    const obj = getObjectAt(game, wx, wy);
    return obj && obj.kind === "building" && obj.owner === building.owner && BUILDING_TYPES[obj.type].wall;
  };

  if (hasWall(x - 1, y) || hasWall(x + 1, y) || hasWall(x, y - 1) || hasWall(x, y + 1)) return null;
  if (hasWall(x + 1, y - 1) || hasWall(x - 1, y + 1)) return "/";   // prawy-górny albo lewy-dolny sąsiad
  if (hasWall(x - 1, y - 1) || hasWall(x + 1, y + 1)) return "\\";  // lewy-górny albo prawy-dolny sąsiad
  return null;
}

// Rysuje ukośny kawałek muru/palisady: pasek z drawings.js obrócony o 45° wokół środka kratki
function drawDiagonalWall(building, direction, color) {
  const s = board.cell;
  const corner = cellToPixel(building.cells[0].x, building.cells[0].y);

  ctx.save();
  ctx.translate(corner.x + s / 2, corner.y + s / 2);            // środek kratki
  ctx.rotate(direction === "/" ? -Math.PI / 4 : Math.PI / 4);  // "/" w górę w prawo, "\" w dół w prawo
  ctx.strokeStyle = "#1a1a1a";
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.lineJoin = "round";
  WALL_DIAGONAL_DRAWINGS[building.type](ctx, s);
  ctx.restore();
}

// Rysuje jedną jednostkę: rysunek jak w zeszycie, w środku pokolorowany jasnym kolorem gracza
function drawUnit(unit) {
  const color = lightColor(game.players[unit.owner].color);
  drawUnitPicture(unit.type, unit.cells, unit.rotation || 0, color);
}

// Rozjaśnia kolor (np. "#d63031") - miesza go z białym, żeby czarne linie były dobrze widać.
// amount = ile zostaje koloru (0.45 = 45% koloru, 55% białego)
function lightColor(hex, amount) {
  const keep = amount || 0.45;
  const parts = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16));  // czerwony, zielony, niebieski
  const mixed = parts.map(value => Math.round(255 - (255 - value) * keep));
  return "rgb(" + mixed.join(", ") + ")";
}

// Rysuje obrazek jednostki z drawings.js, obrócony tak jak jednostka.
// Obrazki są narysowane dla kształtu PRZED obrotem, więc obracamy cały canvas:
// najpierw przesuwamy "pędzel" w odpowiedni róg, potem obracamy o 90° tyle razy, ile trzeba.
function drawUnitPicture(unitKey, cells, rotation, fillColor) {
  const draw = UNIT_DRAWINGS[unitKey];
  if (!draw) return; // brak rysunku - nic nie rysujemy
  drawPicture(UNIT_TYPES[unitKey].shape, draw, cells, rotation, fillColor);
}

// Wspólny "obracacz" rysunków - dla jednostek i budowli.
// shape = kształt przed obrotem, draw = funkcja rysująca z drawings.js
function drawPicture(shape, draw, cells, rotation, fillColor) {
  // Wymiary kształtu przed obrotem (w kratkach)
  const width = Math.max(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) + 1;

  // Lewy górny róg jednostki na planszy
  const minX = Math.min(...cells.map(c => c.x));
  const minY = Math.min(...cells.map(c => c.y));
  const corner = cellToPixel(minX, minY);
  const s = board.cell;

  // Po obrocie rysunek "ucieka" w lewo/w górę - przesuwamy go z powrotem.
  // (tak samo, jak shapeCells w rules.js przesuwa kratki do (0, 0))
  const shifts = [[0, 0], [height, 0], [width, height], [0, width]];
  const [shiftX, shiftY] = shifts[rotation];

  ctx.save();  // zapamiętujemy ustawienia pędzla, żeby potem je przywrócić
  ctx.translate(corner.x + shiftX * s, corner.y + shiftY * s);
  ctx.rotate(rotation * Math.PI / 2);
  ctx.strokeStyle = "#1a1a1a";                       // czarny "długopis"
  ctx.fillStyle = fillColor || "rgba(0, 0, 0, 0)";  // kolor środka rysunku (albo przezroczysty)
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw(ctx, s);
  ctx.restore(); // przywracamy pędzel (bez przesunięcia i obrotu)
}

// Pasek życia nad obiektem - rysujemy go tylko, gdy obiekt jest ranny
function drawHpBar(obj) {
  if (obj.hp >= obj.maxHp) return;

  const minX = Math.min(...obj.cells.map(c => c.x));
  const maxX = Math.max(...obj.cells.map(c => c.x));
  const minY = Math.min(...obj.cells.map(c => c.y));
  const topLeft = cellToPixel(minX, minY);
  const width = (maxX - minX + 1) * board.cell - 4;
  const height = Math.max(4, Math.floor(board.cell * 0.18));

  ctx.fillStyle = "#7b241c";   // ciemnoczerwone tło = stracone życie
  ctx.fillRect(topLeft.x + 2, topLeft.y + 2, width, height);
  ctx.fillStyle = "#2ecc71";   // zielone = życie, które zostało
  ctx.fillRect(topLeft.x + 2, topLeft.y + 2, width * (obj.hp / obj.maxHp), height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.strokeRect(topLeft.x + 2, topLeft.y + 2, width, height);
}

// Rysuje wszystkie obiekty: najpierw budynki, potem jednostki (żeby były "na wierzchu")
function drawObjects() {
  for (const obj of game.objects) {
    if (obj.kind === "building") drawBuilding(obj);
  }
  for (const obj of game.objects) {
    if (obj.kind === "unit") drawUnit(obj);
  }
  for (const obj of game.objects) {
    drawHpBar(obj);
  }

  // Wybrany budynek dostaje grubą żółtą ramkę
  const selected = getSelectedBuilding();
  if (selected) {
    drawShapeOutline(selected.cells, 5, HOVER_COLOR);
    // Wieża/zamek: wrogowie w zasięgu dostają czerwone ramki
    for (const target of attackTargets) drawShapeOutline(target.cells, 4, "#e74c3c");
  }

  drawUnitSelection();
}

// Wybrana jednostka: żółte ramki wokół całego oddziału, niebieskie kropki tam,
// gdzie może dojść, i zielony "duch" oddziału pod myszką
function drawUnitSelection() {
  const unit = getSelectedUnit();
  if (!unit) return;

  const squad = getSquadOfUnit(game, unit);
  const squadUnits = squad ? game.objects.filter(obj => squad.unitIds.includes(obj.id)) : [unit];
  for (const member of squadUnits) {
    drawShapeOutline(member.cells, 4, HOVER_COLOR);
  }
  drawShapeOutline(unit.cells, 4, "#e67e22");  // kliknięta jednostka - pomarańczowa ramka

  // Wrogowie w zasięgu ataku - czerwone ramki
  for (const target of attackTargets) {
    drawShapeOutline(target.cells, 4, "#e74c3c");
  }

  // Kropki na polach, na które może trafić "uchwyt" (kliknięta kratka jednostki)
  ctx.fillStyle = "rgba(41, 128, 185, 0.45)";
  for (const key of reachableMoves.keys()) {
    const [dx, dy] = key.split(",").map(Number);
    const p = cellToPixel(selectedAnchor.x + dx, selectedAnchor.y + dy);
    const r = board.cell * 0.2;
    ctx.beginPath();
    ctx.arc(p.x + board.cell / 2, p.y + board.cell / 2, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Duch oddziału w miejscu, na które wskazuje myszka
  const move = getHoveredMove();
  if (move && squad) {
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#2ecc71";
    for (const member of squadUnits) {
      for (const c of member.cells) {
        const p = cellToPixel(c.x + move.dx, c.y + move.dy);
        ctx.fillRect(p.x, p.y, board.cell, board.cell);
      }
    }
    ctx.globalAlpha = 1;
  }
}

// Rysuje "ducha": półprzezroczysty kształt pod myszką.
// Zielony = można tu postawić, czerwony = nie można.
function drawGhost() {
  const cells = getGhostCells(mouseToCell(mouse));
  if (!cells) return;

  const color = checkGhost(cells).ok ? "#2ecc71" : "#e74c3c";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  for (const c of cells) {
    // Kratki poza planszą pomijamy (ale duch i tak będzie czerwony)
    if (!isInsideBoard(game, c.x, c.y)) continue;
    const p = cellToPixel(c.x, c.y);
    ctx.fillRect(p.x, p.y, board.cell, board.cell);
  }
  ctx.globalAlpha = 1;
  drawShapeOutline(cells.filter(c => isInsideBoard(game, c.x, c.y)), 2, color);

  // Jednostka: na duchu widać też jej rysunek (w aktualnym obrocie)
  if (action.kind === "unit") drawUnitPicture(action.key, cells, action.rotation);
  // Budowla z rysunkiem (mur, brama, wieża...): półprzezroczysty rysunek na duchu
  if (action.kind === "building" && BUILDING_DRAWINGS[action.key]) {
    ctx.globalAlpha = 0.6;
    drawPicture(BUILDING_TYPES[action.key].shape, BUILDING_DRAWINGS[action.key], cells, action.rotation,
      game.players[game.current].color);
    ctx.globalAlpha = 1;
  }
}

// =====================================================
//  GRA - panel z informacjami (po prawej)
// =====================================================

function drawPanel() {
  // Tło panelu
  ctx.fillStyle = "#f3efe2";
  ctx.fillRect(PANEL_X, 0, PANEL_WIDTH, canvas.height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PANEL_X, 0);
  ctx.lineTo(PANEL_X, canvas.height);
  ctx.stroke();

  const left = PANEL_X + 15;
  const centerX = PANEL_X + PANEL_WIDTH / 2;
  const player = game.players[game.current];

  drawText("TURA " + game.turn, left, 26, 22, "#000000", "left");

  // Kto teraz gra - prostokąt w kolorze gracza
  ctx.fillStyle = player.color;
  ctx.fillRect(left, 48, PANEL_WIDTH - 30, 32);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(left, 48, PANEL_WIDTH - 30, 32);
  drawText(player.colorName, centerX, 65, 19, "#ffffff");

  drawPlayerSquares(centerX, 95);

  // Era gracza, np. "Era feudalna (2/4)"
  drawText(eraTitle(player.era) + " (" + player.era + "/" + MAX_ERA + ")", centerX, 115, 14, "#1a5276");

  // Punkty
  if (game.phase === "build") {
    drawText("Punkty budowy: " + game.buildPoints, left, 136, 17, "#000000", "left");
    if (game.barracksBonus > 0) {
      drawText("+" + game.barracksBonus + " bonus na koszary", left, 154, 13, "#555555", "left");
    }
  } else {
    drawText("Faza ruchu", left, 136, 17, "#000000", "left");
    drawText("budowanie skończone", left, 154, 13, "#555555", "left");
  }

  // Środek panelu: informacje o jednostce albo nagłówek nad przyciskami.
  // infoY = gdzie pod spodem wypisać podpowiedź
  const unit = getSelectedUnit();
  const selected = getSelectedBuilding();
  let infoY = 190;
  if (unit) {
    drawUnitInfo(unit, left);
    infoY = 305;
  } else if (selected) {
    // Wybrany budynek: nazwa, a pod nią jednostki do zrobienia albo informacje o budowli
    drawText(BUILDING_TYPES[selected.type].name, left, 176, 15, "#000000", "left");
    const recruits = game.phase === "build" ? getRecruitOptions(game, selected).length : 0;
    if (recruits > 0) {
      infoY = RECRUIT_TOP + recruits * RECRUIT_STEP + 12;
    } else {
      infoY = drawBuildingInfo(selected, left);
    }
  } else if (game.phase === "build") {
    // Zakładki BUDYNKI / OBRONA rysują się jako przyciski; pod listą podpowiedź
    infoY = BUILD_LIST_TOP + getBuildableKeys().length * BUILD_LIST_STEP + 12;
  }

  drawPanelInfo(left, infoY);

  getButtons().forEach(drawButton);
}

// Rząd małych kwadracików - po jednym dla każdego gracza.
// Gracz, który ma turę, ma grubą ramkę; gracz, który odpadł, ma krzyżyk.
function drawPlayerSquares(centerX, y) {
  const size = 16;
  const gap = 5;
  const count = game.players.length;
  let x = centerX - (count * size + (count - 1) * gap) / 2;

  game.players.forEach((p, index) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y - size / 2, size, size);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = index === game.current ? 3 : 1;
    ctx.strokeRect(x, y - size / 2, size, size);
    if (!p.alive) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x + size, y + size / 2);
      ctx.moveTo(x + size, y - size / 2);
      ctx.lineTo(x, y + size / 2);
      ctx.stroke();
    }
    x += size + gap;
  });
}

// Informacje o wybranej budowli (bez jednostek do zrobienia): życie, strzelanie, budowa.
// Zwraca y, pod którym można pisać podpowiedź.
function drawBuildingInfo(building, left) {
  const type = BUILDING_TYPES[building.type];
  drawText("Życie: " + building.hp + "/" + building.maxHp, left, 196, 13, "#333333", "left");
  let y = 214;
  if (building.underConstruction) {
    drawText("W budowie! Gotowy w następnej", left, y, 13, "#b9770e", "left");
    drawText("turze (zabierze " + building.debt + " pkt).", left, y + 18, 13, "#b9770e", "left");
    return y + 46;
  }
  if (type.attack) {
    const state = building.hasAttacked ? "strzał użyty" : "strzał gotowy";
    drawText("Atak: " + type.attack + "   Zasięg: " + type.range, left, y, 13, "#333333", "left");
    drawText("(" + state + ")", left, y + 18, 13, "#333333", "left");
    return y + 46;
  }
  if (type.gate) {
    drawText("Twoje jednostki przechodzą,", left, y, 13, "#333333", "left");
    drawText("wrogowie nie.", left, y + 18, 13, "#333333", "left");
    return y + 46;
  }
  if (type.wall) {
    drawText("Blokuje drogę wszystkim.", left, y, 13, "#333333", "left");
    return y + 28;
  }
  return y + 10;
}

// Informacje o wybranej jednostce: nazwa, życie, atak, zasięg i punkty ruchu oddziału
function drawUnitInfo(unit, left) {
  const type = UNIT_TYPES[unit.type];
  const squad = getSquadOfUnit(game, unit);

  drawText(type.name, left, 172, 17, "#000000", "left");
  drawText("Życie: " + unit.hp + "/" + unit.maxHp + "   Atak: " + type.attack, left, 195, 13, "#333333", "left");
  // Czy jednostka może jeszcze zaatakować w tej turze
  let attackState = "atak gotowy";
  if (type.attack <= 0) attackState = "nie walczy";
  else if (unit.isNew) attackState = "nowa - czeka";
  else if (unit.hasAttacked) attackState = "atak użyty";
  drawText("Zasięg: " + type.range + "   (" + attackState + ")", left, 213, 13, "#333333", "left");

  if (squad) {
    const size = squad.unitIds.length;
    const squadText = size === 1 ? "Bez oddziału" : "Oddział: " + size + " jedn.";
    drawText(squadText + "   Ruch: " + squad.points, left, 236, 13, "#000000", "left");
  }
}

// Podpowiedź albo powód, dla którego czegoś nie wolno. y = gdzie zacząć pisać.
function drawPanelInfo(left, y) {
  let text = "Kliknij budynek albo jednostkę.";
  let color = "#555555";

  // Gdy nic nie jest wybrane: co trzeba mieć do następnej ery
  if (game.players[game.current].era < MAX_ERA) {
    const eraCheck = canAdvanceEra(game);
    if (eraCheck.ok) {
      text = "Masz wszystko do następnej ery!";
      color = "#1e8449";
    } else {
      text = eraCheck.reason;
    }
  }
  const selectedBuilding = getSelectedBuilding();
  if (selectedBuilding) {
    const hasRecruits = game.phase === "build" && getRecruitOptions(game, selectedBuilding).length > 0;
    text = hasRecruits ? "Wybierz jednostkę, potem kliknij obok budynku." : "";
    color = "#555555";
    if (canFight(selectedBuilding) && attackTargets.length === 0 && !selectedBuilding.hasAttacked) {
      text = "Brak wrogów w zasięgu.";
    }
    if (attackTargets.length > 0) {
      text = "Czerwona ramka = wróg w zasięgu. Kliknij go, żeby strzelić!";
      color = "#c0392b";
    }
  }

  // Myszka nad wrogiem w zasięgu wieży/zamku - ile obrażeń zadamy
  const attacker = getSelectedAttacker();
  if (attacker && attacker.kind === "building") {
    const cell = mouseToCell(mouse);
    const hovered = cell ? getObjectAt(game, cell.x, cell.y) : null;
    if (hovered && attackTargets.includes(hovered)) {
      text = "Obrażenia: " + getDamage(attacker, hovered) + " (wróg ma " + hovered.hp + " życia).";
      color = "#c0392b";
    }
  }

  const unit = getSelectedUnit();
  if (unit) {
    text = "Kliknij podświetlone pole, żeby ruszyć oddział.";
    if (game.phase === "build") {
      text = "Uwaga: pierwszy ruch kończy budowanie w tej turze!";
      color = "#b9770e";
    }
    if (attackTargets.length > 0) {
      text = "Czerwona ramka = wróg w zasięgu. Kliknij go, żeby zaatakować!";
      color = "#c0392b";
    }
    const move = getHoveredMove();
    if (move) {
      text = "Ten ruch kosztuje " + move.cost + " pkt.";
      color = "#1e8449";
    }
    // Myszka nad wrogiem w zasięgu - pokazujemy, ile obrażeń zadamy
    const cell = mouseToCell(mouse);
    const hovered = cell ? getObjectAt(game, cell.x, cell.y) : null;
    if (hovered && attackTargets.includes(hovered)) {
      text = "Obrażenia: " + getDamage(unit, hovered) + " (wróg ma " + hovered.hp + " życia).";
      color = "#c0392b";
    }
  }

  // Wynik ostatniego ataku
  if (attackInfo !== "") {
    text = attackInfo;
    color = "#1a5276";
  }

  if (action) {
    text = "Kliknij na planszy, żeby postawić. R = obróć, Esc = anuluj.";
    // Jeśli duch stoi w złym miejscu - pokazujemy dlaczego
    const ghost = getGhostCells(mouseToCell(mouse));
    if (ghost) {
      const check = checkGhost(ghost);
      if (!check.ok) { text = check.reason; color = "#c0392b"; }
    }
  }
  if (message !== "") { text = message; color = "#c0392b"; }

  drawWrappedText(text, left, y, PANEL_WIDTH - 30, 18, 14, color);
}

// Pisze tekst w kilku linijkach, żeby zmieścił się w szerokości maxWidth
function drawWrappedText(text, x, y, maxWidth, lineHeight, size, color) {
  ctx.font = "bold " + size + "px Arial, sans-serif";
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const testLine = line === "" ? word : line + " " + word;
    // Jeśli linijka zrobiła się za długa - piszemy to, co było, i zaczynamy nową
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      drawText(line, x, y, size, color, "left");
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  drawText(line, x, y, size, color, "left");
}

// Duży napis na środku ekranu: "Tura gracza X - kliknij, aby zacząć"
function drawTurnBanner() {
  const player = game.players[game.current];

  // Przyciemnienie całego ekranu
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Okienko w kolorze gracza
  ctx.fillStyle = player.color;
  ctx.fillRect(150, 200, 500, 200);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeRect(150, 200, 500, 200);

  drawText("TURA " + game.turn, 400, 235, 26, "#ffffff");
  drawText("Gracz " + player.colorName, 400, 282, 40, "#ffffff");
  drawText(eraTitle(player.era), 400, 320, 18, "#ffffff");
  // Informacja o zmianie ery poprzedniego gracza (jeśli była)
  if (turnBannerNote !== "") drawText("⭐ " + turnBannerNote, 400, 350, 16, "#ffffff");
  drawText("Kliknij, aby zacząć", 400, 380, 18, "#ffffff");
}

// Ekran zwycięstwa: duży napis i okienko w kolorze zwycięzcy
function drawVictoryScreen() {
  const winner = game.players[game.winner];

  drawPaper();
  drawBigTitle("ZWYCIĘSTWO!", 100, 64);

  ctx.fillStyle = winner.color;
  ctx.fillRect(200, 180, 400, 170);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeRect(200, 180, 400, 170);

  drawText("Wygrywa gracz", 400, 220, 22, "#ffffff");
  drawText(winner.colorName, 400, 270, 46, "#ffffff");
  drawText("w turze " + game.turn, 400, 318, 20, "#ffffff");

  getButtons().forEach(drawButton);
}

function drawGameScreen() {
  drawPaper();
  drawBoardGrid();
  drawObjects();
  drawGhost();
  drawPanel();
  if (showTurnBanner) drawTurnBanner();
}

// =====================================================
//  MYSZKA
// =====================================================

// Zamienia pozycję myszki na ekranie na pozycję na canvasie.
// Potrzebne, bo canvas może być zmniejszony na małym ekranie.
function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// Ruch myszki: zapamiętujemy, gdzie jest, i zmieniamy kursor na "rączkę" nad przyciskiem
canvas.addEventListener("mousemove", function (event) {
  const pos = getMousePos(event);
  mouse.x = pos.x;
  mouse.y = pos.y;

  const overButton = getButtons().some(btn => isInside(mouse.x, mouse.y, btn));
  canvas.style.cursor = overButton ? "pointer" : "default";
});

// Kliknięcie: sprawdzamy, który przycisk na TYM ekranie został kliknięty
canvas.addEventListener("click", function (event) {
  const pos = getMousePos(event);

  // Baner zmiany tury znika po kliknięciu w dowolnym miejscu
  if (currentScreen === "game" && showTurnBanner) {
    showTurnBanner = false;
    return;
  }

  for (const btn of getButtons()) {
    if (isInside(pos.x, pos.y, btn)) {
      btn.onClick();
      return; // klikamy tylko jeden przycisk naraz
    }
  }

  // Nie trafiliśmy w przycisk - może w planszę?
  if (currentScreen === "game") clickBoard(pos);
});

// Prawy przycisk myszy anuluje stawianie (zamiast pokazywać menu przeglądarki)
canvas.addEventListener("contextmenu", function (event) {
  event.preventDefault();
  action = null;
});

// Klawiatura: R = obróć kształt, Esc = anuluj
document.addEventListener("keydown", function (event) {
  if (currentScreen !== "game" || !action) return;

  if (event.key === "r" || event.key === "R") {
    action.rotation = (action.rotation + 1) % 4;  // 0, 1, 2, 3, i znowu 0
  }
  if (event.key === "Escape") {
    action = null;
  }
});

// =====================================================
//  PĘTLA GRY - rysuje wszystko od nowa ok. 60 razy na sekundę
// =====================================================

function gameLoop() {
  time++;

  // Rysujemy ekran, na którym teraz jesteśmy
  if (currentScreen === "title") drawTitleScreen();
  else if (currentScreen === "singleMenu") drawSingleMenuScreen();
  else if (currentScreen === "editorSetup") drawEditorSetupScreen();
  else if (currentScreen === "game") drawGameScreen();
  else if (currentScreen === "victory") drawVictoryScreen();

  requestAnimationFrame(gameLoop); // poproś przeglądarkę o następną klatkę
}

gameLoop(); // start!
