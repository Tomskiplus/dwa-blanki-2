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

// Na którym ekranie jesteśmy: "title", "singleMenu", "editorSetup" albo "game"
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
let showTurnBanner = false;     // czy pokazać duży napis "Tura gracza X"

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

  if (selected) {
    // Kliknięty budynek: przyciski jednostek, które może zrobić
    getRecruitOptions(game, selected).forEach((key, index) => {
      const type = UNIT_TYPES[key];
      buttons.push({
        label: type.name + " (" + type.shape.length + ")",
        x: x, y: 185 + index * 46, w: w, h: 40, fontSize: 16,
        selected: action !== null && action.key === key,
        onClick: () => startPlacing("unit", key),
      });
    });
    const closeY = 185 + getRecruitOptions(game, selected).length * 46;
    buttons.push({ label: "ZAMKNIJ", x: x, y: closeY, w: w, h: 34, fontSize: 15,
      onClick: () => { selectedBuildingId = null; action = null; } });
  } else {
    // Nic nie kliknięte: przyciski budynków, które można postawić
    const buildable = Object.keys(BUILDING_TYPES).filter(key => BUILDING_TYPES[key].canBuild);
    buildable.forEach((key, index) => {
      const type = BUILDING_TYPES[key];
      buttons.push({
        label: type.name + " (" + type.shape.length + ")",
        x: x, y: 185 + index * 46, w: w, h: 40, fontSize: 18,
        selected: action !== null && action.key === key,
        onClick: () => startPlacing("building", key),
      });
    });
  }

  buttons.push({ label: "KONIEC TURY", x: x, y: 470, w: w, h: 50, fontSize: 20,
    onClick: finishTurn });
  buttons.push({ label: "MENU", x: x, y: 535, w: w, h: 45, fontSize: 18,
    onClick: () => goToScreen("title") });

  return buttons;
}

// Zwraca przyciski ekranu, na którym teraz jesteśmy
function getButtons() {
  if (currentScreen === "title") return getTitleButtons();
  if (currentScreen === "singleMenu") return getSingleMenuButtons();
  if (currentScreen === "editorSetup") return getEditorSetupButtons();
  if (currentScreen === "game") return getGameButtons();
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

  action = null;
  selectedBuildingId = null;
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

// Zaczyna stawianie budynku albo jednostki - za myszką pojawi się "duch" kształtu
function startPlacing(kind, key) {
  action = { kind: kind, key: key, rotation: 0 };
  message = "";
}

// Kończy turę i pokazuje baner następnego gracza
function finishTurn() {
  endTurn(game);
  action = null;
  selectedBuildingId = null;
  message = "";
  showTurnBanner = true;
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
    if (action.kind === "building") result = placeBuilding(game, action.key, cells);
    else result = placeUnit(game, action.key, getSelectedBuilding(), cells);

    if (result.ok) {
      action = null;
      message = "";
    } else {
      message = result.reason;
    }
    return;
  }

  // 2. Jeśli nic nie stawiamy - kliknięcie własnego budynku go wybiera
  const obj = getObjectAt(game, cell.x, cell.y);
  if (obj && obj.kind === "building" && obj.owner === game.current) {
    selectedBuildingId = obj.id;
  } else {
    selectedBuildingId = null;
  }
  message = "";
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

// Wypełnia kratki kolorem i rysuje cienkie linie między nimi
function fillCells(cells, color, alpha) {
  const size = board.cell;
  for (const c of cells) {
    const p = cellToPixel(c.x, c.y);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x, p.y, size, size);
    ctx.globalAlpha = alpha;         // alpha < 1 = kolor "prześwituje" (jaśniejszy)
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, size, size);
    ctx.globalAlpha = 1;
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

// Rysuje jedną jednostkę: jaśniejszy kolor właściciela + symbol (np. "Ch" = chłop)
function drawUnit(unit) {
  const type = UNIT_TYPES[unit.type];
  const color = game.players[unit.owner].color;

  fillCells(unit.cells, color, 0.45);
  drawShapeOutline(unit.cells, 2);

  const center = shapeCenter(unit.cells);
  drawText(type.symbol, center.x, center.y + 1, Math.floor(board.cell * 0.45), "#000000");
}

// Rysuje wszystkie obiekty: najpierw budynki, potem jednostki (żeby były "na wierzchu")
function drawObjects() {
  for (const obj of game.objects) {
    if (obj.kind === "building") drawBuilding(obj);
  }
  for (const obj of game.objects) {
    if (obj.kind === "unit") drawUnit(obj);
  }

  // Wybrany budynek dostaje grubą żółtą ramkę
  const selected = getSelectedBuilding();
  if (selected) drawShapeOutline(selected.cells, 5, HOVER_COLOR);
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

  drawText("TURA " + game.turn, centerX, 28, 24, "#000000");

  // Kto teraz gra - prostokąt w kolorze gracza
  ctx.fillStyle = player.color;
  ctx.fillRect(left, 48, PANEL_WIDTH - 30, 32);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(left, 48, PANEL_WIDTH - 30, 32);
  drawText(player.colorName, centerX, 65, 19, "#ffffff");

  drawPlayerSquares(centerX, 95);

  // Punkty
  drawText("Punkty budowy: " + game.buildPoints, left, 125, 17, "#000000", "left");
  if (game.barracksBonus > 0) {
    drawText("+" + game.barracksBonus + " bonus na koszary", left, 146, 13, "#555555", "left");
  }

  // Nagłówek nad przyciskami
  const selected = getSelectedBuilding();
  const header = selected ? BUILDING_TYPES[selected.type].name + " - jednostki:" : "Zbuduj obok chłopa:";
  drawText(header, left, 170, 14, "#555555", "left");

  drawPanelInfo(left);

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

// Podpowiedź albo powód, dla którego czegoś nie wolno (nad przyciskiem KONIEC TURY)
function drawPanelInfo(left) {
  let text = "Kliknij swój budynek, żeby robić w nim jednostki.";
  let color = "#555555";

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

  drawWrappedText(text, left, 385, PANEL_WIDTH - 30, 18, 14, color);
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

  drawText("TURA " + game.turn, 400, 245, 26, "#ffffff");
  drawText("Gracz " + player.colorName, 400, 295, 40, "#ffffff");
  drawText("Kliknij, aby zacząć", 400, 355, 20, "#ffffff");
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

  requestAnimationFrame(gameLoop); // poproś przeglądarkę o następną klatkę
}

gameLoop(); // start!
