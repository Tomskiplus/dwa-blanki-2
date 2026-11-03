// =====================================================
//  DWA BLANKI II - ekran tytułowy
// =====================================================

// --- Ustawienia (skrzynie z wartościami - zmieniaj śmiało!) ---

const GRID = 20;            // rozmiar jednej kratki na kartce (w pikselach)
const BLOCK = 60;           // rozmiar jednego kwadratu w kształtach (= 3 kratki)
const LINE_WIDTH = 4;       // grubość czarnych linii
const BLOCK_COLOR = "#ffffff";        // kolor wypełnienia kształtów
const HOVER_COLOR = "#ffe066";        // kolor przycisku po najechaniu myszką
const FLOAT_AMOUNT = 4;     // jak mocno kształty "pływają" w górę i w dół (0 = stoją)

// --- Przygotowanie canvasu ---

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d"); // ctx = "pędzel", którym rysujemy

// --- Przyciski na ekranie tytułowym ---
// Każdy przycisk to obiekt: napis, pozycja (x, y) i rozmiar (w, h)
const buttons = [
  { label: "SINGLEPLAYER", x: 260, y: 200, w: 280, h: 60 },
  { label: "MULTIPLAYER",  x: 260, y: 280, w: 280, h: 60 },
];

// --- Stan gry (to, co zmienia się w czasie) ---
const mouse = { x: -1, y: -1 };  // gdzie jest myszka
let message = "";                // napis pokazywany po kliknięciu
let time = 0;                    // licznik czasu do animacji

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
//  KLOCKI - podstawowe kształty
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
//  NAPIS I PRZYCISKI
// =====================================================

// Wielki napis tytułowy
function drawTitle() {
  ctx.font = "900 68px 'Arial Black', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Najpierw "cień" przesunięty trochę w bok, potem właściwy napis
  ctx.fillStyle = "#9fb8d0";
  ctx.fillText("DWA BLANKI II", canvas.width / 2 + 5, 105);
  ctx.fillStyle = "#000000";
  ctx.fillText("DWA BLANKI II", canvas.width / 2, 100);
}

// Sprawdza, czy punkt (px, py) jest w środku przycisku
function isInside(px, py, btn) {
  return px >= btn.x && px <= btn.x + btn.w &&
         py >= btn.y && py <= btn.y + btn.h;
}

// Rysuje jeden przycisk (żółty, gdy myszka jest nad nim)
function drawButton(btn) {
  const hovered = isInside(mouse.x, mouse.y, btn);

  ctx.fillStyle = hovered ? HOVER_COLOR : "#ffffff";
  ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = LINE_WIDTH;
  ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 2);
}

// Napis, który pojawia się po kliknięciu przycisku
function drawMessage() {
  if (message === "") return; // nic nie kliknięto - nic nie rysujemy

  ctx.fillStyle = "#c0392b";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, 375);
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

  const overButton = buttons.some(btn => isInside(mouse.x, mouse.y, btn));
  canvas.style.cursor = overButton ? "pointer" : "default";
});

// Kliknięcie: sprawdzamy, który przycisk został kliknięty
canvas.addEventListener("click", function (event) {
  const pos = getMousePos(event);
  for (const btn of buttons) {
    if (isInside(pos.x, pos.y, btn)) {
      message = "Tryb " + btn.label + " - wkrótce!";
    }
  }
});

// =====================================================
//  PĘTLA GRY - rysuje wszystko od nowa ok. 60 razy na sekundę
// =====================================================

function gameLoop() {
  time++;

  drawPaper();        // 1. czysta kartka
  drawDecorations();  // 2. ozdobne kształty
  drawTitle();        // 3. wielki napis
  for (const btn of buttons) {
    drawButton(btn);  // 4. przyciski
  }
  drawMessage();      // 5. komunikat po kliknięciu

  requestAnimationFrame(gameLoop); // poproś przeglądarkę o następną klatkę
}

gameLoop(); // start!
